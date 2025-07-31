import { NextRequest } from 'next/server';

interface RealtimeMessage {
  type: 'document_status' | 'chat_update' | 'artefact_update' | 'system_status';
  data: any;
  timestamp: number;
  clientId?: string;
}

interface ClientConnection {
  id: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  subscriptions: Set<string>;
  lastPing: number;
}

// Store active connections
const activeConnections = new Map<string, ClientConnection>();

// Cleanup inactive connections every 30 seconds
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 60 seconds timeout
  
  for (const [clientId, connection] of activeConnections.entries()) {
    if (now - connection.lastPing > timeout) {
      try {
        connection.controller.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
      activeConnections.delete(clientId);
      console.log(`Cleaned up inactive connection: ${clientId}`);
    }
  }
}, 30000);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('clientId') || generateClientId();
  const subscriptions = url.searchParams.get('subscriptions')?.split(',') || [];

  // Create Server-Sent Events stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      const connection: ClientConnection = {
        id: clientId,
        controller,
        encoder,
        subscriptions: new Set(subscriptions),
        lastPing: Date.now()
      };
      
      activeConnections.set(clientId, connection);
      
      // Send initial connection message
      const welcomeMessage: RealtimeMessage = {
        type: 'system_status',
        data: {
          status: 'connected',
          clientId,
          subscriptions: Array.from(connection.subscriptions),
          serverTime: new Date().toISOString()
        },
        timestamp: Date.now()
      };
      
      sendMessage(controller, encoder, welcomeMessage);
      
      // Set up ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        if (activeConnections.has(clientId)) {
          const pingMessage: RealtimeMessage = {
            type: 'system_status',
            data: { type: 'ping' },
            timestamp: Date.now()
          };
          
          try {
            sendMessage(controller, encoder, pingMessage);
            activeConnections.get(clientId)!.lastPing = Date.now();
          } catch (error) {
            console.error('Ping failed:', error);
            clearInterval(pingInterval);
            activeConnections.delete(clientId);
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 30000); // Ping every 30 seconds
      
      console.log(`Client connected: ${clientId}`);
    },
    
    cancel() {
      activeConnections.delete(clientId);
      console.log(`Client disconnected: ${clientId}`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Client-ID': clientId
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, targetClients } = body;
    
    const message: RealtimeMessage = {
      type,
      data,
      timestamp: Date.now()
    };
    
    // Broadcast to specific clients or all clients
    if (targetClients && Array.isArray(targetClients)) {
      targetClients.forEach(clientId => {
        broadcastToClient(clientId, message);
      });
    } else {
      broadcastToAll(message);
    }
    
    return new Response(JSON.stringify({ success: true, sent: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to broadcast message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper functions
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function sendMessage(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  message: RealtimeMessage
) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  controller.enqueue(encoder.encode(data));
}

function broadcastToClient(clientId: string, message: RealtimeMessage) {
  const connection = activeConnections.get(clientId);
  if (connection) {
    try {
      sendMessage(connection.controller, connection.encoder, {
        ...message,
        clientId
      });
    } catch (error) {
      console.error(`Failed to send to client ${clientId}:`, error);
      activeConnections.delete(clientId);
    }
  }
}

function broadcastToAll(message: RealtimeMessage) {
  const deadConnections: string[] = [];
  
  for (const [clientId, connection] of activeConnections.entries()) {
    try {
      sendMessage(connection.controller, connection.encoder, {
        ...message,
        clientId
      });
    } catch (error) {
      console.error(`Failed to broadcast to client ${clientId}:`, error);
      deadConnections.push(clientId);
    }
  }
  
  // Clean up dead connections
  deadConnections.forEach(clientId => {
    activeConnections.delete(clientId);
  });
}

// Internal utility functions for this route only
function getActiveConnectionCount(): number {
  return activeConnections.size;
}

function getConnectionInfo(): Array<{
  clientId: string;
  subscriptions: string[];
  lastPing: number;
  connected: number;
}> {
  return Array.from(activeConnections.entries()).map(([clientId, connection]) => ({
    clientId,
    subscriptions: Array.from(connection.subscriptions),
    lastPing: connection.lastPing,
    connected: Date.now() - connection.lastPing
  }));
}