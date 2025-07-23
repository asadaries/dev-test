/**
 * Server-Sent Events Service
 * @author Muhammad Asad
 */

import { randomUUID } from "crypto";
import type { SSEClient, SSEEvent, SSEServiceConfig } from "../types";

declare global {
  var sseServiceInstance: SSEService | undefined;
}

export class SSEService {
  private clients = new Map<string, SSEClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<SSEServiceConfig>;

  private constructor(config?: SSEServiceConfig) {
    this.config = {
      heartbeatInterval: config?.heartbeatInterval ?? 30000, // 30 seconds
      clientTimeout: config?.clientTimeout ?? 60000, // 60 seconds
      reconnectDelay: config?.reconnectDelay ?? 1000, // 1 second
    };
    this.startHeartbeat();
  }

  static getInstance(config?: SSEServiceConfig): SSEService {
    if (!globalThis.sseServiceInstance) {
      globalThis.sseServiceInstance = new SSEService(config);
    }
    return globalThis.sseServiceInstance;
  }

  static resetInstance(): void {
    if (globalThis.sseServiceInstance) {
      globalThis.sseServiceInstance.cleanup();
      globalThis.sseServiceInstance = undefined;
    }
  }

  addClient(controller: ReadableStreamDefaultController, userId?: string): string {
    const clientId = randomUUID();
    const client: SSEClient = {
      id: clientId,
      userId,
      response: controller,
      lastPing: Date.now(),
    };
    
    this.clients.set(clientId, client);
    console.log(`[SSE] Client connected: ${clientId}${userId ? ` (user: ${userId})` : ""}`);
    
    // Send initial connection event after a small delay
    setTimeout(() => {
      this.sendToClient(clientId, {
        event: "connected",
        data: { clientId, timestamp: Date.now() },
      });
    }, 100);
    
    return clientId;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`[SSE] Client disconnected: ${clientId}`);
    }
  }

  sendToClient<T>(clientId: string, event: SSEEvent<T>): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      const eventString = this.formatSSEMessage(event);
      const encoder = new TextEncoder();
      client.response.enqueue(encoder.encode(eventString));
      return true;
    } catch (error) {
      console.error(`[SSE] Error sending to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  sendToUser<T>(userId: string, event: SSEEvent<T>): number {
    let sentCount = 0;
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        if (this.sendToClient(clientId, event)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  broadcast<T>(event: SSEEvent<T>, excludeClientId?: string): number {
    let sentCount = 0;
    for (const clientId of this.clients.keys()) {
      if (clientId !== excludeClientId) {
        if (this.sendToClient(clientId, event)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  getActiveClients(): string[] {
    return Array.from(this.clients.keys());
  }

  getClientsByUser(userId: string): string[] {
    const userClients: string[] = [];
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        userClients.push(clientId);
      }
    }
    return userClients;
  }

  private formatSSEMessage<T>(event: SSEEvent<T>): string {
    const lines: string[] = [];
    
    if (event.id) {
      lines.push(`id: ${event.id}`);
    }
    
    lines.push(`event: ${event.event}`);
    lines.push(`data: ${JSON.stringify(event.data)}`);
    
    if (event.retry) {
      lines.push(`retry: ${event.retry}`);
    }
    
    return lines.join("\n") + "\n\n";
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.clientTimeout;
      
      // Log current client count
      if (this.clients.size > 0) {
        console.log(`[SSE] Active clients: ${this.clients.size}`);
      }
      
      for (const [clientId, client] of this.clients.entries()) {
        // Check for stale connections
        if (now - client.lastPing > timeout) {
          console.log(`[SSE] Client timeout: ${clientId}`);
          this.removeClient(clientId);
          continue;
        }
        
        // Send heartbeat ping
        const sent = this.sendToClient(clientId, {
          event: "ping",
          data: { timestamp: now },
        });
        
        if (sent) {
          client.lastPing = now;
        }
      }
    }, this.config.heartbeatInterval);
  }

  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close all client connections
    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }
  }
}