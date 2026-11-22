import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Replace with actual query grouping by recipient
  const users = [
    // { email: "user1@example.com", count: 42 }
  ];
  return NextResponse.json({ users });
}
