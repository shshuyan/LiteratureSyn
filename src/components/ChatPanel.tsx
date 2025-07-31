'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessagesStore, useSourcesStore, useArtefactsStore } from '@/lib/store';
import { apiClient } from '@/lib/api-client';
import type { SearchResultsUpdate, ArtefactUpdate } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// Message bubble component with proper styling
interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sourceIds?: string[];
    isStreaming?: boolean;
  };
  isStreaming?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120 }}
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3 text-sm",
          isUser 
            ? "bg-peach/30 text-navy ml-auto" 
            : "bg-sand text-navy mr-auto border border-border"
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-current ml-1"
            />
          )}
        </div>
        <div className="text-xs opacity-60 mt-2">
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </motion.div>
  );
};

// Streaming message component that appends tokens in real-time
interface StreamingMessageProps {
  messageId: string;
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({ messageId }) => {
  const { getMessageById } = useMessagesStore();
  const message = getMessageById(messageId);
  
  if (!message) return null;
  
  return <MessageBubble message={message} isStreaming={true} />;
};

// Message composer component with source selection validation
interface MessageComposerProps {
  onSendMessage: (content: string, sourceIds: string[]) => void;
  disabled?: boolean;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onSendMessage, disabled = false }) => {
  const [input, setInput] = useState('');
  const { selectedSourceIds, getSelectedSources } = useSourcesStore();
  const selectedSources = getSelectedSources();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Allow sending messages even without sources for search queries
    onSendMessage(input.trim(), selectedSourceIds);
    setInput('');
  };
  
  const canSend = input.trim() && !disabled;
  
  return (
    <div className="border-t border-border bg-card p-4">
      {/* Source selection indicator */}
      {selectedSourceIds.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-3 text-sm text-muted-foreground"
        >
          <AlertCircle className="w-4 h-4 text-amber-500" />
          No sources selected - you can still search for articles or select sources to chat about them
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 text-sm text-muted-foreground"
        >
          Chatting with {selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''}:
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedSources.slice(0, 3).map((source) => (
              <span
                key={source.id}
                className="inline-block bg-accent/20 text-accent-foreground px-2 py-1 rounded text-xs"
              >
                {source.title}
              </span>
            ))}
            {selectedSources.length > 3 && (
              <span className="inline-block bg-accent/20 text-accent-foreground px-2 py-1 rounded text-xs">
                +{selectedSources.length - 3} more
              </span>
            )}
          </div>
        </motion.div>
      )}
      
      {/* Message input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            selectedSourceIds.length === 0 
              ? "Search for articles or select sources to chat..." 
              : "Ask a question about your sources..."
          }
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!canSend}
          size="icon"
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

// Main ChatPanel component
interface ChatPanelProps {
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isStreaming,
    streamingMessageId,
    addMessage,
    startStreaming,
    stopStreaming,
    appendToStreamingMessage,
    getLastMessage,
  } = useMessagesStore();
  
  const { addSources } = useSourcesStore();
  const { updateArtefact } = useArtefactsStore();
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isStreaming]);
  
  // Handle sending a new message
  const handleSendMessage = async (content: string, sourceIds: string[]) => {
    // Add user message
    addMessage({
      role: 'user',
      content,
      sourceIds,
    });
    
    // Create assistant message and start streaming
    addMessage({
      role: 'assistant',
      content: '',
      sourceIds,
      isStreaming: true,
    });
    
    // Use a small delay to ensure the message is added to the store
    // then get the last message (which should be our assistant message)
    setTimeout(() => {
      const lastMessage = getLastMessage();
      if (lastMessage && lastMessage.role === 'assistant') {
        startStreaming(lastMessage.id);
        // Use actual API client for streaming response
        streamChatResponse(content, sourceIds);
      }
    }, 10);
  };
  
  // Stream chat response using API client
  const streamChatResponse = async (userMessage: string, sourceIds: string[]) => {
    try {
      await apiClient.streamChatResponse(userMessage, sourceIds, {
        onToken: (token: string) => {
          appendToStreamingMessage(token);
        },
        onArtefact: (artefact: ArtefactUpdate) => {
          updateArtefact(artefact.type, {
            title: artefact.title,
            bullets: artefact.bullets,
            status: artefact.status,
            metadata: artefact.metadata
          });
        },
        onSearchResults: (results: SearchResultsUpdate) => {
          // Add search results to sources
          addSources(results.sources.map(source => ({
            ...source,
            // Remove id and uploadDate as they will be generated by the store
            id: undefined as any,
            uploadDate: undefined as any
          })));
        },
        onComplete: () => {
          stopStreaming();
        },
        onError: (error: string) => {
          console.error('Chat streaming error:', error);
          appendToStreamingMessage(`\n\nError: ${error}`);
          stopStreaming();
        }
      });
    } catch (error) {
      console.error('Chat API error:', error);
      appendToStreamingMessage(`\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stopStreaming();
    }
  };
  
  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Messages container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center h-full text-center"
            >
              <div className="max-w-md">
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Welcome to Literature Synthesizer
                </h3>
                <p className="text-muted-foreground">
                  Select sources from the left panel and start asking questions to get AI-powered insights from your literature.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isStreaming && message.id === streamingMessageId}
              />
            ))
          )}
        </AnimatePresence>
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message composer */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        disabled={isStreaming}
      />
    </div>
  );
};

export default ChatPanel;