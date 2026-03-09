"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Loader2,
    Video,
    Calendar,
    Clock,
    Search,
    X,
    UserCircle,
    Stethoscope,
    Award,
    ChevronRight,
    XCircle,
    CheckCircle,
    CalendarCheck,
    ArrowRight,
    ChevronLeft,
    Phone,
    Globe,
    IndianRupee
} from 'lucide-react'
import { useApiClient } from "@/lib/api"
import Link from 'next/link'
import { toast } from 'sonner'

type Doctor = {
    id: string
    name: string
    specialization: string
    qualification: string
    experience_years: number
    avatar_url: string | null
    bio: string
    consultation_fee: number
    is_available: boolean
    phone: string | null
    languages: string | null
}

type Appointment = {
    id: string
    doctor: {
        id: string
        name: string
        specialization: string
    }
    scheduled_at: string
    duration_minutes: number
    status: string
    meeting_room_id: string
    meeting_url: string
    notes: string | null
    created_at: string
}

type TimeSlot = {
    time: string
    end_time: string
    available: boolean
    booked: boolean
}

type AvailabilityDay = {
    day_of_week: number
    start_time: string
    end_time: string
}

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ConsultationBooking() {
    const apiClient = useApiClient()

    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
    const [showBooking, setShowBooking] = useState(false)
    const [loading, setLoading] = useState(true)
    const [booking, setBooking] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'doctors' | 'appointments'>('doctors')
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    // Slot-based booking state
    const [bookingDate, setBookingDate] = useState('')
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [bookingNotes, setBookingNotes] = useState('')
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
    const [doctorAvailability, setDoctorAvailability] = useState<AvailabilityDay[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [doctorsRes, appointmentsRes] = await Promise.all([
                apiClient('/consultation/doctors'),
                apiClient('/consultation/appointments')
            ])
            setDoctors(doctorsRes.data || doctorsRes)
            setAppointments(appointmentsRes.data || appointmentsRes)
        } catch (err) {
            console.error('Failed to load data:', err)
            toast.error('Failed to load data. Please refresh the page.')
        } finally {
            setLoading(false)
        }
    }

    const loadDoctorAvailability = async (doctorId: string) => {
        try {
            const res = await apiClient(`/consultation/doctors/${doctorId}/availability`)
            const data = res.data || res
            setDoctorAvailability(data.slots || [])
        } catch {
            setDoctorAvailability([])
        }
    }

    const loadSlots = async (doctorId: string, date: string) => {
        setLoadingSlots(true)
        setAvailableSlots([])
        setSelectedSlot(null)
        try {
            const res = await apiClient(`/consultation/doctors/${doctorId}/slots?date=${date}`)
            const data = res.data || res
            setAvailableSlots(data.slots || [])
        } catch (err: any) {
            const detail = err?.response?.data?.detail
            if (detail) {
                toast.error(detail)
            }
            setAvailableSlots([])
        } finally {
            setLoadingSlots(false)
        }
    }

    const handleDateChange = (date: string) => {
        setBookingDate(date)
        setSelectedSlot(null)
        if (selectedDoctor && date) {
            loadSlots(selectedDoctor.id, date)
        }
    }

    const openBookingModal = async (doctor: Doctor) => {
        setSelectedDoctor(doctor)
        setShowBooking(true)
        setBookingDate('')
        setSelectedSlot(null)
        setBookingNotes('')
        setAvailableSlots([])
        await loadDoctorAvailability(doctor.id)
    }

    const handleBook = async () => {
        if (!selectedDoctor || !bookingDate || !selectedSlot) return
        setBooking(true)

        try {
            const scheduledAt = new Date(`${bookingDate}T${selectedSlot}:00`).toISOString()

            await apiClient('/consultation/book', {
                method: 'POST',
                data: {
                    doctor_id: selectedDoctor.id,
                    scheduled_at: scheduledAt,
                    duration_minutes: 30,
                    notes: bookingNotes || null
                }
            })

            setShowBooking(false)
            setSelectedDoctor(null)
            setBookingDate('')
            setSelectedSlot(null)
            setBookingNotes('')
            loadData()
            setActiveTab('appointments')
            toast.success('Appointment booked successfully!', {
                description: `Your consultation with ${selectedDoctor.name} has been scheduled.`
            })
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || err.message || 'Booking failed. Please try again.')
        } finally {
            setBooking(false)
        }
    }

    const handleCancel = async (appointmentId: string) => {
        setCancellingId(appointmentId)
        try {
            await apiClient(`/consultation/appointments/${appointmentId}/cancel`, {
                method: 'PUT'
            })
            loadData()
            toast.success('Appointment cancelled')
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || err.message || 'Failed to cancel appointment.')
        } finally {
            setCancellingId(null)
        }
    }

    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    const formatTime12h = (time24: string) => {
        const [h, m] = time24.split(':').map(Number)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400'
            case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400'
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400'
            default: return 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-400'
        }
    }

    const getMinDate = () => new Date().toISOString().split('T')[0]

    const getSpecializationColor = (spec: string) => {
        const colors: Record<string, string> = {
            'General Physician': 'from-blue-400 to-blue-600',
            'Pulmonologist': 'from-cyan-400 to-cyan-600',
            'Cardiologist': 'from-red-400 to-red-600',
            'Dermatologist': 'from-pink-400 to-pink-600',
            'Pediatrician': 'from-amber-400 to-amber-600',
            'Orthopedic Surgeon': 'from-emerald-400 to-emerald-600',
            'Neurologist': 'from-purple-400 to-purple-600',
            'Psychiatrist': 'from-indigo-400 to-indigo-600'
        }
        return colors[spec] || 'from-gray-400 to-gray-600'
    }

    // Build date hints: which days of the week the doctor is available
    const availableDaysOfWeek = new Set(doctorAvailability.map(s => s.day_of_week))

    const scheduledCount = appointments.filter(a => a.status === 'scheduled').length

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="rounded-[2.5rem] bg-gray-100 dark:bg-white/5 h-48 mb-8 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="rounded-3xl bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 p-6 animate-pulse">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="space-y-2 mb-4">
                                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-full" />
                                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-2/3" />
                            </div>
                            <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Hero Banner */}
            <div className="mb-8 w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 p-8 md:p-12 text-white shadow-xl relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 max-w-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                <CalendarCheck className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-sm font-medium text-white/80 tracking-wide uppercase">Doctor Appointments</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">
                            Book Video Consultations{' '}
                            <br className="hidden md:block" />
                            with Expert Doctors
                        </h1>
                        <p className="text-white/80 text-base leading-relaxed max-w-md">
                            Schedule appointments with qualified healthcare specialists and join secure video consultations from anywhere.
                        </p>
                    </div>
                    <div className="hidden md:flex flex-col items-center gap-3 bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
                        <Stethoscope className="w-12 h-12 text-white/80" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">{doctors.length}</p>
                            <p className="text-sm text-white/70">Specialists Available</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex bg-gray-100 dark:bg-white/5 rounded-2xl p-1 border border-gray-200/50 dark:border-white/5">
                    <button
                        onClick={() => setActiveTab('doctors')}
                        className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'doctors'
                            ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        Doctors
                    </button>
                    <button
                        onClick={() => setActiveTab('appointments')}
                        className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'appointments'
                            ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        My Appointments
                        {scheduledCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {scheduledCount}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'doctors' && (
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or specialization..."
                            className="pl-11 py-2.5 bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 rounded-2xl text-sm shadow-sm"
                        />
                    </div>
                )}
            </div>

            {activeTab === 'doctors' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDoctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="group relative bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out"
                            >
                                <div className={`h-1.5 bg-gradient-to-r ${getSpecializationColor(doctor.specialization)}`} />
                                <div className="p-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getSpecializationColor(doctor.specialization)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                            <UserCircle className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{doctor.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{doctor.specialization}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Award className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                            <span className="truncate">{doctor.qualification}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Stethoscope className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                            <span>{doctor.experience_years} years experience</span>
                                        </div>
                                        {doctor.languages && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                                <span>{doctor.languages}</span>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-5 leading-relaxed">{doctor.bio}</p>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                        <div>
                                            <span className="text-xl font-bold text-gray-800 dark:text-white">₹{doctor.consultation_fee}</span>
                                            <span className="text-xs text-gray-400 ml-1">/session</span>
                                        </div>
                                        <Button
                                            onClick={() => openBookingModal(doctor)}
                                            className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl px-5 shadow-md shadow-teal-200/50 dark:shadow-teal-900/30 transition-all"
                                            size="sm"
                                        >
                                            Book Now <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredDoctors.length === 0 && (
                        <div className="text-center py-16 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                            <UserCircle className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No doctors found</p>
                            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                        </div>
                    )}
                </>
            ) : (
                /* Appointments Tab */
                <div className="space-y-4">
                    {appointments.length === 0 ? (
                        <div className="text-center py-16 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                            <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No appointments yet</p>
                            <p className="text-sm text-gray-400 mt-1">Book a consultation with a doctor to get started</p>
                            <Button
                                onClick={() => setActiveTab('doctors')}
                                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                            >
                                Browse Doctors <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    ) : (
                        appointments.map((apt) => (
                            <div
                                key={apt.id}
                                className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md">
                                            <UserCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white">{apt.doctor.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{apt.doctor.specialization}</p>
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
                                        {apt.duration_minutes} minutes
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
                                            <Link
                                                href={`/dashboard/consultation_booking/room/${apt.id}`}
                                                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-emerald-700 shadow-md shadow-teal-200/50 dark:shadow-teal-900/30 transition-all"
                                            >
                                                <Video className="w-4 h-4" />
                                                Join Consultation
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCancel(apt.id)}
                                                disabled={cancellingId === apt.id}
                                                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl disabled:opacity-50"
                                            >
                                                {cancellingId === apt.id ? (
                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                )}
                                                Cancel
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
                                            Appointment cancelled
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ════════ Slot-Based Booking Modal ════════ */}
            {showBooking && selectedDoctor && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 dark:border-white/10 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Book Appointment</h2>
                            <button
                                onClick={() => { setShowBooking(false); setSelectedDoctor(null) }}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* Doctor Info */}
                        <div className="flex items-center gap-3 mb-6 p-4 bg-teal-50 dark:bg-teal-500/10 rounded-2xl border border-teal-100 dark:border-teal-500/15">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getSpecializationColor(selectedDoctor.specialization)} flex items-center justify-center shadow-lg`}>
                                <UserCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 dark:text-white">{selectedDoctor.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedDoctor.specialization}</p>
                            </div>
                            <span className="text-lg font-bold text-gray-800 dark:text-white">₹{selectedDoctor.consultation_fee}</span>
                        </div>

                        {/* Available Days hint */}
                        {doctorAvailability.length > 0 && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/15">
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1.5">Available on:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {DAYS_SHORT.map((day, idx) => (
                                        <span
                                            key={day}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium ${availableDaysOfWeek.has(idx)
                                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-400 line-through'
                                                }`}
                                        >
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Date Picker */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                Select Date
                            </label>
                            <Input
                                type="date"
                                value={bookingDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                min={getMinDate()}
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                            />
                        </div>

                        {/* Time Slots Grid */}
                        {bookingDate && (
                            <div className="mb-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    Available Slots
                                </label>

                                {loadingSlots ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                                        <span className="ml-2 text-sm text-gray-500">Loading slots...</span>
                                    </div>
                                ) : availableSlots.length === 0 ? (
                                    <div className="text-center py-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                        <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm text-gray-500">No slots available on this date</p>
                                        <p className="text-xs text-gray-400 mt-1">Try a different date</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {availableSlots.map((slot) => (
                                            <button
                                                key={slot.time}
                                                onClick={() => {
                                                    if (slot.available) setSelectedSlot(slot.time)
                                                }}
                                                disabled={!slot.available}
                                                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-all ${selectedSlot === slot.time
                                                    ? 'bg-teal-500 text-white shadow-md shadow-teal-200/50 dark:shadow-teal-900/30 scale-105'
                                                    : slot.available
                                                        ? 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:border-teal-300 dark:hover:border-teal-500/30 hover:bg-teal-50 dark:hover:bg-teal-500/10'
                                                        : 'bg-gray-100 dark:bg-white/[0.03] text-gray-300 dark:text-gray-600 cursor-not-allowed line-through'
                                                    }`}
                                            >
                                                {formatTime12h(slot.time)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                📝 Notes (optional)
                            </label>
                            <textarea
                                value={bookingNotes}
                                onChange={(e) => setBookingNotes(e.target.value)}
                                placeholder="Describe your symptoms or reason for visit..."
                                className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 dark:focus:border-teal-500/40 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 transition-all"
                            />
                        </div>

                        {/* Selected slot summary */}
                        {selectedSlot && (
                            <div className="mb-4 p-4 bg-teal-50 dark:bg-teal-500/10 rounded-xl border border-teal-100 dark:border-teal-500/15">
                                <div className="flex items-center justify-between text-sm">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400">Selected: </span>
                                        <span className="font-semibold text-gray-800 dark:text-white">
                                            {new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            {' at '}
                                            {formatTime12h(selectedSlot)}
                                        </span>
                                    </div>
                                    <span className="font-bold text-teal-700 dark:text-teal-400">₹{selectedDoctor.consultation_fee}</span>
                                </div>
                            </div>
                        )}

                        {/* Book Button */}
                        <Button
                            onClick={handleBook}
                            disabled={!bookingDate || !selectedSlot || booking}
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white py-3 rounded-xl text-base font-semibold shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 disabled:opacity-50 transition-all"
                        >
                            {booking ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Booking...</>
                            ) : (
                                <><Video className="w-5 h-5 mr-2" /> Confirm Booking</>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
