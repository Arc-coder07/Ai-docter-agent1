import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

if (!apiKey) {
  console.error("Missing NEXT_PUBLIC_GEMINI_API_KEY in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Export specific models for different use cases
// 'gemini-1.5-flash' is faster and cheaper (good for chat)
// 'gemini-1.5-pro' is smarter (good for complex medical report analysis)

export const chatModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 500,
    temperature: 0.7,
  }
});

export const analysisModel = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro", // Using Pro for better document reasoning
  generationConfig: {
    maxOutputTokens: 2000,
    temperature: 0.4,
  }
});

export const generateFallbackResponse = (userMessage: string): string => {
  const fallbackResponses = [
    "I'm sorry, I'm having trouble connecting to my knowledge base right now. Could you please repeat your question?",
    "I apologize, but I'm experiencing some technical difficulties. Could we try again in a moment?",
    "I seem to be having trouble processing your request. Could you rephrase your question?",
    "I apologize for the inconvenience, but I'm currently unable to access my medical knowledge database. Please try again shortly."
  ];

  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}