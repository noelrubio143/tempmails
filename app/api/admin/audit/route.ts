import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Replace with actual database query for last 50 admin actions
  const logs = [
    // { admin_email: "admin@example.com", command: "/help", created_at: new Date().toISOString() }
  ];
  return NextResponse.json({ logs });
}
