// Realtime utilities for broadcasting updates
interface RealtimeMessage {
  type: 'document_status' | 'chat_update' | 'artefact_update' | 'system_status';
  data: any;
  timestamp: number;
  clientId?: string;
}

// Broadcast functions that can be used by other API routes
export async function broadcastDocumentStatus(documentId: string, status: any) {
  const message: RealtimeMessage = {
    type: 'document_status',
    data: {
      documentId,
      ...status
    },
    timestamp: Date.now()
  };
  
  return broadcastMessage(message);
}

export async function broadcastChatUpdate(messageId: string, update: any) {
  const message: RealtimeMessage = {
    type: 'chat_update',
    data: {
      messageId,
      ...update
    },
    timestamp: Date.now()
  };
  
  return broadcastMessage(message);
}

export async function broadcastArtefactUpdate(artefactType: string, update: any) {
  const message: RealtimeMessage = {
    type: 'artefact_update',
    data: {
      artefactType,
      ...update
    },
    timestamp: Date.now()
  };
  
  return broadcastMessage(message);
}

// Internal broadcast function
async function broadcastMessage(message: RealtimeMessage) {
  try {
    const response = await fetch('/api/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: message.type,
        data: message.data,
      }),
    });
    
    if (!response.ok) {
      console.error('Failed to broadcast message:', response.statusText);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Broadcast error:', error);
    return false;
  }
}

// Connection info utilities
export async function getActiveConnectionCount(): Promise<number> {
  try {
    const response = await fetch('/api/realtime/info');
    if (response.ok) {
      const data = await response.json();
      return data.activeConnections || 0;
    }
  } catch (error) {
    console.error('Failed to get connection count:', error);
  }
  return 0;
}

export async function getConnectionInfo(): Promise<Array<{
  clientId: string;
  subscriptions: string[];
  lastPing: number;
  connected: number;
}>> {
  try {
    const response = await fetch('/api/realtime/info');
    if (response.ok) {
      const data = await response.json();
      return data.connections || [];
    }
  } catch (error) {
    console.error('Failed to get connection info:', error);
  }
  return [];
}