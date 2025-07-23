/**
 * Public SSE Demo Component (No Auth Required)
 * @author Muhammad Asad
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useSSE } from "../hooks/useSSE";
import type { SSEEvent } from "../types";

interface Message {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
}

export function SSEDemoPublic() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const addedListenersRef = useRef(false);

  const { connected, addEventListener, removeEventListener } = useSSE({
    onOpen: () => {
      console.log("SSE connection opened");
    },
    onError: (error) => {
      console.error("SSE connection error:", error);
    },
    onClose: () => {
      console.log("SSE connection closed");
    },
  });

  useEffect(() => {
    if (addedListenersRef.current) return;
    const handleConnected = (event: SSEEvent) => {
      const data = event.data as { clientId: string; timestamp: number };
      setClientId(data.clientId);
      addMessage("connected", `Connected with client ID: ${data.clientId}`);
    };

    const handlePing = (event: SSEEvent) => {
      const data = event.data as { timestamp: number };
      console.log("Received ping:", new Date(data.timestamp).toISOString());
    };

    addEventListener("connected", handleConnected);
    addEventListener("ping", handlePing);
    addedListenersRef.current = true;

    return () => {
      removeEventListener("connected", handleConnected);
      removeEventListener("ping", handlePing);
      addedListenersRef.current = false;
    };
  }, [addEventListener, removeEventListener]);

  const addMessage = (type: string, content: string) => {
    const message: Message = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message].slice(-10)); // Keep last 10 messages
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">SSE Demo (Public)</h2>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="font-medium">
            Status: {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        
        {clientId && (
          <div className="text-sm text-gray-600">
            Client ID: {clientId}
          </div>
        )}
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h3 className="font-medium mb-2">How to Test</h3>
        <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
          <li>Open this page in multiple browser tabs</li>
          <li>Each tab gets a unique client ID</li>
          <li>Watch for automatic ping messages every 30 seconds</li>
          <li>The connection status shows real-time state</li>
          <li>To test full functionality with messaging, authentication is required</li>
        </ol>
      </div>

      <div className="border rounded p-4 h-64 overflow-y-auto">
        <h3 className="font-medium mb-2">Events Log</h3>
        {messages.length === 0 ? (
          <p className="text-gray-500">Waiting for events...</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm p-2 rounded ${
                  msg.type === "connected"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100"
                }`}
              >
                <span className="font-medium">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
                {" - "}
                <span>{msg.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Note: This shows SSE connection and heartbeat.</p>
      </div>
    </div>
  );
}