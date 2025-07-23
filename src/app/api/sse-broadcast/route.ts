/**
 * Simple broadcast endpoint for SSE demo
 */

import { NextRequest, NextResponse } from "next/server";
import { SSEService } from "@/features/sse";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;
    
    const sseService = SSEService.getInstance();
    const sentCount = sseService.broadcast({ event, data });
    
    return NextResponse.json({ 
      success: true, 
      message: "Event broadcast to all clients",
      sentCount 
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ 
      error: "Failed to broadcast" 
    }, { status: 500 });
  }
}