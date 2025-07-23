export interface SSEClient {
  id: string;
  userId?: string;
  response: ReadableStreamDefaultController;
  lastPing: number;
}

export interface SSEEvent<T = unknown> {
  id?: string;
  event: string;
  data: T;
  retry?: number;
}

export interface SSEMessage {
  type: "ping" | "message" | "error";
  timestamp: number;
  data?: unknown;
}

export type SSEEventHandler<T = unknown> = (event: SSEEvent<T>) => void;

export interface SSEServiceConfig {
  heartbeatInterval?: number;
  clientTimeout?: number;
  reconnectDelay?: number;
}