import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { oldEmail, newEmail } = await req.json();
  // TODO: Validate that oldEmail is unclaimed, newEmail is free, then update storage
  // For now, return a dummy success
  return NextResponse.json({ 
    success: true, 
    message: `Would rename ${oldEmail} → ${newEmail}` 
  });
}
