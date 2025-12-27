import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);

  try {
    const sessions = await db.session.findMany({
      orderBy: {
        id: 'desc'
      }
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}