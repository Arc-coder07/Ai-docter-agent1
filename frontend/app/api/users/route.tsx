import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db"; // <--- Use the new helper
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user already exists
    const userEmail = user.emailAddresses[0]?.emailAddress;
    const existingUser = await db.user.findUnique({
      where: { email: userEmail }
    });

    if (existingUser) {
      return NextResponse.json(existingUser);
    }

    // Create new user
    const newUser = await db.user.create({
      data: {
        name: user.fullName || "Unknown",
        email: userEmail,
        credit: 10, // Default credits
      }
    });

    return NextResponse.json(newUser);

  } catch (e) {
    console.error("Error in users API:", e);
    return NextResponse.json({ error: "Failed to create/fetch user" }, { status: 500 });
  }
}