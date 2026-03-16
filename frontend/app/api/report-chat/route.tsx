import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey });

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { reportId, messages, newMessage } = await req.json();

    if (!reportId || !newMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch the report to get the raw text context
    const report = await db.report.findUnique({
      where: { id: reportId },
    });

    if (!report || !report.rawText) {
      return NextResponse.json({ error: "Report context not found" }, { status: 404 });
    }

    // 2. Construct the System Prompt with the Report Context
    const systemPrompt = `You are a helpful medical assistant analyzing a specific medical report.
    
    Here is the content of the report you are analyzing:
    === BEGIN REPORT ===
    ${report.rawText}
    === END REPORT ===

    Instructions:
    - Answer the user's questions based ONLY on the report above.
    - If the answer is not in the report, strictly say "I cannot find that information in the report."
    - Do not provide medical diagnosis.
    - Be concise and helpful.
    `;

    // 3. Prepare messages for OpenAI (System + History + New Question)
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: "user", content: newMessage }
    ];

    // 4. Generate Response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: apiMessages as any,
    });

    const aiResponse = completion.choices[0].message.content;

    return NextResponse.json({
      response: aiResponse
    });

  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}