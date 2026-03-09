"use client"
import { useApiClient } from "@/lib/api"
import { useParams, useRouter } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Circle, PhoneCall, StopCircle, Clock, Mic, CalendarCheck, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
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
  selectedDoctor: Doctor | null;
}

function MedicalVoiceAgent() {
  const { sessionId } = useParams()
  const router = useRouter()
  const [session, setSession] = useState<Session>()
  const apiClient = useApiClient()

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
  const messagesRef = useRef<Message[]>([])

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages])

  const saveConversation = async () => {
    const currentMessages = messagesRef.current;
    if (currentMessages.length === 0) return;
    try {
      await apiClient(`/history/sessions/${sessionId}`, {
        method: "PUT",
        data: { messages: currentMessages }
      });
    } catch (error) {
      console.error("Failed to save conversation:", error);
    }
  }

  useEffect(() => {
    if (sessionId) getSessionDetails();

    vapi.removeAllListeners();

    vapi.on('call-start', () => {
      setIsCallActive(true);
      setIsLoading(false);
    });

    vapi.on('call-end', () => {
      stopCallUI();
      saveConversation();
    });

    vapi.on('speech-start', () => setIsSpeaking(true));
    vapi.on('speech-end', () => setIsSpeaking(false));

    vapi.on('message', (message: any) => {
      if (message.type === 'transcript') {
        if (message.role !== 'user' && message.role !== 'assistant') return;

        if (message.transcriptType === 'partial') {
          if (message.role === 'assistant') setAssistantCaption(message.transcript);
          if (message.role === 'user') setUserCaption(message.transcript);
        } else {
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.content === message.transcript && (Date.now() - (lastMsg.timestamp || 0) < 1000)) {
              return prev;
            }
            return [...prev, {
              role: message.role,
              content: message.transcript,
              timestamp: Date.now()
            }];
          });
          if (message.role === 'assistant') setAssistantCaption("");
          if (message.role === 'user') setUserCaption("");
        }
      }
    });

    return () => {
      vapi.removeAllListeners();
    }
  }, [sessionId])

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
      const msgsResponse = await apiClient(`/history/sessions/${sessionId}`)
      setMessages(msgsResponse.data);
      setSession({
        id: sessionId as any,
        selectedDoctor: {
          image: "/medical-assistance.png",
          specialist: "Medical Assistant",
          description: "Your AI Health Companion",
          id: 1,
          agentPrompt: "",
          voiceId: ""
        }
      })
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
    vapi.stop();
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
    <div className='min-h-[calc(100vh-120px)] flex flex-col'>
      {/* Top Navigation Bar */}
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-4'>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/consultation')}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Button>
          <div>
            <h1 className='text-lg font-semibold tracking-tight text-gray-900 dark:text-white'>Voice Session</h1>
            <p className='text-xs font-medium text-gray-500 dark:text-gray-400'>
              {session?.selectedDoctor?.specialist || 'AI Specialist'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {/* Status Badge */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase border transition-colors ${isCallActive
            ? 'bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20'
            : 'bg-white dark:bg-[#111111] text-gray-500 border-gray-200 dark:border-white/10'
            }`}>
            <div className={`w-2 h-2 rounded-full ${isCallActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
            {isCallActive ? 'Live Call' : 'Standby'}
          </div>

          {/* Timer */}
          {isCallActive && (
            <div className='flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'>
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className='text-xs font-mono font-medium text-gray-700 dark:text-gray-300 tracking-wider'>{formatTime(callDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className='flex flex-col items-center'>
        {/* Doctor Info (subtle) */}
        {session?.selectedDoctor && (
          <div className='flex items-center gap-3 mb-2'>
            <Image
              src={session.selectedDoctor.image}
              alt="Doctor"
              width={40}
              height={40}
              className="w-10 h-10 object-cover rounded-full border-2 border-white shadow-md"
            />
            <div>
              <h2 className='text-sm font-semibold text-gray-800'>{session.selectedDoctor.specialist}</h2>
              <p className='text-xs text-gray-400'>{session.selectedDoctor.description}</p>
            </div>
          </div>
        )}

        {/* Orb + Conversation Display */}
        <ConversationDisplay
          messages={messages}
          userCaption={userCaption}
          assistantCaption={assistantCaption}
          isCallActive={isCallActive}
          isListening={isCallActive && !isSpeaking}
          isSpeaking={isSpeaking}
        />

        {/* Action Button */}
        <div className='mt-10 mb-8'>
          {!isCallActive ? (
            <button
              onClick={startCall}
              disabled={isLoading}
              className='group flex items-center justify-center gap-2.5 w-64 h-14 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0'
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className='w-5 h-5' />
                  Start Consultation
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stopCall}
              className='group flex items-center justify-center gap-2.5 w-64 h-14 rounded-full bg-rose-500 text-white font-semibold text-sm shadow-[0_8px_24px_rgba(244,63,94,0.25)] hover:bg-rose-600 hover:shadow-[0_12px_32px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 transition-all duration-300'
            >
              <StopCircle className='w-5 h-5 group-hover:scale-110 transition-transform' />
              End Session
            </button>
          )}
        </div>

        {/* AI → Doctor Handoff CTA */}
        {!isCallActive && messages.length > 0 && (
          <Link
            href="/dashboard/consultation_booking"
            className="group w-full max-w-lg mx-auto flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10 border border-teal-100 dark:border-teal-500/15 hover:shadow-lg hover:shadow-teal-100/50 dark:hover:shadow-teal-900/30 transition-all duration-300 cursor-pointer mb-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                Want to consult a real doctor?
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Book a video appointment with a healthcare specialist
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default MedicalVoiceAgent