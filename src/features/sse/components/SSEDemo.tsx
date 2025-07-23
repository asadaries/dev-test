"use client";

import { useState, useEffect } from "react";
import { useSSE } from "../hooks/useSSE";
import type { SSEEvent } from "../types";
import { api } from "@/trpc/react";

interface Message {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
}

export function SSEDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  
  const broadcastMutation = api.sse.broadcast.useMutation();
  const getActiveClientsQuery = api.sse.getActiveClients.useQuery(undefined, {
    refetchInterval: 5000,
  });

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
    const handleConnected = (event: SSEEvent) => {
      const data = event.data as { clientId: string; timestamp: number };
      setClientId(data.clientId);
      addMessage("connected", `Connected with client ID: ${data.clientId}`);
    };

    const handlePing = (event: SSEEvent) => {
      const data = event.data as { timestamp: number };
      console.log("Received ping:", new Date(data.timestamp).toISOString());
    };

    const handleCustomEvent = (event: SSEEvent) => {
      const data = event.data as { message: string; from?: string };
      addMessage("custom", data.message, data.from);
    };

    addEventListener("connected", handleConnected);
    addEventListener("ping", handlePing);
    addEventListener("custom-event", handleCustomEvent);

    return () => {
      removeEventListener("connected", handleConnected);
      removeEventListener("ping", handlePing);
      removeEventListener("custom-event", handleCustomEvent);
    };
  }, [addEventListener, removeEventListener]);

  const addMessage = (type: string, content: string, from?: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content: from ? `[${from}]: ${content}` : content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message].slice(-10)); // Keep last 10 messages
  };

  const handleBroadcast = async () => {
    if (!customMessage.trim()) return;

    try {
      await broadcastMutation.mutateAsync({
        event: "custom-event",
        data: {
          message: customMessage,
          from: clientId ?? "unknown",
        },
        excludeClientId: clientId ?? undefined,
      });
      
      addMessage("sent", customMessage, "You");
      setCustomMessage("");
    } catch (error) {
      console.error("Failed to broadcast message:", error);
      addMessage("error", "Failed to send message");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">SSE Demo</h2>
      
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
        
        <div className="text-sm text-gray-600 mt-1">
          Active Clients: {getActiveClientsQuery.data?.clients.length ?? 0}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Send Broadcast Message</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleBroadcast()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!connected}
          />
          <button
            onClick={handleBroadcast}
            disabled={!connected || !customMessage.trim() || broadcastMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {broadcastMutation.isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      <div className="border rounded p-4 h-64 overflow-y-auto">
        <h3 className="font-medium mb-2">Messages</h3>
        {messages.length === 0 ? (
          <p className="text-gray-500">No messages yet...</p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm p-2 rounded ${
                  msg.type === "error"
                    ? "bg-red-100 text-red-700"
                    : msg.type === "sent"
                    ? "bg-blue-100 text-blue-700"
                    : msg.type === "connected"
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
    </div>
  );
}