"use client"
import React, { useState, useRef, useEffect } from 'react'
import { useApiClient } from '@/lib/api'
import {
    HeartPulse, Send, ArrowLeft, AlertCircle,
    Calendar, Loader2, ShieldAlert
} from 'lucide-react'
import Link from 'next/link'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export default function SymptomCheckerPage() {
    const fetcher = useApiClient()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, loading])

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMsg: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        }
        setMessages(prev => [...prev, userMsg])
        const currentInput = input.trim()
        setInput('')
        setLoading(true)

        try {
            const res = await fetcher('/assistant/chat', {
                method: 'POST',
                data: {
                    message: currentInput,
                    session_id: sessionId,
                }
            })

            const data = res.data
            if (data.session_id) setSessionId(data.session_id)

            const aiMsg: Message = {
                role: 'assistant',
                content: data.response || 'Sorry, I could not process your symptoms.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMsg])
        } catch (err) {
            console.error('Symptom check error:', err)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'An error occurred while processing your symptoms. Please try again.',
                timestamp: new Date()
            }])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <HeartPulse className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Symptom Checker</h1>
                        <p className="text-xs text-gray-500">AI-powered preliminary symptom assessment</p>
                    </div>
                </div>
            </div>

            {/* Disclaimer Banner */}
            <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex-shrink-0">
                <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    This is an AI-powered assessment tool and <strong>not a medical diagnosis</strong>. Always consult a healthcare professional for medical concerns.
                </p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
                {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 flex items-center justify-center mb-4">
                            <HeartPulse className="w-8 h-8 text-orange-500" />
                        </div>
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Describe your symptoms</h2>
                        <p className="text-sm text-gray-500 max-w-md mb-6">
                            Tell me what symptoms you're experiencing. Include details like duration, severity, and any related factors.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                            {[
                                "I have a persistent headache and fever for 3 days",
                                "I feel chest pain when breathing deeply",
                                "I have a skin rash that appeared yesterday",
                                "I'm experiencing nausea and dizziness"
                            ].map((example, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setInput(example); inputRef.current?.focus() }}
                                    className="text-left text-xs px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all"
                                >
                                    "{example}"
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                                ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-br-md'
                                : 'bg-white dark:bg-[#111111] border border-gray-200/50 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-bl-md'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-[#111111] border border-gray-200/50 dark:border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs text-gray-400 ml-1">Analyzing symptoms...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe your symptoms..."
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>

                {/* Book Doctor CTA */}
                {messages.length > 1 && (
                    <div className="mt-3 flex items-center justify-center">
                        <Link
                            href="/dashboard/consultation_booking"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200/50 dark:border-teal-500/20 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Want professional advice? Book a Doctor
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
