"use client"
import React, { useEffect, useState } from 'react'
import { useApiClient } from '@/lib/api'
import { useUser } from '@clerk/nextjs'
import {
    Heart, Droplets, Ruler, Weight, AlertTriangle,
    Pill, Activity, FileText, Calendar, ArrowLeft,
    Stethoscope, Shield
} from 'lucide-react'
import Link from 'next/link'

interface HealthData {
    name: string
    gender: string
    date_of_birth: string
    blood_group: string
    height_cm: number | null
    weight_kg: number | null
    allergies: string
    chronic_conditions: string
    current_medications: string
    emergency_contact_name: string
    emergency_contact_phone: string
}

export default function HealthProfilePage() {
    const fetcher = useApiClient()
    const { user } = useUser()
    const [data, setData] = useState<HealthData | null>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ sessions: 0, reports: 0 })

    useEffect(() => {
        async function load() {
            try {
                const res = await fetcher('/users/me')
                setData(res.data)

                // Fetch session count
                try {
                    const sessRes = await fetcher('/assistant/sessions')
                    setStats(s => ({ ...s, sessions: sessRes.data?.length || 0 }))
                } catch {}
            } catch (err) {
                console.error('Failed to load health profile:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const calculateBMI = (h: number | null, w: number | null) => {
        if (!h || !w) return null
        return (w / ((h / 100) ** 2)).toFixed(1)
    }

    const getBMICategory = (bmi: number) => {
        if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' }
        if (bmi < 25) return { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
        if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' }
        return { label: 'Obese', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading your health profile...</p>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Shield className="w-12 h-12 text-gray-300" />
                <p className="text-gray-500">Could not load health profile.</p>
                <Link href="/dashboard" className="text-sm text-cyan-500 hover:underline">Back to Dashboard</Link>
            </div>
        )
    }

    const bmi = calculateBMI(data.height_cm, data.weight_kg)
    const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null
    const allergiesList = data.allergies ? data.allergies.split(',').map(a => a.trim()).filter(Boolean) : []
    const conditionsList = data.chronic_conditions ? data.chronic_conditions.split(',').map(c => c.trim()).filter(Boolean) : []
    const medicationsList = data.current_medications ? data.current_medications.split(',').map(m => m.trim()).filter(Boolean) : []

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Health Profile</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Your medical information at a glance</p>
                </div>
            </div>

            {/* Top Row: Patient Info + Blood Group + BMI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Patient Card */}
                <div className="col-span-2 bg-white dark:bg-[#111111] border border-gray-200/50 dark:border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
                            {(data.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{data.name || 'Patient'}</h2>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                {data.gender && <span className="capitalize">{data.gender}</span>}
                                {data.date_of_birth && <span>DOB: {data.date_of_birth}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem icon={<Ruler className="w-4 h-4" />} label="Height" value={data.height_cm ? `${data.height_cm} cm` : '—'} />
                        <InfoItem icon={<Weight className="w-4 h-4" />} label="Weight" value={data.weight_kg ? `${data.weight_kg} kg` : '—'} />
                        <InfoItem icon={<Calendar className="w-4 h-4" />} label="Consultations" value={`${stats.sessions}`} />
                        <InfoItem icon={<FileText className="w-4 h-4" />} label="Emergency Contact" value={data.emergency_contact_name || '—'} />
                    </div>
                </div>

                {/* Blood Group + BMI Sidebar */}
                <div className="space-y-4">
                    {/* Blood Group */}
                    <div className="bg-white dark:bg-[#111111] border border-gray-200/50 dark:border-white/10 rounded-2xl p-5 text-center">
                        <Droplets className="w-6 h-6 text-red-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Blood Group</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.blood_group || '—'}</p>
                    </div>
                    
                    {/* BMI */}
                    <div className="bg-white dark:bg-[#111111] border border-gray-200/50 dark:border-white/10 rounded-2xl p-5 text-center">
                        <Activity className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">BMI</p>
                        {bmi ? (
                            <>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{bmi}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${bmiCategory?.bg} ${bmiCategory?.color}`}>
                                    {bmiCategory?.label}
                                </span>
                            </>
                        ) : (
                            <p className="text-xl text-gray-400 mt-1">—</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Medical Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Allergies */}
                <DetailCard
                    icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
                    title="Allergies"
                    items={allergiesList}
                    emptyText="No known allergies"
                    tagColor="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                />

                {/* Chronic Conditions */}
                <DetailCard
                    icon={<Heart className="w-5 h-5 text-rose-500" />}
                    title="Chronic Conditions"
                    items={conditionsList}
                    emptyText="No chronic conditions"
                    tagColor="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                />

                {/* Medications */}
                <DetailCard
                    icon={<Pill className="w-5 h-5 text-blue-500" />}
                    title="Current Medications"
                    items={medicationsList}
                    emptyText="No current medications"
                    tagColor="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                />
            </div>

            {/* Edit Profile CTA */}
            <div className="bg-gradient-to-r from-cyan-500/5 to-teal-500/5 dark:from-cyan-500/10 dark:to-teal-500/10 border border-cyan-200/30 dark:border-cyan-500/20 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-cyan-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Want to update your health information?</p>
                </div>
                <Link
                    href="/onboarding"
                    className="px-4 py-2 text-sm font-medium rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 transition-colors"
                >
                    Edit Profile
                </Link>
            </div>
        </div>
    )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <div className="text-gray-400">{icon}</div>
            <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    )
}

function DetailCard({
    icon, title, items, emptyText, tagColor
}: {
    icon: React.ReactNode; title: string; items: string[]; emptyText: string; tagColor: string
}) {
    return (
        <div className="bg-white dark:bg-[#111111] border border-gray-200/50 dark:border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                {icon}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item, i) => (
                        <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium border ${tagColor}`}>
                            {item}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-400 italic">{emptyText}</p>
            )}
        </div>
    )
}
