"use client"
import React, { useEffect, useRef } from 'react'
import { Message } from '@/types/index'
import { Mic, Volume2, User, Bot, MessageSquare } from 'lucide-react'

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, userCaption, assistantCaption])

  return (
    <div className='w-full max-w-2xl mt-6 space-y-4'>
      {/* Audio Orb - Siri Style */}
      <div className="flex flex-col items-center justify-center py-10">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Outer glow rings */}
          {isCallActive && (
            <>
              <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${isSpeaking
                ? 'bg-blue-400/10 dark:bg-blue-500/20 scale-[1.5] animate-[orb-pulse_2s_ease-in-out_infinite]'
                : isListening
                  ? 'bg-blue-400/5 dark:bg-blue-500/10 scale-[1.3] animate-[orb-pulse_1.5s_ease-in-out_infinite]'
                  : 'bg-gray-200/20 dark:bg-white/5 scale-[1.1]'
                }`} />
              <div className={`absolute inset-2 rounded-full transition-all duration-700 ${isSpeaking
                ? 'bg-blue-400/20 dark:bg-blue-500/30 scale-[1.25] animate-[orb-pulse_1.8s_ease-in-out_infinite_0.2s]'
                : isListening
                  ? 'bg-blue-400/10 dark:bg-blue-500/20 scale-[1.15] animate-[orb-pulse_1.3s_ease-in-out_infinite_0.1s]'
                  : 'bg-gray-200/30 dark:bg-white/10 scale-[1.05]'
                }`} />
            </>
          )}

          {/* Main orb */}
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${!isCallActive
            ? 'bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 scale-100'
            : isSpeaking
              ? 'bg-blue-500 border-none scale-105 shadow-[0_0_60px_rgba(59,130,246,0.4)]'
              : isListening
                ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 scale-100 animate-[orb-breathe_3s_ease-in-out_infinite] shadow-[0_0_40px_rgba(59,130,246,0.15)]'
                : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10'
            }`}>
            {/* Inner shine */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-white/10 pointer-events-none ${isSpeaking ? 'opacity-100' : 'opacity-0'}`} />

            {/* Icon */}
            {isSpeaking ? (
              <Volume2 className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <Mic className={`w-10 h-10 transition-colors duration-300 ${isCallActive && isListening ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`} />
            )}
          </div>
        </div>

        {/* Live Caption */}
        {isCallActive && (
          <div className="mt-6 w-full max-w-lg text-center min-h-[60px]">
            {userCaption && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500 flex items-center justify-center gap-1 mb-1">
                  <Mic className="w-3 h-3" /> You
                </span>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">{userCaption}</p>
              </div>
            )}
            {assistantCaption && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="text-[10px] uppercase tracking-wider font-bold text-teal-500 flex items-center justify-center gap-1 mb-1">
                  <Volume2 className="w-3 h-3" /> Doctor
                </span>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">{assistantCaption}</p>
              </div>
            )}
            {!userCaption && !assistantCaption && (
              <p className="text-xs text-gray-400 animate-pulse">Listening...</p>
            )}
          </div>
        )}

        {!isCallActive && messages.length === 0 && (
          <p className="mt-4 text-sm text-gray-400">Press Start to begin your consultation</p>
        )}
      </div>

      {/* Transcript Section */}
      {messages.length > 0 && (
        <div className="rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Conversation Transcript
            </h3>
            <span className="text-[10px] font-mono font-medium text-gray-400 bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-full">{messages.length} messages</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-5 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-gray-100 dark:bg-white/10'
                  }`}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4 text-white" />
                    : <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  }
                </div>
                <div className={`py-3 px-4 max-w-[85%] ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm'
                  }`}>
                  <p className="text-[15px] leading-relaxed tracking-tight">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  )
}

export default ConversationDisplay