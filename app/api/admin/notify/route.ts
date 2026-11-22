import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  // TODO: Broadcast to all active sessions via WebSocket or store in a pollable store
  // Placeholder: just log and return OK
  console.log("Notification broadcast:", message);
  return NextResponse.json({ success: true, message: `Notification sent: ${message}` });
}
