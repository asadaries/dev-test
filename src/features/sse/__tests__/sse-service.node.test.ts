import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SSEService } from "../services/sse-service";

describe("SSEService", () => {
  let sseService: SSEService;

  beforeEach(() => {
    vi.useFakeTimers();
    SSEService.resetInstance();
    sseService = SSEService.getInstance({ heartbeatInterval: 30000 });
  });

  afterEach(() => {
    SSEService.resetInstance();
    vi.useRealTimers();
  });

  it("should add a client and return a client ID", () => {
    const mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const clientId = sseService.addClient(mockController, "user123");
    
    expect(clientId).toBeDefined();
    expect(typeof clientId).toBe("string");
    expect(sseService.getActiveClients()).toContain(clientId);
  });

  it("should send initial connected event when client connects", () => {
    const mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    sseService.addClient(mockController, "user123");
    
    expect(mockController.enqueue).toHaveBeenCalled();
    const call = mockController.enqueue.mock.calls[0];
    const data = new TextDecoder().decode(call[0] as Uint8Array);
    expect(data).toContain("event: connected");
  });

  it("should remove a client", () => {
    const mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const clientId = sseService.addClient(mockController);
    expect(sseService.getActiveClients()).toContain(clientId);
    
    sseService.removeClient(clientId);
    expect(sseService.getActiveClients()).not.toContain(clientId);
    expect(mockController.close).toHaveBeenCalled();
  });

  it("should send event to specific client", () => {
    const mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const clientId = sseService.addClient(mockController);
    mockController.enqueue.mockClear(); // Clear the initial connected event
    
    const success = sseService.sendToClient(clientId, {
      event: "test-event",
      data: { message: "Hello" },
    });
    
    expect(success).toBe(true);
    expect(mockController.enqueue).toHaveBeenCalled();
    const call = mockController.enqueue.mock.calls[0];
    const data = new TextDecoder().decode(call[0] as Uint8Array);
    expect(data).toContain("event: test-event");
    expect(data).toContain(JSON.stringify({ message: "Hello" }));
  });

  it("should broadcast to all clients except excluded", () => {
    const mockController1 = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;
    
    const mockController2 = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const clientId1 = sseService.addClient(mockController1);
    const clientId2 = sseService.addClient(mockController2);
    
    mockController1.enqueue.mockClear();
    mockController2.enqueue.mockClear();
    
    const sentCount = sseService.broadcast(
      { event: "broadcast", data: { msg: "Hi all" } },
      clientId1
    );
    
    expect(sentCount).toBe(1);
    expect(mockController1.enqueue).not.toHaveBeenCalled();
    expect(mockController2.enqueue).toHaveBeenCalled();
  });

  it("should send heartbeat pings", () => {
    const mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    sseService.addClient(mockController);
    mockController.enqueue.mockClear();
    
    // Fast forward time to trigger heartbeat
    vi.advanceTimersByTime(30000);
    
    expect(mockController.enqueue).toHaveBeenCalled();
    const call = mockController.enqueue.mock.calls[0];
    const data = new TextDecoder().decode(call[0] as Uint8Array);
    expect(data).toContain("event: ping");
  });
});