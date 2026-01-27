export interface Doctor {
  id: number;
  name: string;
  specialist: string;
  image: string;
  voiceId?: string; // Vapi Assistant ID
}

export interface Session {
  id: number;
  sessionId: string;
  createdOn: string;
  conversation: Message[];
  selectedDocter: Doctor | null;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}