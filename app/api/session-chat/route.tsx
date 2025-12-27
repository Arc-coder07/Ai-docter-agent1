import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db"; // <--- Importing from the new helper
import { currentUser } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from 'uuid';

// POST: Create a new session
export async function POST(request: NextRequest) {
  const user = await currentUser();
  const { notes, selectedDoctor } = await request.json();

  try {
    const sessionId = uuidv4();
    const result = await db.session.create({
      data: {
        sessionId,
        createdBy: user?.emailAddresses[0]?.emailAddress || 'unknown',
        notes: notes || "",
        createdOn: new Date().toString(),
        selectedDocter: selectedDoctor || null,
      }
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Error creating session:", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

// GET: Get session details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const result = await db.session.findUnique({
      where: { sessionId: sessionId }
    });

    if (!result) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

// PUT: Save chat history
export async function PUT(req: NextRequest) {
  try {
    const { sessionId, messages } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const updatedSession = await db.session.update({
      where: { sessionId: sessionId },
      data: {
        conversation: messages,
      }
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error saving session:", error);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}