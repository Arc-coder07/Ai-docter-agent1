import { AIDoctorAgents } from "@/shared/list"; // Ideally move this list to DB or constants
import { NextRequest, NextResponse } from "next/server";

// Define keywords constant outside function to avoid recreation on every request
const SPECIALIST_KEYWORDS: Record<string, string[]> = {
  "General Physician": ["fever", "cold", "cough", "flu", "headache", "pain", "tired", "fatigue"],
  "Pediatrician": ["child", "baby", "infant", "kid", "toddler"],
  "Dermatologist": ["skin", "rash", "acne", "itch", "eczema", "hair"],
  "Psychologist": ["stress", "anxiety", "depression", "mental", "mood", "sleep"],
  "Cardiologist": ["heart", "chest", "pain", "blood pressure", "palpitation"],
  // ... add others
};

function findDoctorBySymptoms(symptoms: string) {
  const lowercaseSymptoms = symptoms.toLowerCase();
  let bestMatch = "General Physician";
  let highestCount = 0;

  Object.entries(SPECIALIST_KEYWORDS).forEach(([specialist, keywords]) => {
    const count = keywords.filter(k => lowercaseSymptoms.includes(k.toLowerCase())).length;
    if (count > highestCount) {
      highestCount = count;
      bestMatch = specialist;
    }
  });

  return AIDoctorAgents.find(doc => doc.specialist === bestMatch) || AIDoctorAgents[0];
}

export async function POST(request: NextRequest) {
  try {
    const { notes } = await request.json();

    if (!notes) {
      return NextResponse.json({ error: "Notes are required" }, { status: 400 });
    }

    // Default fallback doctor
    let matchedDoctor = AIDoctorAgents[0];

    // Only run analysis if notes are substantial
    if (notes.trim().length >= 5) {
      matchedDoctor = findDoctorBySymptoms(notes);
    }

    // Ensure valid image
    if (!matchedDoctor.image?.startsWith("http")) {
      matchedDoctor.image = "/doctor1.png"; // Default asset
    }

    return NextResponse.json(matchedDoctor);
  } catch (error) {
    console.error("Doctor suggestion error:", error);
    return NextResponse.json(AIDoctorAgents[0], { status: 200 }); // Fail gracefully to default doctor
  }
}