"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApiClient } from '@/lib/api'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Stethoscope,
    Heart,
    ArrowRight,
    ArrowLeft,
    Loader2,
    UserCircle,
    Calendar,
    Droplets,
    Ruler,
    Weight,
    AlertTriangle,
    Pill,
    Phone,
    CheckCircle2,
    Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
]

export default function OnboardingPage() {
    const router = useRouter()
    const apiClient = useApiClient()
    const { user: clerkUser } = useUser()
    const [step, setStep] = useState<'role' | 'patient-form'>('role')
    const [submitting, setSubmitting] = useState(false)

    const [form, setForm] = useState({
        name: clerkUser?.fullName || '',
        date_of_birth: '',
        gender: '',
        blood_group: '',
        height_cm: '',
        weight_kg: '',
        allergies: '',
        chronic_conditions: '',
        current_medications: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
    })

    const handleDoctorSelect = () => {
        router.push('/dashboard/doctor-portal/register?onboarding=true')
    }

    const handlePatientSubmit = async () => {
        if (!form.name || !form.date_of_birth || !form.gender || !form.blood_group) {
            toast.error('Please fill in all required fields')
            return
        }
        setSubmitting(true)
        try {
            await apiClient('/onboarding/patient', {
                method: 'POST',
                data: {
                    ...form,
                    height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
                    weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
                    allergies: form.allergies || null,
                    chronic_conditions: form.chronic_conditions || null,
                    current_medications: form.current_medications || null,
                    emergency_contact_name: form.emergency_contact_name || null,
                    emergency_contact_phone: form.emergency_contact_phone || null,
                },
            })
            toast.success('Welcome to MedSage!')
            // Force reload to refresh Clerk session with new role
            window.location.href = '/dashboard'
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to save profile')
        } finally {
            setSubmitting(false)
        }
    }

    // ─── Role Selection ────────────────────────────
    if (step === 'role') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-[#0a0a0a] dark:via-[#0e0e0e] dark:to-[#0a1210] flex items-center justify-center p-6">
                <div className="w-full max-w-3xl">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-semibold tracking-widest uppercase mb-6 border border-teal-100 dark:border-teal-500/20">
                            <Sparkles className="w-3.5 h-3.5" />
                            Welcome to MedSage
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
                            How will you use MedSage?
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">
                            Select your role to personalize your experience
                        </p>
                    </div>

                    {/* Role Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Patient Card */}
                        <button
                            onClick={() => setStep('patient-form')}
                            className="group relative bg-white dark:bg-[#111] rounded-3xl border-2 border-gray-100 dark:border-white/5 p-8 text-left hover:border-teal-300 dark:hover:border-teal-500/30 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(20,184,166,0.08)] hover:-translate-y-1"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30 group-hover:scale-110 transition-transform duration-300">
                                <Heart className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                I&apos;m a Patient
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                                Access AI-powered health analysis, book doctor consultations, manage your medical records, and get personalized health insights.
                            </p>
                            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm font-semibold">
                                Continue as Patient
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>

                        {/* Doctor Card */}
                        <button
                            onClick={handleDoctorSelect}
                            className="group relative bg-white dark:bg-[#111] rounded-3xl border-2 border-gray-100 dark:border-white/5 p-8 text-left hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(99,102,241,0.08)] hover:-translate-y-1"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 group-hover:scale-110 transition-transform duration-300">
                                <Stethoscope className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                I&apos;m a Doctor
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                                Set up your professional profile, manage appointment availability, consult with patients via video call, and access your dashboard.
                            </p>
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold">
                                Continue as Doctor
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ─── Patient Details Form ────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-[#0a0a0a] dark:via-[#0e0e0e] dark:to-[#0a1210] flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Back + Header */}
                <button
                    onClick={() => setStep('role')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to role selection
                </button>

                <div className="bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-[0_2px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                    {/* Form Header */}
                    <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Your Health Profile
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    This helps our AI provide personalized insights
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6 space-y-6">
                        {/* Required Fields */}
                        <div className="space-y-4">
                            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                                Required Information
                            </p>

                            {/* Name */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <UserCircle className="w-4 h-4 text-gray-400" /> Full Name
                                </label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Your full name"
                                    className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                />
                            </div>

                            {/* DOB + Gender */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Calendar className="w-4 h-4 text-gray-400" /> Date of Birth
                                    </label>
                                    <Input
                                        type="date"
                                        value={form.date_of_birth}
                                        onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                                        className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                        Gender
                                    </label>
                                    <div className="flex gap-2">
                                        {GENDERS.map(g => (
                                            <button
                                                key={g.value}
                                                onClick={() => setForm(f => ({ ...f, gender: g.value }))}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${form.gender === g.value
                                                    ? 'bg-teal-50 dark:bg-teal-500/15 border-teal-300 dark:border-teal-500/30 text-teal-700 dark:text-teal-400'
                                                    : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/20'
                                                    }`}
                                            >
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Blood Group */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <Droplets className="w-4 h-4 text-gray-400" /> Blood Group
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {BLOOD_GROUPS.map(bg => (
                                        <button
                                            key={bg}
                                            onClick={() => setForm(f => ({ ...f, blood_group: bg }))}
                                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${form.blood_group === bg
                                                ? 'bg-red-50 dark:bg-red-500/15 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400'
                                                : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/20'
                                                }`}
                                        >
                                            {bg}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Optional Fields */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                                Optional Details
                            </p>

                            {/* Height + Weight */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Ruler className="w-4 h-4 text-gray-400" /> Height (cm)
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.height_cm}
                                        onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))}
                                        placeholder="170"
                                        className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Weight className="w-4 h-4 text-gray-400" /> Weight (kg)
                                    </label>
                                    <Input
                                        type="number"
                                        value={form.weight_kg}
                                        onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                                        placeholder="65"
                                        className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                    />
                                </div>
                            </div>

                            {/* Allergies */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <AlertTriangle className="w-4 h-4 text-gray-400" /> Allergies
                                </label>
                                <Input
                                    value={form.allergies}
                                    onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                                    placeholder="e.g. Penicillin, Peanuts (leave empty if none)"
                                    className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                />
                            </div>

                            {/* Chronic Conditions */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <Heart className="w-4 h-4 text-gray-400" /> Chronic Conditions
                                </label>
                                <Input
                                    value={form.chronic_conditions}
                                    onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))}
                                    placeholder="e.g. Diabetes, Asthma (leave empty if none)"
                                    className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                />
                            </div>

                            {/* Current Medications */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    <Pill className="w-4 h-4 text-gray-400" /> Current Medications
                                </label>
                                <Input
                                    value={form.current_medications}
                                    onChange={e => setForm(f => ({ ...f, current_medications: e.target.value }))}
                                    placeholder="e.g. Metformin 500mg (leave empty if none)"
                                    className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                />
                            </div>

                            {/* Emergency Contact */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <UserCircle className="w-4 h-4 text-gray-400" /> Emergency Contact
                                    </label>
                                    <Input
                                        value={form.emergency_contact_name}
                                        onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))}
                                        placeholder="Name"
                                        className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <Phone className="w-4 h-4 text-gray-400" /> Contact Phone
                                    </label>
                                    <Input
                                        value={form.emergency_contact_phone}
                                        onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))}
                                        placeholder="+91 98765 43210"
                                        className="rounded-xl border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 h-11"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="px-8 py-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                        <Button
                            onClick={handlePatientSubmit}
                            disabled={submitting || !form.name || !form.date_of_birth || !form.gender || !form.blood_group}
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl h-12 text-base font-semibold shadow-lg shadow-teal-200/40 dark:shadow-teal-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {submitting ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Setting up your profile...</>
                            ) : (
                                <><CheckCircle2 className="w-5 h-5 mr-2" /> Complete Setup & Enter MedSage</>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
