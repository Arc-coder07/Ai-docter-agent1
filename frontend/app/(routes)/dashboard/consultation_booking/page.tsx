"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Loader2,
    ArrowLeft,
    Video,
    Calendar,
    Clock,
    Star,
    Search,
    X,
    UserCircle,
    Stethoscope,
    Award,
    ChevronRight,
    XCircle,
    CheckCircle
} from 'lucide-react'
import { useApiClient } from "@/lib/api"
import Link from 'next/link'

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

    // Booking form state
    const [bookingDate, setBookingDate] = useState('')
    const [bookingTime, setBookingTime] = useState('')
    const [bookingNotes, setBookingNotes] = useState('')

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
        } finally {
            setLoading(false)
        }
    }

    const handleBook = async () => {
        if (!selectedDoctor || !bookingDate || !bookingTime) return
        setBooking(true)

        try {
            const scheduledAt = new Date(`${bookingDate}T${bookingTime}:00`).toISOString()

            await apiClient('/consultation/book', {
                method: 'POST',
                body: JSON.stringify({
                    doctor_id: selectedDoctor.id,
                    scheduled_at: scheduledAt,
                    duration_minutes: 30,
                    notes: bookingNotes || null
                })
            })

            setShowBooking(false)
            setSelectedDoctor(null)
            setBookingDate('')
            setBookingTime('')
            setBookingNotes('')
            loadData()
            setActiveTab('appointments')
            alert('Appointment booked successfully!')
        } catch (err: any) {
            alert(err.message || 'Booking failed. Please try again.')
        } finally {
            setBooking(false)
        }
    }

    const handleCancel = async (appointmentId: string) => {
        if (!confirm('Are you sure you want to cancel this appointment?')) return

        try {
            await apiClient(`/consultation/appointments/${appointmentId}/cancel`, {
                method: 'PUT'
            })
            loadData()
        } catch (err: any) {
            alert(err.message || 'Failed to cancel appointment.')
        }
    }

    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800'
            case 'completed': return 'bg-green-100 text-green-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getMinDate = () => {
        const now = new Date()
        return now.toISOString().split('T')[0]
    }

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-emerald-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-teal-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-200">
                                <Video className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-800">Book a Doctor</h1>
                                <p className="text-xs text-gray-500">Video Consultation</p>
                            </div>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('doctors')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'doctors'
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Doctors
                        </button>
                        <button
                            onClick={() => setActiveTab('appointments')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'appointments'
                                    ? 'bg-white text-gray-800 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            My Appointments ({appointments.filter(a => a.status === 'scheduled').length})
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'doctors' ? (
                    <>
                        {/* Search Bar */}
                        <div className="mb-6 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search doctors by name or specialization..."
                                className="pl-12 py-3 bg-white border-gray-200 rounded-xl text-base shadow-sm"
                            />
                        </div>

                        {/* Doctor Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDoctors.map((doctor) => (
                                <div
                                    key={doctor.id}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 hover:scale-[1.01]"
                                >
                                    {/* Card Header */}
                                    <div className={`h-2 bg-gradient-to-r ${getSpecializationColor(doctor.specialization)}`} />
                                    <div className="p-6">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getSpecializationColor(doctor.specialization)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                                <UserCircle className="w-7 h-7 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-gray-800 truncate">{doctor.name}</h3>
                                                <p className="text-sm text-gray-500">{doctor.specialization}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Award className="w-4 h-4 text-gray-400" />
                                                <span>{doctor.qualification}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Stethoscope className="w-4 h-4 text-gray-400" />
                                                <span>{doctor.experience_years} years experience</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span>30 min consultation</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{doctor.bio}</p>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <div>
                                                <span className="text-lg font-bold text-gray-800">₹{doctor.consultation_fee}</span>
                                                <span className="text-xs text-gray-400 ml-1">/session</span>
                                            </div>
                                            <Button
                                                onClick={() => { setSelectedDoctor(doctor); setShowBooking(true) }}
                                                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl px-4 shadow-md shadow-teal-200"
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
                            <div className="text-center py-12 text-gray-400">
                                <UserCircle className="w-16 h-16 mx-auto mb-3 opacity-40" />
                                <p className="text-lg">No doctors found</p>
                                <p className="text-sm">Try a different search term</p>
                            </div>
                        )}
                    </>
                ) : (
                    /* Appointments Tab */
                    <div className="space-y-4">
                        {appointments.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Calendar className="w-16 h-16 mx-auto mb-3 opacity-40" />
                                <p className="text-lg">No appointments yet</p>
                                <p className="text-sm">Book a consultation with a doctor to get started</p>
                                <Button
                                    onClick={() => setActiveTab('doctors')}
                                    className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                                >
                                    Browse Doctors
                                </Button>
                            </div>
                        ) : (
                            appointments.map((apt) => (
                                <div
                                    key={apt.id}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                                <UserCircle className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{apt.doctor.name}</h3>
                                                <p className="text-sm text-gray-500">{apt.doctor.specialization}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(apt.status)}`}>
                                            {apt.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {formatDate(apt.scheduled_at)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            {apt.duration_minutes} minutes
                                        </div>
                                    </div>

                                    {apt.notes && (
                                        <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
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
                                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-emerald-700 shadow-md shadow-teal-200 transition-all"
                                                >
                                                    <Video className="w-4 h-4" />
                                                    Join Video Call
                                                </a>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCancel(apt.id)}
                                                    className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Cancel
                                                </Button>
                                            </>
                                        )}
                                        {apt.status === 'completed' && (
                                            <div className="flex items-center gap-1 text-green-600 text-sm">
                                                <CheckCircle className="w-4 h-4" />
                                                Consultation completed
                                            </div>
                                        )}
                                        {apt.status === 'cancelled' && (
                                            <div className="flex items-center gap-1 text-red-500 text-sm">
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
            </div>

            {/* Booking Modal */}
            {showBooking && selectedDoctor && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Book Appointment</h2>
                            <button
                                onClick={() => { setShowBooking(false); setSelectedDoctor(null) }}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Doctor Info */}
                        <div className="flex items-center gap-3 mb-6 p-3 bg-teal-50 rounded-xl border border-teal-100">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getSpecializationColor(selectedDoctor.specialization)} flex items-center justify-center`}>
                                <UserCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800">{selectedDoctor.name}</h3>
                                <p className="text-sm text-gray-500">{selectedDoctor.specialization}</p>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Date
                                </label>
                                <Input
                                    type="date"
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    min={getMinDate()}
                                    className="bg-gray-50 border-gray-200 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Time
                                </label>
                                <Input
                                    type="time"
                                    value={bookingTime}
                                    onChange={(e) => setBookingTime(e.target.value)}
                                    className="bg-gray-50 border-gray-200 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    📝 Notes (optional)
                                </label>
                                <textarea
                                    value={bookingNotes}
                                    onChange={(e) => setBookingNotes(e.target.value)}
                                    placeholder="Describe your symptoms or reason for visit..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Fee */}
                        <div className="mt-5 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="text-sm text-gray-600">Consultation Fee</span>
                            <span className="text-lg font-bold text-gray-800">₹{selectedDoctor.consultation_fee}</span>
                        </div>

                        {/* Book Button */}
                        <Button
                            onClick={handleBook}
                            disabled={!bookingDate || !bookingTime || booking}
                            className="w-full mt-6 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white py-3 rounded-xl text-base font-semibold shadow-lg shadow-teal-200 disabled:opacity-50"
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
