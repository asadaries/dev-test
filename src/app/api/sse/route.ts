/**
 * SSE API Endpoint
 * @author Muhammad Asad
 */

import type { NextRequest } from "next/server";
import { getSession } from "@/features/auth";
import { SSEService } from "@/features/sse";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  const sseService = SSEService.getInstance();

  const stream = new ReadableStream({
    start(controller) {
      // Add client to SSE service
      // For testing, allow connections without authentication
      const clientId = sseService.addClient(controller, session?.user?.id ?? undefined);

      // Keep connection alive
      const keepAlive = setInterval(() => {
        try {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      // Set up cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        sseService.removeClient(clientId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}