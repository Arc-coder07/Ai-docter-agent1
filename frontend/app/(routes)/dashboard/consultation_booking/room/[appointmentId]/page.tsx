"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
    ArrowLeft,
    Video,
    Clock,
    UserCircle,
    Stethoscope,
    Calendar,
    Loader2,
    ExternalLink,
    PhoneOff,
    Shield
} from 'lucide-react'
import { toast } from 'sonner'

type AppointmentDetail = {
    id: string
    doctor: {
        id: string
        name: string
        specialization: string
        qualification?: string
        avatar_url?: string | null
    }
    scheduled_at: string
    duration_minutes: number
    status: string
    meeting_room_id: string
    meeting_url: string
    notes: string | null
    created_at: string
}

export default function VideoRoomPage() {
    const params = useParams()
    const router = useRouter()
    const apiClient = useApiClient()
    const appointmentId = params.appointmentId as string
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const [appointment, setAppointment] = useState<AppointmentDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [callDuration, setCallDuration] = useState(0)
    const [isInCall, setIsInCall] = useState(false)

    useEffect(() => {
        loadAppointment()
    }, [appointmentId])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (isInCall) {
            timer = setInterval(() => setCallDuration(p => p + 1), 1000)
        }
        return () => { if (timer) clearInterval(timer) }
    }, [isInCall])

    const loadAppointment = async () => {
        try {
            const res = await apiClient(`/consultation/appointments/${appointmentId}`)
            setAppointment(res.data || res)
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Failed to load appointment details')
            toast.error('Failed to load appointment')
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
        const secs = (seconds % 60).toString().padStart(2, '0')
        return `${mins}:${secs}`
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleJoinCall = () => {
        setIsInCall(true)
        setCallDuration(0)
    }

    const handleLeaveCall = () => {
        setIsInCall(false)
        toast.info('You left the video consultation')
    }

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                    <p className="text-sm text-gray-500">Loading consultation room...</p>
                </div>
            </div>
        )
    }

    if (error || !appointment) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-600 mb-2">Appointment Not Found</p>
                    <p className="text-sm text-gray-400 mb-4">{error}</p>
                    <Button onClick={() => router.push('/dashboard/consultation_booking')} variant="outline" className="rounded-xl">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Appointments
                    </Button>
                </div>
            </div>
        )
    }

    // Build Jitsi embed URL with configuration
    const jitsiDomain = 'meet.jit.si'
    const jitsiUrl = `https://${jitsiDomain}/${appointment.meeting_room_id}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","hangup","chat","fullscreen","tileview"]&interfaceConfig.SHOW_JITSI_WATERMARK=false`

    return (
        <div className="max-w-7xl mx-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/consultation_booking')}
                        className="rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                            Video Consultation
                        </h1>
                        <p className="text-xs text-gray-500">
                            with {appointment.doctor.name}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Status */}
                    <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-widest uppercase border transition-colors ${isInCall
                            ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-500/20'
                            : 'bg-white dark:bg-[#111] text-gray-500 border-gray-200 dark:border-white/10'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isInCall ? 'bg-teal-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        {isInCall ? 'In Call' : 'Ready'}
                    </div>

                    {/* Timer */}
                    {isInCall && (
                        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300 tracking-wider">
                                {formatTime(callDuration)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Video Area */}
                <div className="lg:col-span-3">
                    <div className="rounded-3xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-white/10 shadow-xl aspect-video relative">
                        {isInCall ? (
                            <iframe
                                ref={iframeRef}
                                src={jitsiUrl}
                                className="w-full h-full"
                                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
                                <div className="w-24 h-24 rounded-full bg-teal-500/20 flex items-center justify-center mb-6">
                                    <Video className="w-12 h-12 text-teal-400" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Ready to Join?</h2>
                                <p className="text-gray-400 text-sm mb-6 text-center max-w-md">
                                    Your video consultation with {appointment.doctor.name} is ready.
                                    Click below to join the secure video room.
                                </p>
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={handleJoinCall}
                                        className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl px-8 py-3 text-base font-semibold shadow-lg shadow-teal-500/25"
                                    >
                                        <Video className="w-5 h-5 mr-2" />
                                        Join Video Call
                                    </Button>
                                    <a
                                        href={appointment.meeting_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-xl hover:border-gray-500 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open in New Tab
                                    </a>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
                                    <Shield className="w-3.5 h-3.5" />
                                    End-to-end encrypted via Jitsi Meet
                                </div>
                            </div>
                        )}

                        {/* Leave Call Button (overlay) */}
                        {isInCall && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                <Button
                                    onClick={handleLeaveCall}
                                    className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2 shadow-lg shadow-red-500/30"
                                >
                                    <PhoneOff className="w-4 h-4 mr-2" />
                                    Leave Call
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar - Appointment Details */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
                        <h3 className="text-sm font-semibold tracking-widest text-gray-500 uppercase">Appointment Details</h3>

                        {/* Doctor */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md">
                                <UserCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-white text-sm">{appointment.doctor.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{appointment.doctor.specialization}</p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span>{formatDate(appointment.scheduled_at)}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span>{appointment.duration_minutes} min consultation</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                                <Stethoscope className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="capitalize">{appointment.status}</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {appointment.notes && (
                            <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Patient Notes</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                                    {appointment.notes}
                                </p>
                            </div>
                        )}

                        {/* Meeting ID */}
                        <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Room ID</p>
                            <code className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg break-all">
                                {appointment.meeting_room_id}
                            </code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
