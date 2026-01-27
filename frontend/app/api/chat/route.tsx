import { NextRequest, NextResponse } from "next/server";
import { chatModel, generateFallbackResponse } from "@/shared/OpenAiModel";

export async function POST(request: NextRequest) {
  try {
    const { messages, doctorPrompt } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required and must be an array" }, { status: 400 });
    }

    // Gemini handles history differently. We need to construct the chat history.
    // The "system instruction" is set on the model, but for simple chat, 
    // we can prepend it or use the `startChat` history.
    
    const systemPrompt = doctorPrompt || "You are a helpful AI medical assistant. Provide concise, accurate medical information. Remember that you are not a replacement for professional medical advice, diagnosis, or treatment.";

    // Convert OpenAI-style messages to Gemini history format
    // OpenAI: { role: 'user' | 'assistant' | 'system', content: string }
    // Gemini: { role: 'user' | 'model', parts: [{ text: string }] }
    
    const history = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model', // Gemini uses 'model' instead of 'assistant'
      parts: [{ text: msg.content }],
    }));

    try {
      // Initialize chat with history
      const chat = chatModel.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 500,
        },
        systemInstruction: systemPrompt, // Gemini 1.5 supports system instructions natively
      });

      // Send the last message (which isn't in history yet usually, or just send an empty prompt if history contains everything)
      // Assuming the frontend sends the *full* history including the latest user message:
      // We actually need to pop the last message to send it as the "new" message.
      
      let lastMessage = "Hello";
      if (history.length > 0) {
        const lastItem = history.pop(); // Remove last item to send it as the prompt
        if (lastItem && lastItem.role === 'user') {
             lastMessage = lastItem.parts[0].text;
        } else {
            // If last message was model, push it back (shouldn't happen in standard chat flow)
            if(lastItem) history.push(lastItem);
        }
      }

      // Start chat with the previous history
      const chatSession = chatModel.startChat({
        history: history,
        systemInstruction: systemPrompt,
      });

      const result = await chatSession.sendMessage(lastMessage);
      const assistantResponse = result.response.text();

      return NextResponse.json({
        content: assistantResponse
      });

    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      const fallbackResponse = generateFallbackResponse("I'm having trouble understanding your request.");
      return NextResponse.json({
        content: fallbackResponse
      });
    }
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}