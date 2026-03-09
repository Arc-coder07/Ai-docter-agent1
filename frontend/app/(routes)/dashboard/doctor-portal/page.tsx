"use client"
import React, { useState, useEffect } from 'react'
import { useApiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
    Loader2,
    Video,
    Calendar,
    Clock,
    UserCircle,
    CheckCircle,
    XCircle,
    Stethoscope,
    ArrowRight,
    ClipboardList,
    Users,
    CalendarDays,
    Settings2,
    Plus,
    X,
    Save,
    Briefcase,
    Phone,
    Globe,
    IndianRupee,
    GraduationCap,
    FileText,
    TrendingUp,
    UserPlus
} from 'lucide-react'
import { toast } from 'sonner'

type DoctorAppointment = {
    id: string
    patient: {
        id: string | null
        name: string
        email: string
    }
    scheduled_at: string
    duration_minutes: number
    status: string
    meeting_room_id: string
    meeting_url: string
    notes: string | null
    created_at: string
}

type AvailabilitySlot = {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
}

type DoctorProfile = {
    id: string
    name: string
    specialization: string
    qualification: string
    experience_years: number
    bio: string | null
    consultation_fee: number
    phone: string | null
    languages: string | null
    is_available: boolean
    avatar_url: string | null
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SPECIALIZATIONS = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Pulmonologist',
    'Pediatrician', 'Orthopedic Surgeon', 'Neurologist', 'Psychiatrist',
    'Gynecologist', 'ENT Specialist', 'Ophthalmologist', 'Urologist',
]

export default function DoctorPortal() {
    const apiClient = useApiClient()

    const [appointments, setAppointments] = useState<DoctorAppointment[]>([])
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
    const [profile, setProfile] = useState<DoctorProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [completingId, setCompletingId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'appointments' | 'availability' | 'profile'>('appointments')
    const [activeFilter, setActiveFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')

    // Profile edit state
    const [editingProfile, setEditingProfile] = useState(false)
    const [editProfile, setEditProfile] = useState<Partial<DoctorProfile>>({})
    const [savingProfile, setSavingProfile] = useState(false)

    // Availability edit state
    const [editingAvailability, setEditingAvailability] = useState(false)
    const [editSlots, setEditSlots] = useState<{ day_of_week: number; start_time: string; end_time: string; slot_duration_minutes: number }[]>([])
    const [savingAvailability, setSavingAvailability] = useState(false)

    useEffect(() => {
        loadAllData()
    }, [])

    const loadAllData = async () => {
        try {
            const profileRes = await apiClient('/consultation/doctor/profile')
            const profileData = profileRes.data || profileRes
            setProfile(profileData)

            const [appointmentsRes, availabilityRes] = await Promise.all([
                apiClient('/consultation/doctor/my-appointments'),
                apiClient('/consultation/doctor/availability'),
            ])
            setAppointments(appointmentsRes.data || appointmentsRes)
            const availData = availabilityRes.data || availabilityRes
            setAvailability(availData.slots || [])
        } catch (err: any) {
            const detail = err?.response?.data?.detail
            if (detail === 'No doctor profile linked to this account') {
                setError('no-profile')
            } else {
                setError(detail || 'Failed to load data')
                toast.error('Failed to load portal data')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = async (appointmentId: string) => {
        setCompletingId(appointmentId)
        try {
            await apiClient(`/consultation/doctor/appointments/${appointmentId}/complete`, {
                method: 'PUT',
                data: { notes: null }
            })
            loadAllData()
            toast.success('Appointment marked as completed')
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to mark as completed')
        } finally {
            setCompletingId(null)
        }
    }

    const handleSaveProfile = async () => {
        setSavingProfile(true)
        try {
            await apiClient('/consultation/doctor/profile', {
                method: 'PUT',
                data: editProfile,
            })
            await loadAllData()
            setEditingProfile(false)
            toast.success('Profile updated successfully')
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to update profile')
        } finally {
            setSavingProfile(false)
        }
    }

    const handleSaveAvailability = async () => {
        setSavingAvailability(true)
        try {
            await apiClient('/consultation/doctor/availability', {
                method: 'POST',
                data: { slots: editSlots },
            })
            await loadAllData()
            setEditingAvailability(false)
            toast.success('Availability updated successfully')
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to update availability')
        } finally {
            setSavingAvailability(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400'
            case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400'
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const filteredAppointments = activeFilter === 'all'
        ? appointments
        : appointments.filter(a => a.status === activeFilter)

    const scheduledCount = appointments.filter(a => a.status === 'scheduled').length
    const completedCount = appointments.filter(a => a.status === 'completed').length

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="rounded-[2.5rem] bg-gray-100 dark:bg-white/5 h-44 mb-8 animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-3xl bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 p-6 animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                                    <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // No profile — show register CTA
    if (error === 'no-profile') {
        return (
            <div className="max-w-5xl mx-auto">
                <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
                    <div className="text-center max-w-lg">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/15 dark:to-purple-500/15 flex items-center justify-center">
                            <UserPlus className="w-12 h-12 text-indigo-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
                            Become a Doctor on MedSage
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-md mx-auto">
                            Register as a healthcare professional to receive video consultation bookings from patients. Set your availability, manage appointments, and help patients remotely.
                        </p>
                        <Link href="/dashboard/doctor-portal/register">
                            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl text-base font-semibold shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 transition-all">
                                <Stethoscope className="w-5 h-5 mr-2" />
                                Register as Doctor
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* Hero Banner */}
            <div className="mb-8 w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 p-8 md:p-10 text-white shadow-xl relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-white/80 tracking-wide uppercase">Doctor Portal</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
                            Welcome, {profile?.name || 'Doctor'}
                        </h1>
                        <p className="text-white/75 text-sm">
                            Manage your appointments, availability, and profile.
                        </p>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-3">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center">
                            <p className="text-2xl font-bold">{scheduledCount}</p>
                            <p className="text-xs text-white/70">Upcoming</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center">
                            <p className="text-2xl font-bold">{completedCount}</p>
                            <p className="text-xs text-white/70">Completed</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/10 text-center">
                            <p className="text-2xl font-bold">{appointments.length}</p>
                            <p className="text-xs text-white/70">Total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-white/5 rounded-2xl p-1 border border-gray-200/50 dark:border-white/5 mb-6 w-fit">
                {([
                    { key: 'appointments' as const, label: 'Appointments', icon: ClipboardList, badge: scheduledCount },
                    { key: 'availability' as const, label: 'Availability', icon: CalendarDays },
                    { key: 'profile' as const, label: 'Profile', icon: Settings2 },
                ]).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === tab.key
                            ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.badge ? (
                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {tab.badge}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>

            {/* ════════ Appointments Tab ════════ */}
            {activeTab === 'appointments' && (
                <>
                    {/* Filters */}
                    <div className="flex bg-gray-100 dark:bg-white/5 rounded-2xl p-1 border border-gray-200/50 dark:border-white/5 mb-6 w-fit">
                        {(['all', 'scheduled', 'completed', 'cancelled'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all duration-200 ${activeFilter === filter
                                    ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {filteredAppointments.length === 0 ? (
                            <div className="text-center py-16 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                                <ClipboardList className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                                    {activeFilter === 'all' ? 'No appointments yet' : `No ${activeFilter} appointments`}
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Appointments booked by patients will appear here.
                                </p>
                            </div>
                        ) : (
                            filteredAppointments.map(apt => (
                                <div
                                    key={apt.id}
                                    className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all"
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-md">
                                                <Users className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 dark:text-white">
                                                    {apt.patient.name || 'Unknown Patient'}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {apt.patient.email}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(apt.status)}`}>
                                            {apt.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {formatDate(apt.scheduled_at)}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            {apt.duration_minutes} min
                                        </div>
                                    </div>

                                    {apt.notes && (
                                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                                            📝 {apt.notes}
                                        </p>
                                    )}

                                    <div className="mt-4 flex items-center gap-3">
                                        {apt.status === 'scheduled' && (
                                            <>
                                                <a
                                                    href={apt.meeting_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/30 transition-all"
                                                >
                                                    <Video className="w-4 h-4" />
                                                    Join Video Call
                                                </a>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleComplete(apt.id)}
                                                    disabled={completingId === apt.id}
                                                    className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl disabled:opacity-50"
                                                >
                                                    {completingId === apt.id ? (
                                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                    )}
                                                    Mark Complete
                                                </Button>
                                            </>
                                        )}
                                        {apt.status === 'completed' && (
                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                                <CheckCircle className="w-4 h-4" />
                                                Consultation completed
                                            </div>
                                        )}
                                        {apt.status === 'cancelled' && (
                                            <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400 text-sm font-medium">
                                                <XCircle className="w-4 h-4" />
                                                Cancelled by patient
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* ════════ Availability Tab ════════ */}
            {activeTab === 'availability' && (
                <div className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Weekly Schedule</h2>
                            <p className="text-sm text-gray-500">Your recurring availability for patient bookings</p>
                        </div>
                        {!editingAvailability ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setEditSlots(availability.map(s => ({
                                        day_of_week: s.day_of_week,
                                        start_time: s.start_time,
                                        end_time: s.end_time,
                                        slot_duration_minutes: s.slot_duration_minutes,
                                    })))
                                    setEditingAvailability(true)
                                }}
                                className="rounded-xl"
                            >
                                <Settings2 className="w-4 h-4 mr-1.5" /> Edit Schedule
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingAvailability(false)} className="rounded-xl">
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveAvailability}
                                    disabled={savingAvailability}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl"
                                >
                                    {savingAvailability ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                    Save
                                </Button>
                            </div>
                        )}
                    </div>

                    {!editingAvailability ? (
                        /* Read-only view */
                        <div className="space-y-2">
                            {availability.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-gray-500">No availability set yet</p>
                                    <Button
                                        size="sm"
                                        className="mt-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white"
                                        onClick={() => {
                                            setEditSlots([
                                                { day_of_week: 0, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 },
                                            ])
                                            setEditingAvailability(true)
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Set Availability
                                    </Button>
                                </div>
                            ) : (
                                DAYS.map((day, idx) => {
                                    const daySlots = availability.filter(s => s.day_of_week === idx)
                                    if (daySlots.length === 0) return null
                                    return (
                                        <div key={day} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-28">{day}</span>
                                            <div className="flex flex-wrap gap-2">
                                                {daySlots.map(slot => (
                                                    <span key={slot.id} className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
                                                        {slot.start_time} – {slot.end_time}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    ) : (
                        /* Edit mode */
                        <div className="space-y-3">
                            {editSlots.map((slot, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                                    <select
                                        value={slot.day_of_week}
                                        onChange={(e) => {
                                            const updated = [...editSlots]
                                            updated[idx].day_of_week = Number(e.target.value)
                                            setEditSlots(updated)
                                        }}
                                        className="px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[130px]"
                                    >
                                        {DAYS.map((day, i) => (
                                            <option key={day} value={i}>{day}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="time"
                                            value={slot.start_time}
                                            onChange={(e) => {
                                                const updated = [...editSlots]
                                                updated[idx].start_time = e.target.value
                                                setEditSlots(updated)
                                            }}
                                            className="w-28 bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 rounded-xl text-sm"
                                        />
                                        <span className="text-gray-400 text-sm">to</span>
                                        <Input
                                            type="time"
                                            value={slot.end_time}
                                            onChange={(e) => {
                                                const updated = [...editSlots]
                                                updated[idx].end_time = e.target.value
                                                setEditSlots(updated)
                                            }}
                                            className="w-28 bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 rounded-xl text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setEditSlots(editSlots.filter((_, i) => i !== idx))}
                                        className="ml-auto w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const usedDays = new Set(editSlots.map(s => s.day_of_week))
                                    const nextDay = DAYS.findIndex((_, i) => !usedDays.has(i))
                                    setEditSlots([...editSlots, {
                                        day_of_week: nextDay >= 0 ? nextDay : 0,
                                        start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30,
                                    }])
                                }}
                                className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-500/30 dark:hover:text-indigo-400 flex items-center justify-center gap-2 text-sm font-medium transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add Day
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ════════ Profile Tab ════════ */}
            {activeTab === 'profile' && profile && (
                <div className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Doctor Profile</h2>
                        {!editingProfile ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setEditProfile({ ...profile }); setEditingProfile(true) }}
                                className="rounded-xl"
                            >
                                <Settings2 className="w-4 h-4 mr-1.5" /> Edit Profile
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingProfile(false)} className="rounded-xl">Cancel</Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl"
                                >
                                    {savingProfile ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                                    Save
                                </Button>
                            </div>
                        )}
                    </div>

                    {!editingProfile ? (
                        /* Read-only profile */
                        <div className="space-y-6">
                            <div className="flex items-start gap-5">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                    <Stethoscope className="w-10 h-10 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{profile.name}</h3>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-medium">{profile.specialization}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.qualification}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${profile.is_available ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400'}`}>
                                    {profile.is_available ? '🟢 Available' : '🔴 Unavailable'}
                                </span>
                            </div>

                            {profile.bio && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5 leading-relaxed">
                                    {profile.bio}
                                </p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { icon: Briefcase, label: 'Experience', value: `${profile.experience_years} years` },
                                    { icon: IndianRupee, label: 'Fee', value: `₹${profile.consultation_fee}` },
                                    { icon: Phone, label: 'Phone', value: profile.phone || 'Not set' },
                                    { icon: Globe, label: 'Languages', value: profile.languages || 'English' },
                                ].map(item => (
                                    <div key={item.label} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                                        <item.icon className="w-5 h-5 text-gray-400 mb-2" />
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Edit mode */
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Name</label>
                                    <Input value={editProfile.name || ''} onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                                        className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Specialization</label>
                                    <select value={editProfile.specialization || ''} onChange={e => setEditProfile({ ...editProfile, specialization: e.target.value })}
                                        className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-800 dark:text-gray-200">
                                        {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Qualification</label>
                                <Input value={editProfile.qualification || ''} onChange={e => setEditProfile({ ...editProfile, qualification: e.target.value })}
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Experience (years)</label>
                                    <Input type="number" value={editProfile.experience_years || ''} onChange={e => setEditProfile({ ...editProfile, experience_years: Number(e.target.value) })}
                                        className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Fee (₹)</label>
                                    <Input type="number" value={editProfile.consultation_fee || ''} onChange={e => setEditProfile({ ...editProfile, consultation_fee: Number(e.target.value) })}
                                        className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Phone</label>
                                    <Input value={editProfile.phone || ''} onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })}
                                        className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Languages</label>
                                    <Input value={editProfile.languages || ''} onChange={e => setEditProfile({ ...editProfile, languages: e.target.value })}
                                        className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Bio</label>
                                <textarea value={editProfile.bio || ''} onChange={e => setEditProfile({ ...editProfile, bio: e.target.value })}
                                    className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 transition-all" />
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">Available for Bookings</label>
                                <button
                                    onClick={() => setEditProfile({ ...editProfile, is_available: !editProfile.is_available })}
                                    className={`w-12 h-7 rounded-full transition-colors ${editProfile.is_available ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${editProfile.is_available ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
