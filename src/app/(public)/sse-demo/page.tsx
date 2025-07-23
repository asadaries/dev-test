"use client";

import { useState, useEffect } from "react";
import { useSSE } from "../../../features/sse/hooks/useSSE";

export default function SSEDemoFullPage() {
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<Array<{ time: string; event: string; data: any }>>([]);
  const { connected, clientId, addEventListener, removeEventListener } = useSSE();

  useEffect(() => {
    const handleConnected = (event: any) => {
      const data = event.data;
      setEvents((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          event: "connected",
          data: data,
        },
        ...prev.slice(0, 19),
      ]);
    };

    const handleMessage = (event: any) => {
      // The useSSE hook passes { event, data } where data is already parsed
      const data = event.data;
      setEvents((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          event: "message",
          data: data,
        },
        ...prev.slice(0, 19),
      ]);
    };

    const handlePing = (event: any) => {
      // The useSSE hook passes { event, data } where data is already parsed
      const data = event.data;
      setEvents((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          event: "ping",
          data: data,
        },
        ...prev.slice(0, 19),
      ]);
    };

    addEventListener("connected", handleConnected);
    addEventListener("message", handleMessage);
    addEventListener("ping", handlePing);

    return () => {
      removeEventListener("connected", handleConnected);
      removeEventListener("message", handleMessage);
      removeEventListener("ping", handlePing);
    };
  }, [addEventListener, removeEventListener]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      const response = await fetch("/api/sse-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "message",
          data: { message, timestamp: new Date().toISOString() },
        }),
      });

      if (response.ok) {
        setMessage("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-purple-700 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Server-Sent Events Demo</h1>

        <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
            <span className="font-semibold">
              Status: {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {clientId && (
            <p className="text-sm text-white/70">Client ID: {clientId}</p>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Send Broadcast Message</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 rounded bg-white/20 backdrop-blur text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              onClick={sendMessage}
              disabled={!connected || !message.trim()}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition-colors"
            >
              Send Broadcast
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Events Log</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-white/70">Waiting for events...</p>
            ) : (
              events.map((event, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded p-3 text-sm font-mono"
                >
                  <span className="text-green-400">{event.time}</span> -{" "}
                  <span className="text-yellow-400">{event.event}</span>:{" "}
                  <span className="text-white/90">
                    {JSON.stringify(event.data)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-white/50">
          <p>Open this page in multiple browser tabs to test broadcasting</p>
          <p>Messages sent from any tab will appear in all connected tabs</p>
        </div>
      </div>
    </div>
  );
}