"use client"
import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    image_url?: string
    agent?: string
    needs_validation?: boolean
}

export default function MedicalAssistantPage() {
    const { getToken } = useAuth()
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: "Hello! I'm your medical assistant. You can ask me health-related questions or upload medical images for analysis.",
            agent: 'System'
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [pendingValidation, setPendingValidation] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])

    const getAuthHeaders = async () => {
        const token = await getToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedImage(file)
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const removeImage = () => {
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const toggleRecording = async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
                mediaRecorderRef.current = mediaRecorder
                audioChunksRef.current = []

                mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                    stream.getTracks().forEach(track => track.stop())

                    // Transcribe
                    const formData = new FormData()
                    formData.append('audio', audioBlob, 'recording.webm')
                    try {
                        const headers = await getAuthHeaders()
                        const response = await axios.post(`${API_URL}/api/v1/assistant/transcribe`, formData, {
                            headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                        })
                        if (response.data.transcript) {
                            setInput(response.data.transcript)
                        }
                    } catch (err) {
                        console.error('Transcription failed:', err)
                    }
                }

                mediaRecorder.start()
                setIsRecording(true)
            } catch (err) {
                console.error('Microphone access denied:', err)
            }
        } else {
            mediaRecorderRef.current?.stop()
            setIsRecording(false)
        }
    }

    const playTTS = async (text: string, messageId: string) => {
        if (currentAudio) {
            currentAudio.pause()
            setCurrentAudio(null)
            setPlayingMessageId(null)
            return
        }

        try {
            const headers = await getAuthHeaders()
            const response = await axios.post(`${API_URL}/api/v1/assistant/speech`,
                { text },
                { headers, responseType: 'blob' }
            )
            const audioUrl = URL.createObjectURL(response.data)
            const audio = new Audio(audioUrl)

            audio.onended = () => {
                setCurrentAudio(null)
                setPlayingMessageId(null)
                URL.revokeObjectURL(audioUrl)
            }

            setCurrentAudio(audio)
            setPlayingMessageId(messageId)
            audio.play()
        } catch (err) {
            console.error('TTS failed:', err)
        }
    }

    const sendMessage = async () => {
        if (!input.trim() && !selectedImage) return

        setIsLoading(true)
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input || 'Uploaded medical image for analysis',
            image_url: imagePreview || undefined
        }
        setMessages(prev => [...prev, userMessage])
        const currentInput = input
        setInput('')

        try {
            const headers = await getAuthHeaders()
            let response

            if (selectedImage) {
                const formData = new FormData()
                formData.append('image', selectedImage)
                formData.append('text', currentInput || '')
                if (sessionId) formData.append('session_id', sessionId)

                response = await axios.post(`${API_URL}/api/v1/assistant/upload`, formData, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                })
                removeImage()
            } else {
                response = await axios.post(`${API_URL}/api/v1/assistant/chat`, {
                    message: currentInput,
                    session_id: sessionId
                }, { headers })
            }

            const data = response.data
            setSessionId(data.session_id)

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                agent: data.agent,
                needs_validation: data.needs_validation
            }
            setMessages(prev => [...prev, assistantMessage])

            if (data.needs_validation) setPendingValidation(true)

            if (data.result_image) {
                const imageMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    role: 'assistant',
                    content: 'Analysis Result:',
                    image_url: data.result_image
                }
                setMessages(prev => [...prev, imageMessage])
            }
        } catch (error) {
            console.error('Error:', error)
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.',
                agent: 'System'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleValidation = async (isValid: boolean, comments?: string) => {
        if (!sessionId) return
        setIsLoading(true)
        try {
            const headers = await getAuthHeaders()
            const response = await axios.post(`${API_URL}/api/v1/assistant/validate`, {
                session_id: sessionId,
                validation_result: isValid ? 'yes' : 'no',
                comments
            }, { headers })

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: response.data.response,
                agent: 'HUMAN_VALIDATED'
            }])
            setPendingValidation(false)
        } catch (err) {
            console.error('Validation error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const clearChat = () => {
        setMessages([{
            id: '0',
            role: 'assistant',
            content: "Hello! I'm your medical assistant. You can ask me health-related questions or upload medical images for analysis.",
            agent: 'System'
        }])
        setSessionId(null)
        setPendingValidation(false)
    }

    const getAgentBadgeColor = (agent?: string) => {
        if (!agent) return 'bg-gray-100 text-gray-700'
        if (agent.includes('RAG')) return 'bg-blue-100 text-blue-700'
        if (agent.includes('WEB_SEARCH')) return 'bg-purple-100 text-purple-700'
        if (agent.includes('CHEST_XRAY') || agent.includes('COVID')) return 'bg-red-100 text-red-700'
        if (agent.includes('BRAIN_TUMOR')) return 'bg-orange-100 text-orange-700'
        if (agent.includes('SKIN_LESION')) return 'bg-pink-100 text-pink-700'
        if (agent.includes('CONVERSATION')) return 'bg-green-100 text-green-700'
        if (agent === 'System') return 'bg-gray-100 text-gray-600'
        return 'bg-blue-100 text-blue-700'
    }

    const removeMarkdown = (text: string) => {
        return text
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/#{1,6}\s+/g, '')
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/^\s*[\*\-+]\s+/gm, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, ' ')
    }

    return (
        <div className="flex h-[calc(100vh-80px)] bg-gray-100 p-4 gap-4">
            {/* Sidebar */}
            <div className="w-72 bg-white rounded-2xl shadow-sm p-5 overflow-y-auto flex-shrink-0">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <h2 className="font-semibold text-gray-800">Medical Assistant</h2>
                </div>

                <div className="mb-5">
                    <h3 className="text-sm font-semibold text-blue-600 mb-2">Available Agents</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-center gap-2">
                            <span className="text-green-500">💬</span> Medical Conversation Agent
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-blue-500">📚</span> Medical RAG Agent
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-purple-500">🔍</span> Web Search Agent
                        </li>
                    </ul>
                </div>

                <div className="mb-5">
                    <h3 className="text-sm font-semibold text-blue-600 mb-2">Computer Vision Agents</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-center gap-2">
                            <span className="text-orange-500">🧠</span> Brain Tumor Detection
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-red-500">🫁</span> Chest X-ray COVID-19
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-pink-500">🔬</span> Skin Lesion Segmentation
                        </li>
                    </ul>
                </div>

                <div className="mb-5">
                    <h3 className="text-sm font-semibold text-blue-600 mb-2">RAG Capabilities</h3>
                    <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
                        <li>Docling PDF parsing</li>
                        <li>LLM semantic chunking</li>
                        <li>Qdrant hybrid search</li>
                        <li>Input-output guardrails</li>
                        <li>Confidence-based web fallback</li>
                    </ul>
                </div>

                <button
                    onClick={clearChat}
                    className="w-full py-2 px-4 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm flex items-center justify-center gap-2"
                >
                    🗑️ Clear Conversation
                </button>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                🩺 Multi-Agent Medical Assistant
                            </h1>
                            <p className="text-sm text-gray-500">Upload medical images or ask health-related questions</p>
                        </div>
                        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] rounded-2xl p-4 ${msg.role === 'user'
                                        ? 'bg-blue-100 rounded-br-none'
                                        : 'bg-gray-100 rounded-bl-none'
                                    }`}
                            >
                                {msg.agent && msg.role === 'assistant' && (
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${getAgentBadgeColor(msg.agent)}`}>
                                        {msg.agent}
                                    </span>
                                )}

                                {msg.image_url && (
                                    <div className="mb-2">
                                        <img src={msg.image_url} alt="Medical" className="rounded-lg max-h-48 object-contain" />
                                    </div>
                                )}

                                <div
                                    className="text-sm text-gray-800 prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: msg.content
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\n/g, '<br>')
                                    }}
                                />

                                {msg.role === 'assistant' && msg.agent !== 'System' && (
                                    <button
                                        onClick={() => playTTS(removeMarkdown(msg.content), msg.id)}
                                        className={`mt-2 text-xs px-3 py-1 rounded-full border transition ${playingMessageId === msg.id
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                                            }`}
                                    >
                                        {playingMessageId === msg.id ? '⏸ Pause' : '▶ Play Voice'}
                                    </button>
                                )}

                                {msg.needs_validation && pendingValidation && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm font-medium text-yellow-800 mb-2">
                                            ⚠️ Human Validation Required
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleValidation(true)}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                                            >
                                                ✓ Confirm
                                            </button>
                                            <button
                                                onClick={() => handleValidation(false)}
                                                className="px-3 py-1 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50"
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4 flex gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Image Preview */}
                {imagePreview && (
                    <div className="px-4 py-2 bg-gray-50 border-t flex items-center gap-3">
                        <div className="relative">
                            <img src={imagePreview} alt="Preview" className="h-14 w-14 object-cover rounded-lg border" />
                            <button
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                            >
                                ×
                            </button>
                        </div>
                        <span className="text-sm text-gray-600">{selectedImage?.name}</span>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t bg-gray-50">
                    <div className="flex items-end gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                            title="Upload Image"
                        >
                            📎
                        </button>

                        <button
                            onClick={toggleRecording}
                            className={`p-2.5 rounded-full transition ${isRecording
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                }`}
                            title={isRecording ? 'Stop Recording' : 'Start Recording'}
                        >
                            {isRecording ? '⏹' : '🎤'}
                        </button>

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            placeholder="Ask a medical question..."
                            className="flex-1 resize-none border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-[100px]"
                            rows={1}
                            disabled={isLoading}
                        />

                        <button
                            onClick={sendMessage}
                            disabled={isLoading || (!input.trim() && !selectedImage)}
                            className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
