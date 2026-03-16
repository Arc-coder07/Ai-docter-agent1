"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Loader2,
    Stethoscope,
    ArrowLeft,
    ArrowRight,
    User,
    GraduationCap,
    Clock,
    Phone,
    Globe,
    FileText,
    CheckCircle,
    IndianRupee,
    Calendar,
    Plus,
    X,
    Briefcase,
    SparklesIcon
} from 'lucide-react'
import { toast } from 'sonner'

const SPECIALIZATIONS = [
    'General Physician',
    'Cardiologist',
    'Dermatologist',
    'Pulmonologist',
    'Pediatrician',
    'Orthopedic Surgeon',
    'Neurologist',
    'Psychiatrist',
    'Gynecologist',
    'ENT Specialist',
    'Ophthalmologist',
    'Urologist',
    'Gastroenterologist',
    'Endocrinologist',
    'Oncologist',
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type AvailabilitySlot = {
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
}

export default function DoctorRegistration() {
    const router = useRouter()
    const apiClient = useApiClient()

    const [step, setStep] = useState(1)
    const [submitting, setSubmitting] = useState(false)

    // Step 1: Personal
    const [name, setName] = useState('')
    const [specialization, setSpecialization] = useState('')
    const [qualification, setQualification] = useState('')

    // Step 2: Professional
    const [experienceYears, setExperienceYears] = useState('')
    const [bio, setBio] = useState('')
    const [consultationFee, setConsultationFee] = useState('500')
    const [phone, setPhone] = useState('')
    const [languages, setLanguages] = useState('English')

    // Step 3: Availability
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([
        { day_of_week: 0, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 },
        { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 },
        { day_of_week: 2, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 },
        { day_of_week: 3, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 },
        { day_of_week: 4, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 30 },
    ])

    const addSlot = () => {
        const usedDays = new Set(availability.map(s => s.day_of_week))
        const nextDay = DAYS.findIndex((_, i) => !usedDays.has(i))
        if (nextDay === -1) {
            toast.error('All days already have slots')
            return
        }
        setAvailability([...availability, {
            day_of_week: nextDay,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration_minutes: 30,
        }])
    }

    const removeSlot = (index: number) => {
        setAvailability(availability.filter((_, i) => i !== index))
    }

    const updateSlot = (index: number, field: keyof AvailabilitySlot, value: string | number) => {
        const updated = [...availability]
            ; (updated[index] as any)[field] = value
        setAvailability(updated)
    }

    const canProceedStep1 = name.trim() && specialization && qualification.trim()
    const canProceedStep2 = Number(experienceYears) > 0 && Number(consultationFee) > 0
    const canSubmit = availability.length > 0

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            // Step 1: Register as doctor
            await apiClient('/consultation/doctor/register', {
                method: 'POST',
                data: {
                    name: name.trim(),
                    specialization,
                    qualification: qualification.trim(),
                    experience_years: Number(experienceYears),
                    bio: bio.trim() || null,
                    consultation_fee: Number(consultationFee),
                    phone: phone.trim() || null,
                    languages: languages.trim() || 'English',
                }
            })

            // Step 2: Set availability
            if (availability.length > 0) {
                await apiClient('/consultation/doctor/availability', {
                    method: 'POST',
                    data: {
                        slots: availability.map(s => ({
                            day_of_week: s.day_of_week,
                            start_time: s.start_time,
                            end_time: s.end_time,
                            slot_duration_minutes: s.slot_duration_minutes,
                        })),
                    }
                })
            }

            toast.success('Doctor profile created successfully!', {
                description: 'Welcome to the Doctor Portal!',
            })
            // Force full page reload to refresh Clerk session with new role
            window.location.href = '/dashboard/doctor-portal'
        } catch (err: any) {
            const detail = err?.response?.data?.detail
            toast.error(detail || 'Registration failed. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Hero */}
            <div className="mb-8 rounded-[2rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white/80 tracking-wide uppercase">Doctor Registration</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                        Join MedSage as a Doctor
                    </h1>
                    <p className="text-white/75 text-sm max-w-lg">
                        Set up your profile and start accepting video consultation appointments from patients.
                    </p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {[
                    { num: 1, label: 'Personal Info', icon: User },
                    { num: 2, label: 'Professional', icon: Briefcase },
                    { num: 3, label: 'Availability', icon: Calendar },
                ].map(({ num, label, icon: Icon }) => (
                    <React.Fragment key={num}>
                        {num > 1 && (
                            <div className={`w-12 h-0.5 rounded-full transition-colors ${step >= num ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-white/10'}`} />
                        )}
                        <button
                            onClick={() => {
                                if (num < step) setStep(num)
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all ${step === num
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30'
                                : step > num
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 cursor-pointer'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-default'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{label}</span>
                            <span className="sm:hidden">{num}</span>
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] p-8">

                {/* Step 1: Personal Info */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Personal Information</h2>
                            <p className="text-sm text-gray-500">Basic details for your doctor profile</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                <User className="w-4 h-4" /> Full Name *
                            </label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Dr. Full Name"
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4" /> Specialization *
                            </label>
                            <select
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                            >
                                <option value="">Select specialization</option>
                                {SPECIALIZATIONS.map(spec => (
                                    <option key={spec} value={spec}>{spec}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4" /> Qualification *
                            </label>
                            <Input
                                value={qualification}
                                onChange={(e) => setQualification(e.target.value)}
                                placeholder="e.g., MBBS, MD (Medicine), FRCP"
                                className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                            />
                        </div>

                        <Button
                            onClick={() => setStep(2)}
                            disabled={!canProceedStep1}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 rounded-xl text-base font-semibold shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 disabled:opacity-50 transition-all"
                        >
                            Next: Professional Details <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}

                {/* Step 2: Professional Details */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Professional Details</h2>
                            <p className="text-sm text-gray-500">Experience, fee, and contact information</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" /> Experience (years) *
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={experienceYears}
                                    onChange={(e) => setExperienceYears(e.target.value)}
                                    placeholder="e.g., 8"
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                    <IndianRupee className="w-4 h-4" /> Fee (₹) *
                                </label>
                                <Input
                                    type="number"
                                    min="100"
                                    value={consultationFee}
                                    onChange={(e) => setConsultationFee(e.target.value)}
                                    placeholder="500"
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                    <Phone className="w-4 h-4" /> Phone (optional)
                                </label>
                                <Input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                    <Globe className="w-4 h-4" /> Languages
                                </label>
                                <Input
                                    value={languages}
                                    onChange={(e) => setLanguages(e.target.value)}
                                    placeholder="English, Hindi"
                                    className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 rounded-xl"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                <FileText className="w-4 h-4" /> Bio (optional)
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell patients about your expertise, approach, and areas of interest..."
                                className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500/40 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 transition-all"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setStep(1)}
                                className="flex-1 rounded-xl"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                disabled={!canProceedStep2}
                                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 disabled:opacity-50 transition-all"
                            >
                                Next: Availability <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Availability */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Weekly Availability</h2>
                            <p className="text-sm text-gray-500">Set when patients can book appointments with you</p>
                        </div>

                        <div className="space-y-3">
                            {availability.map((slot, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5"
                                >
                                    <select
                                        value={slot.day_of_week}
                                        onChange={(e) => updateSlot(idx, 'day_of_week', Number(e.target.value))}
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
                                            onChange={(e) => updateSlot(idx, 'start_time', e.target.value)}
                                            className="w-28 bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 rounded-xl text-sm"
                                        />
                                        <span className="text-gray-400 text-sm">to</span>
                                        <Input
                                            type="time"
                                            value={slot.end_time}
                                            onChange={(e) => updateSlot(idx, 'end_time', e.target.value)}
                                            className="w-28 bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 rounded-xl text-sm"
                                        />
                                    </div>

                                    <button
                                        onClick={() => removeSlot(idx)}
                                        className="ml-auto w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={addSlot}
                                className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-500/30 dark:hover:text-indigo-400 flex items-center justify-center gap-2 text-sm font-medium transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Day
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-500/15">
                            <div className="flex items-center gap-2 mb-3">
                                <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Registration Summary</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-gray-500">Name</span>
                                <span className="font-medium text-gray-800 dark:text-white">{name || '—'}</span>
                                <span className="text-gray-500">Specialization</span>
                                <span className="font-medium text-gray-800 dark:text-white">{specialization || '—'}</span>
                                <span className="text-gray-500">Experience</span>
                                <span className="font-medium text-gray-800 dark:text-white">{experienceYears ? `${experienceYears} years` : '—'}</span>
                                <span className="text-gray-500">Fee</span>
                                <span className="font-medium text-gray-800 dark:text-white">₹{consultationFee}</span>
                                <span className="text-gray-500">Available Days</span>
                                <span className="font-medium text-gray-800 dark:text-white">{availability.length} days / week</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setStep(2)}
                                className="flex-1 rounded-xl"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting}
                                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 disabled:opacity-50 transition-all"
                            >
                                {submitting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Profile...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4 mr-2" /> Complete Registration</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
