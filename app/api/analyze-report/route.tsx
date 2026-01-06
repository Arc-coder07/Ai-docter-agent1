import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractTextFromPDF } from "@/lib/pdf_loader";
import { currentUser } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `
You are a specialized Medical Report Analyst. Your goal is to analyze blood reports and health data.
Output your analysis in strict Markdown format with these sections:
1. **Summary**: Key findings.
2. **Critical Values**: Any values out of range (High/Low).
3. **Recommendations**: Lifestyle or dietary suggestions.
4. **Questions for Doctor**: What the patient should ask their GP.

Do NOT provide medical diagnosis. Always include a disclaimer.
`;

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get or create user in database
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    let dbUser = await db.user.findUnique({
      where: { email: userEmail }
    });

    if (!dbUser) {
      // Create user if doesn't exist
      dbUser = await db.user.create({
        data: {
          name: clerkUser.fullName || "Unknown",
          email: userEmail,
          credit: 10,
        }
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload a PDF file." 
      }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit` 
      }, { status: 400 });
    }

    // Validate minimum file size (PDFs should have at least some content)
    if (file.size < 100) {
      return NextResponse.json({ 
        error: "File appears to be empty or corrupted." 
      }, { status: 400 });
    }

    // 1. Convert File to Buffer and Extract Text
    let pdfText: string;
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      pdfText = await extractTextFromPDF(buffer);
    } catch (extractionError: any) {
      console.error("PDF extraction failed:", extractionError);
      // Return the specific error message from the extraction function
      return NextResponse.json({ 
        error: extractionError.message || "Failed to extract text from PDF. Please ensure the PDF contains readable text." 
      }, { status: 400 });
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json({ 
        error: "Could not extract text from PDF. The file might be scanned (image-based) or empty. Please use a text-based PDF." 
      }, { status: 400 });
    }

    // 2. Send to AI for Analysis using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this medical report:\n\n${pdfText}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisResult = response.text() || "Analysis could not be generated.";

    // 3. Save to Database using Report model
    const savedReport = await db.report.create({
      data: {
        userId: dbUser.id,
        fileName: file.name,
        fileSize: file.size,
        rawText: pdfText, // Store full extracted text
        analysis: analysisResult,
      }
    });

    return NextResponse.json({ 
      success: true, 
      analysis: analysisResult,
      reportId: savedReport.id 
    });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    
    // If error was already handled and returned, re-throw it
    if (error instanceof Response) {
      throw error;
    }
    
    // Provide more specific error messages
    if (error.message?.includes("PDF") || error.message?.includes("extract") || error.message?.includes("scanned")) {
      return NextResponse.json({ 
        error: error.message || "Failed to extract text from PDF. Please ensure the PDF contains readable text." 
      }, { status: 400 });
    }
    
    if (error.message?.includes("API key") || error.message?.includes("Gemini") || error.message?.includes("Google")) {
      return NextResponse.json({ 
        error: "AI service error. Please check Gemini API key configuration." 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: error.message || "Failed to analyze report. Please try again." 
    }, { status: 500 });
  }
}

// GET: Fetch all reports for the current user
export async function GET(req: NextRequest) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({
      where: { email: userEmail }
    });

    if (!dbUser) {
      return NextResponse.json({ reports: [] }); // Return empty array if user doesn't exist
    }

    const reports = await db.report.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        analysis: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ reports });

  } catch (error: any) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}