"use client"
import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import {
    Bot,
    Brain,
    Stethoscope,
    Search,
    MessageCircle,
    Microscope,
    Scan,
    Image as ImageIcon,
    Mic,
    MicOff,
    Send,
    PanelLeftClose,
    PanelLeftOpen,
    Volume2,
    VolumeX,
    Trash2,
    CheckCircle,
    XCircle,
    Paperclip,
    X,
    Loader2,
    ChevronDown,
    BookOpen,
    Shield,
    Zap,
    Plus,
} from 'lucide-react'
import { colors, layout } from '@/lib/design.config'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    image_url?: string
    agent?: string
    needs_validation?: boolean
}

// Agent metadata for badges
const AGENT_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    'CONVERSATION_AGENT': { label: 'Conversation', icon: <MessageCircle className="w-3 h-3" />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20' },
    'RAG_AGENT': { label: 'Medical RAG', icon: <BookOpen className="w-3 h-3" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20' },
    'WEB_SEARCH_PROCESSOR_AGENT': { label: 'Web Search', icon: <Search className="w-3 h-3" />, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-500/20' },
    'BRAIN_TUMOR_AGENT': { label: 'Brain Tumor', icon: <Brain className="w-3 h-3" />, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/20' },
    'CHEST_XRAY_AGENT': { label: 'Chest X-ray', icon: <Scan className="w-3 h-3" />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20' },
    'SKIN_LESION_AGENT': { label: 'Skin Lesion', icon: <Microscope className="w-3 h-3" />, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-500/20' },
    'HUMAN_VALIDATED': { label: 'Validated', icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20' },
    'System': { label: 'System', icon: <Bot className="w-3 h-3" />, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-500/20' },
}

function AgentBadge({ agent }: { agent?: string }) {
    if (!agent) return null
    // Handle combined agent names like "RAG_AGENT, WEB_SEARCH_PROCESSOR_AGENT"
    const primaryAgent = agent.split(',')[0].trim()
    const meta = AGENT_META[primaryAgent] || AGENT_META['System']
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium ${layout.borderRadius.badge} ${meta.bg} ${meta.color} transition-all`}>
            {meta.icon}
            {meta.label}
        </span>
    )
}

// Sidebar agent definitions
const AGENT_LIST = [
    { name: 'Medical Conversation', icon: <MessageCircle className="w-4 h-4" />, desc: 'General health chat', colorClass: 'text-emerald-500' },
    { name: 'Medical RAG', icon: <BookOpen className="w-4 h-4" />, desc: 'Knowledge retrieval', colorClass: 'text-blue-500' },
    { name: 'Web Search', icon: <Search className="w-4 h-4" />, desc: 'Latest medical info', colorClass: 'text-violet-500' },
]

const CV_AGENTS = [
    { name: 'Brain Tumor Detection', icon: <Brain className="w-4 h-4" />, desc: 'MRI classification', colorClass: 'text-orange-500' },
    { name: 'Chest X-ray COVID-19', icon: <Scan className="w-4 h-4" />, desc: 'X-ray analysis', colorClass: 'text-red-500' },
    { name: 'Skin Lesion Analysis', icon: <Microscope className="w-4 h-4" />, desc: 'Skin segmentation', colorClass: 'text-pink-500' },
]

const RAG_CAPABILITIES = [
    'Docling PDF parsing',
    'LLM semantic chunking',
    'Qdrant hybrid search',
    'Input-output guardrails',
    'Confidence-based web fallback',
]

export default function MedicalAssistantPage() {
    const { getToken } = useAuth()
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'assistant',
            content: "Hello! I'm your **Medical AI Assistant**. I can help you with:\n\n- 💬 Health-related questions\n- 📄 Medical knowledge retrieval\n- 🧠 Brain MRI classification\n- 🫁 Chest X-ray COVID detection\n- 🔬 Skin lesion segmentation\n\nAsk me anything or upload a medical image to get started!",
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
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const getAuthHeaders = async () => {
        const token = await getToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
        }
    }, [input])

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
        } catch (error: any) {
            console.error('Error:', error)
            const errorDetail = error.response?.data?.detail || 'An unexpected error occurred.'
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `⚠️ **Error:** ${errorDetail}\n\nPlease try again or rephrase your question.`,
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
            content: "Hello! I'm your **Medical AI Assistant**. I can help you with:\n\n- 💬 Health-related questions\n- 📄 Medical knowledge retrieval\n- 🧠 Brain MRI classification\n- 🫁 Chest X-ray COVID detection\n- 🔬 Skin lesion segmentation\n\nAsk me anything or upload a medical image to get started!",
            agent: 'System'
        }])
        setSessionId(null)
        setPendingValidation(false)
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
        <div className="flex h-[calc(100vh-32px)] gap-3 p-2">

            {/* ── SIDEBAR ── */}
            <aside
                className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden
                    ${sidebarOpen ? 'w-[260px]' : 'w-0'}
                    bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl
                    shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}
            >
                <div className={`flex flex-col h-full ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
                    {/* Sidebar Header */}
                    <div className="px-5 py-4 border-b border-gray-100/50 dark:border-white/5 flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">AI Agents</h2>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Multi-agent system</p>
                            </div>
                        </div>
                    </div>

                    {/* Agent Lists */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 no-scrollbar">
                        {/* Text Agents */}
                        <div>
                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">Text Agents</h3>
                            <div className="space-y-1">
                                {AGENT_LIST.map((a) => (
                                    <div key={a.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <span className={`${a.colorClass} group-hover:scale-110 transition-transform`}>{a.icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{a.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{a.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Vision Agents */}
                        <div>
                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">Vision Agents</h3>
                            <div className="space-y-1">
                                {CV_AGENTS.map((a) => (
                                    <div key={a.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <span className={`${a.colorClass} group-hover:scale-110 transition-transform`}>{a.icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{a.name}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{a.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RAG Capabilities */}
                        <div>
                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">RAG Pipeline</h3>
                            <ul className="space-y-1 px-1">
                                {RAG_CAPABILITIES.map((c) => (
                                    <li key={c} className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                                        <div className="w-1 h-1 rounded-full bg-purple-400 flex-shrink-0" />
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="px-4 py-3 border-t border-gray-100/50 dark:border-white/5 flex-shrink-0 space-y-2">
                        <button
                            onClick={clearChat}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium
                                text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20
                                transition-all duration-200"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear Conversation
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MAIN CHAT AREA ── */}
            <main className="flex-1 flex flex-col bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl 
                border border-gray-200/50 dark:border-white/10 rounded-3xl 
                shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100/50 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                            title={sidebarOpen ? 'Hide agents panel' : 'Show agents panel'}
                        >
                            {sidebarOpen ? <PanelLeftClose className="w-4.5 h-4.5" /> : <PanelLeftOpen className="w-4.5 h-4.5" />}
                        </button>
                        <div>
                            <h1 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-purple-500" />
                                Multi-Agent Medical Assistant
                            </h1>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Upload images or ask health questions — AI agents respond automatically</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                            <Zap className="w-3 h-3" /> 6 Agents
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                            <Shield className="w-3 h-3" /> Guardrails
                        </span>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`max-w-[75%] ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-purple-500/10'
                                : 'bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md border border-gray-100 dark:border-white/10'
                                } px-4 py-3`}
                            >
                                {/* Agent Badge */}
                                {msg.agent && msg.role === 'assistant' && (
                                    <div className="mb-2">
                                        <AgentBadge agent={msg.agent} />
                                    </div>
                                )}

                                {/* Image */}
                                {msg.image_url && (
                                    <div className="mb-2">
                                        <img
                                            src={msg.image_url.startsWith('http') || msg.image_url.startsWith('data:')
                                                ? msg.image_url
                                                : `${API_URL}${msg.image_url}`
                                            }
                                            alt="Medical"
                                            className="rounded-xl max-h-52 object-contain border border-gray-200/30 dark:border-white/10"
                                        />
                                    </div>
                                )}

                                {/* Content */}
                                <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${msg.role === 'user'
                                    ? 'prose-invert'
                                    : 'prose-gray dark:prose-invert'
                                    }`}
                                >
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>

                                {/* TTS Button */}
                                {msg.role === 'assistant' && msg.agent !== 'System' && (
                                    <button
                                        onClick={() => playTTS(removeMarkdown(msg.content), msg.id)}
                                        className={`mt-2 inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all duration-200
                                            ${playingMessageId === msg.id
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/20'
                                                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        {playingMessageId === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                        {playingMessageId === msg.id ? 'Stop' : 'Listen'}
                                    </button>
                                )}

                                {/* Human Validation */}
                                {msg.needs_validation && pendingValidation && (
                                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5" />
                                            Human Validation Required
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleValidation(true)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                            >
                                                <CheckCircle className="w-3 h-3" /> Confirm
                                            </button>
                                            <button
                                                onClick={() => handleValidation(false)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                            >
                                                <XCircle className="w-3 h-3" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex justify-start animate-in fade-in duration-300">
                            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl rounded-bl-md border border-gray-100 dark:border-white/10 px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">Processing your request...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Image Preview */}
                {imagePreview && (
                    <div className="mx-4 mb-1 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl flex items-center gap-3">
                        <div className="relative">
                            <img src={imagePreview} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-gray-200 dark:border-white/10" />
                            <button
                                onClick={removeImage}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedImage?.name}</span>
                    </div>
                )}

                {/* Input Area */}
                <div className="px-4 py-3 border-t border-gray-100/50 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-end gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            className="hidden"
                        />

                        {/* Attach Image */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors flex-shrink-0"
                            title="Upload Image"
                        >
                            <Paperclip className="w-4 h-4" />
                        </button>

                        {/* Voice Record */}
                        <button
                            onClick={toggleRecording}
                            className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${isRecording
                                ? 'bg-red-500 text-white shadow-sm shadow-red-500/20 animate-pulse'
                                : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
                                }`}
                            title={isRecording ? 'Stop Recording' : 'Start Recording'}
                        >
                            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>

                        {/* Text Input */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            placeholder="Ask a medical question..."
                            className="flex-1 resize-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2.5
                                text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500
                                focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-300 dark:focus:border-purple-500/40
                                min-h-[40px] max-h-[120px] transition-all"
                            rows={1}
                            disabled={isLoading}
                        />

                        {/* Send Button */}
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || (!input.trim() && !selectedImage)}
                            className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white 
                                shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02]
                                transition-all duration-200 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 flex-shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
