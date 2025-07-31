'use client';

import React from 'react';
import { useSourcesStore, useMessagesStore, useArtefactsStore, useUIStore } from '@/lib/store';
import { useStoreUtils } from '@/lib/store-utils';

// Example component demonstrating store usage
export function StoreExample() {
  const sourcesStore = useSourcesStore();
  const messagesStore = useMessagesStore();
  const artefactsStore = useArtefactsStore();
  const uiStore = useUIStore();
  const storeUtils = useStoreUtils();
  
  // Compute status from store state
  const stats = storeUtils.getStoreStats();
  const sourcesStatus = {
    totalCount: stats.sources.total,
    selectedCount: stats.sources.selected,
    readyCount: stats.sources.ready,
    processingCount: stats.sources.processing,
    hasSelection: stats.sources.selected > 0,
    sources: sourcesStore.sources
  };
  
  const chatStatus = {
    messageCount: stats.messages.total,
    isStreaming: stats.messages.streaming,
    canSendMessage: stats.sources.selected > 0 && !stats.messages.streaming,
    messages: messagesStore.messages
  };
  
  const artefactsStatus = {
    readyCount: stats.artefacts.ready,
    generatingCount: stats.artefacts.generating,
    errorCount: stats.artefacts.error
  };

  const handleAddSource = () => {
    sourcesStore.addSource({
      title: `Document ${sourcesStatus.totalCount + 1}`,
      status: 'ready',
      progress: 100,
      selected: false,
      tags: ['example', 'demo'],
    });
  };

  const handleSendMessage = () => {
    if (sourcesStatus.hasSelection) {
      messagesStore.addMessage({
        role: 'user',
        content: `Question about ${sourcesStatus.selectedCount} selected sources`,
        sourceIds: sourcesStore.selectedSourceIds,
      });
    }
  };

  const handleRegenerateArtefact = (type: 'moa' | 'safety' | 'kol') => {
    artefactsStore.regenerateArtefact(type);
    
    // Simulate API call completion after 2 seconds
    setTimeout(() => {
      artefactsStore.updateArtefact(type, {
        bullets: [
          `Generated bullet point 1 for ${type}`,
          `Generated bullet point 2 for ${type}`,
          `Generated bullet point 3 for ${type}`,
        ],
        status: 'ready',
      });
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Store Example</h2>
      
      {/* Sources Section */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Sources ({sourcesStatus.totalCount})</h3>
        <div className="space-y-2">
          <button
            onClick={handleAddSource}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Source
          </button>
          <p className="text-sm text-gray-600">
            Selected: {sourcesStatus.selectedCount} | Ready: {sourcesStatus.readyCount} | Processing: {sourcesStatus.processingCount}
          </p>
          <div className="space-y-1">
            {sourcesStatus.sources.map((source) => (
              <div key={source.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={source.selected}
                  onChange={() => sourcesStore.toggleSourceSelection(source.id)}
                />
                <span className="text-sm">{source.title}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  source.status === 'ready' ? 'bg-green-100 text-green-800' :
                  source.status === 'embedding' ? 'bg-yellow-100 text-yellow-800' :
                  source.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {source.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Section */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Chat ({chatStatus.messageCount} messages)</h3>
        <div className="space-y-2">
          <button
            onClick={handleSendMessage}
            disabled={!chatStatus.canSendMessage}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            Send Message
          </button>
          <p className="text-sm text-gray-600">
            Streaming: {chatStatus.isStreaming ? 'Yes' : 'No'} | Can Send: {chatStatus.canSendMessage ? 'Yes' : 'No'}
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {chatStatus.messages.map((message) => (
              <div key={message.id} className={`text-sm p-2 rounded ${
                message.role === 'user' ? 'bg-blue-50 text-blue-900' : 'bg-gray-50 text-gray-900'
              }`}>
                <strong>{message.role}:</strong> {message.content}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Artefacts Section */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Artefacts</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Ready: {artefactsStatus.readyCount} | Generating: {artefactsStatus.generatingCount} | Errors: {artefactsStatus.errorCount}
          </p>
          <div className="grid grid-cols-3 gap-4">
            {(['moa', 'safety', 'kol'] as const).map((type) => {
              const artefact = artefactsStore.getArtefactByType(type);
              return (
                <div key={type} className="border rounded p-3">
                  <h4 className="font-medium">{artefact.title}</h4>
                  <p className="text-xs text-gray-500 mb-2">Status: {artefact.status}</p>
                  <button
                    onClick={() => handleRegenerateArtefact(type)}
                    disabled={artefact.status === 'generating'}
                    className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
                  >
                    {artefact.status === 'generating' ? 'Generating...' : 'Regenerate'}
                  </button>
                  {artefact.bullets.length > 0 && (
                    <ul className="mt-2 text-xs space-y-1">
                      {artefact.bullets.map((bullet, index) => (
                        <li key={index} className="text-gray-600">• {bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* UI State Section */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">UI State</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <button
              onClick={uiStore.toggleTheme}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Theme: {uiStore.ui.theme}
            </button>
            <button
              onClick={uiStore.toggleInsightPanel}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Insight Panel: {uiStore.ui.insightPanelCollapsed ? 'Collapsed' : 'Expanded'}
            </button>
            <button
              onClick={uiStore.toggleSidebar}
              className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
            >
              Sidebar: {uiStore.ui.sidebarOpen ? 'Open' : 'Closed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}