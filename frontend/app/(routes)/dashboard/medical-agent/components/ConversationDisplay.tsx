"use client"
import React, { useEffect, useRef } from 'react'
import { Message } from '@/types/index' // <--- FIXED IMPORT (was ./ConversationManager)
import { Mic, MicOff, User, Bot } from 'lucide-react' // Added generic icons just in case

interface ConversationDisplayProps {
  messages: Message[];
  userCaption: string;
  assistantCaption: string;
  isCallActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
}

const ConversationDisplay = ({ 
  messages, 
  userCaption, 
  assistantCaption,
  isCallActive,
  isListening,
  isSpeaking
}: ConversationDisplayProps) => {
  
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, userCaption, assistantCaption])

  return (
    <div className='flex flex-col gap-4 w-full max-w-2xl mt-5 h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-xl border'>
      {/* Empty State */}
      {messages.length === 0 && !userCaption && !assistantCaption && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <p>Start talking to begin the consultation...</p>
        </div>
      )}

      {/* History Messages */}
      {messages.map((msg, index) => (
        <div 
          key={index} 
          className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <div className={`p-3 rounded-lg max-w-[80%] ${
            msg.role === 'user' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white border text-gray-800'
          }`}>
            <p className="text-sm">{msg.content}</p>
          </div>
        </div>
      ))}

      {/* Real-time Captions (Active Speech) */}
      {(userCaption || assistantCaption) && (
        <div className={`flex gap-3 ${userCaption ? 'flex-row-reverse' : 'flex-row'}`}>
           <div className={`p-3 rounded-lg max-w-[80%] animate-pulse ${
            userCaption 
              ? 'bg-blue-400/50 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            <p className="text-sm">{userCaption || assistantCaption}</p>
            <span className="text-xs opacity-70 italic">
               {userCaption ? 'Listening...' : 'Speaking...'}
            </span>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  )
}

export default ConversationDisplay