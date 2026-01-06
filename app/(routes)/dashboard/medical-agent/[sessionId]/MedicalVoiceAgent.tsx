"use client"
import axios from 'axios'
import { useParams } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'
import { Circle, PhoneCall, StopCircle } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Doctor } from '../../_components/DoctorsList'
import ConversationDisplay from '../components/ConversationDisplay'
import Vapi from '@vapi-ai/web'

// 1. Initialize Vapi
const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);

// Type definitions
type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type Session = {
  id: number;
  selectedDocter: Doctor | null;
}

function MedicalVoiceAgent() {
  const { sessionId } = useParams()
  const [session, setSession] = useState<Session>()
  
  // UI States
  const [isCallActive, setIsCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  // Chat Data
  const [messages, setMessages] = useState<Message[]>([])
  const [userCaption, setUserCaption] = useState<string>("")
  const [assistantCaption, setAssistantCaption] = useState<string>("")

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // NEW: Ref to track messages inside event listeners without re-rendering
  const messagesRef = useRef<Message[]>([])

  // Sync the Ref with the State whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages])

  // --- 2. NEW: Save Conversation Logic ---
  const saveConversation = async () => {
    // Use the Ref to get the absolute latest messages at the moment the call ends
    const currentMessages = messagesRef.current;
    
    if (currentMessages.length === 0) {
        console.log("No messages to save.");
        return;
    }
    
    console.log("Saving conversation to database...");
    try {
      await axios.put('/api/session-chat', {
        sessionId: sessionId, 
        messages: currentMessages
      });
      console.log("Conversation saved successfully!");
    } catch (error) {
      console.error("Failed to save conversation:", error);
    }
  }

  // --- Main Effect for Vapi Listeners ---

  useEffect(() => {
    if (sessionId) getSessionDetails();

    // 1. CLEANUP: Remove any existing listeners to prevent duplicates (Fixes Double Text)
    vapi.removeAllListeners();

    // Event: Call Started
    vapi.on('call-start', () => {
      console.log('Call started');
      setIsCallActive(true);
      setIsLoading(false);
    });

    // Event: Call Ended
    vapi.on('call-end', () => {
      console.log('Call ended');
      stopCallUI();
      saveConversation(); 
    });

    // Event: Speech/Audio Status
    vapi.on('speech-start', () => setIsSpeaking(true));
    vapi.on('speech-end', () => setIsSpeaking(false));

    // Event: Transcripts & Messages
    vapi.on('message', (message: any) => {
      if (message.type === 'transcript') {
        if (message.role !== 'user' && message.role !== 'assistant') return;

        // Handle Real-time Captions (Partial)
        if (message.transcriptType === 'partial') {
          if (message.role === 'assistant') setAssistantCaption(message.transcript);
          if (message.role === 'user') setUserCaption(message.transcript);
        } 
        // Handle Final Messages
        else {
           // 2. DEDUPLICATION: Check if this message is identical to the last one
           setMessages(prev => {
             const lastMsg = prev[prev.length - 1];
             // If content matches and was received < 1 second ago, ignore it
             if (lastMsg && lastMsg.content === message.transcript && (Date.now() - (lastMsg.timestamp || 0) < 1000)) {
               return prev;
             }
             
             const newMessage: Message = {
               role: message.role,
               content: message.transcript,
               timestamp: Date.now()
             };
             return [...prev, newMessage];
           });
           
           // Clear captions immediately
           if (message.role === 'assistant') setAssistantCaption("");
           if (message.role === 'user') setUserCaption("");
        }
      }
    });

    // Cleanup on unmount
    return () => {
      // NOTE: We do NOT call vapi.stop() here to prevent dropping call on hot-reload
      vapi.removeAllListeners(); 
    }
  }, [sessionId])
  // useEffect(() => {
  //   if (sessionId) getSessionDetails();

  //   // Event: Call Started
  //   vapi.on('call-start', () => {
  //     console.log('Call started');
  //     setIsCallActive(true);
  //     setIsLoading(false);
  //   });

  //   // Event: Call Ended
  //   vapi.on('call-end', () => {
  //     console.log('Call ended');
  //     stopCallUI();
  //     saveConversation(); // <--- Trigger Save Function Here
  //   });

  //   // Event: Speech/Audio Status
  //   vapi.on('speech-start', () => setIsSpeaking(true));
  //   vapi.on('speech-end', () => setIsSpeaking(false));

  //   // Event: Transcripts & Messages
  //   vapi.on('message', (message: any) => {
  //     if (message.type === 'transcript') {
  //       // Filter out system messages, only keep user/assistant
  //       if (message.role !== 'user' && message.role !== 'assistant') return;

  //       // Handle Real-time Captions (Partial)
  //       if (message.transcriptType === 'partial') {
  //         if (message.role === 'assistant') setAssistantCaption(message.transcript);
  //         if (message.role === 'user') setUserCaption(message.transcript);
  //       } 
  //       // Handle Final Messages
  //       else {
  //          const newMessage: Message = {
  //            role: message.role,
  //            content: message.transcript,
  //            timestamp: Date.now()
  //          };
           
  //          // Clear captions
  //          if (message.role === 'assistant') setAssistantCaption("");
  //          if (message.role === 'user') setUserCaption("");

  //          // Update State
  //          setMessages(prev => [...prev, newMessage]);
  //       }
  //     }
  //   });

  //   // Cleanup on unmount
  //   return () => {
  //     vapi.stop();
  //     vapi.removeAllListeners();
  //   }
  // }, [sessionId]) // Dependency array kept clean thanks to Ref pattern

  // Timer Logic
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isCallActive])

  const getSessionDetails = async () => {
    try {
      const response = await axios.get(`/api/session-chat?sessionId=${sessionId}`)
      const sessionData = response.data;
      setSession(sessionData);

      // --- FIX: Load existing conversation history ---
      if (sessionData.conversation && Array.isArray(sessionData.conversation)) {
        console.log("Loading past conversation...", sessionData.conversation);
        setMessages(sessionData.conversation);
      }
      // -----------------------------------------------

    } catch (error) {
      console.error("Error fetching session:", error)
    }
  }

  const startCall = async () => {
    setIsLoading(true);
    try {
      await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
    } catch (err) {
      console.error("Failed to start call:", err);
      setIsLoading(false);
    }
  }

  const stopCall = () => {
    vapi.stop(); // This triggers 'call-end' event which runs saveConversation
  }

  const stopCallUI = () => {
    setIsCallActive(false);
    setCallDuration(0);
    setIsSpeaking(false);
    setAssistantCaption("");
    setUserCaption("");
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  return (
    <div className='p-5 border-2 rounded-xl bg-secondary'>
      <div className='flex items-center justify-between'>
        <h2 className='p-1 px-2 border rounded-md flex items-center gap-2'>
          {isCallActive ? (
            <><Circle className="text-green-500 animate-pulse fill-green-500" /> Connected</>
          ) : (
            <><Circle /> Not Connected</>
          )}
        </h2>
        <h2 className='text-xl font-bold text-gray-500'>{formatTime(callDuration)}</h2>
      </div>

      <div className='flex flex-col items-center gap-2 mt-10 justify-center'>
        {session?.selectedDocter?.image ? (
          <Image
            src={session.selectedDocter.image}
            alt="Doctor"
            width={120}
            height={120}
            className={`w-[100px] h-[100px] object-cover rounded-full transition-all duration-300 ${isSpeaking ? 'ring-4 ring-green-500 scale-105' : ''}`}
          />
        ) : (
          <div className='w-[100px] h-[100px] bg-gray-200 rounded-full flex items-center justify-center'>
            <span className='text-gray-400'>No Image</span>
          </div>
        )}
        
        <h2 className='text-lg font-bold mt-2'>{session?.selectedDocter?.specialist || "AI Doctor"}</h2>
        <p className='text-sm text-gray-500'>Analysis agent</p>

        <ConversationDisplay
          messages={messages}
          userCaption={userCaption}
          assistantCaption={assistantCaption}
          isCallActive={isCallActive}
          isListening={isCallActive && !isSpeaking}
          isSpeaking={isSpeaking}
        />

        {!isCallActive ? (
          <Button className='mt-6' onClick={startCall} disabled={isLoading}>
            {isLoading ? "Connecting..." : <><PhoneCall className='w-4 h-4 mr-2' /> Start</>}
          </Button>
        ) : (
          <Button className='mt-6 bg-red-500 hover:bg-red-600' onClick={stopCall}>
            <StopCircle className='w-4 h-4 mr-2' /> End Session
          </Button>
        )}
      </div>
    </div>
  )
}

export default MedicalVoiceAgent