"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft, Search, Pill, ShieldAlert, Loader2, AlertTriangle,
    ExternalLink, Plus, Trash2, Edit3, Clock, Bell, BellOff,
    ChevronDown, ChevronUp, X, RefreshCw, ShoppingCart, Info,
    Calendar, Save, Eye
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────
interface DrugSuggestion {
    brandName: string
    genericName: string
}

interface DrugDetail {
    brandName: string
    genericName: string
    drugClass: string
    description: string
    indications: string
    dosageAdmin: string
    sideEffects: string
    warnings: string
    contraindications: string
    interactions: string
    storage: string
    boxedWarning: string
}

interface SavedMedication {
    id: string
    brandName: string
    genericName: string
    dosage: string
    frequency: string
    times: string[]
    startDate: string
    notes: string
    addedAt: string
}

// ─── Helpers ────────────────────────────────────────────────
const truncateText = (text: string, max = 500) =>
    text && text.length > max ? text.slice(0, max) + '…' : text || 'Not available'

const extractField = (data: any, field: string): string => {
    try {
        const val = data?.results?.[0]?.[field]
        if (Array.isArray(val)) return val.join('\n\n')
        return val || 'Not available'
    } catch { return 'Not available' }
}

const STORAGE_KEY = 'myMedications'
const loadMedications = (): SavedMedication[] => {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch { return [] }
}
const saveMedications = (meds: SavedMedication[]) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meds))

const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 6 hours', 'Every 8 hours', 'As needed']

// ─── Component ──────────────────────────────────────────────
export default function MedicationsPage() {
    // Search state
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState('')

    // Detail state
    const [selectedDrug, setSelectedDrug] = useState<DrugDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState('')

    // Medication management state
    const [myMedications, setMyMedications] = useState<SavedMedication[]>([])
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingMed, setEditingMed] = useState<SavedMedication | null>(null)
    const [formData, setFormData] = useState({
        dosage: '', frequency: 'Once daily', times: ['08:00'],
        startDate: new Date().toISOString().split('T')[0], notes: ''
    })

    // Reminders
    const [reminderActive, setReminderActive] = useState(false)
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
    const reminderRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Expanded sections in detail card
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
    const searchRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Load saved medications on mount
    useEffect(() => {
        setMyMedications(loadMedications())
        if (typeof Notification !== 'undefined') {
            setNotificationPermission(Notification.permission)
        }
    }, [])

    // Start reminder checker
    useEffect(() => {
        if (myMedications.length > 0) {
            startReminderChecker()
        }
        return () => { if (reminderRef.current) clearInterval(reminderRef.current) }
    }, [myMedications])

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // ── Search with debounce ──────────────────────────────────
    const handleSearch = useCallback((value: string) => {
        setQuery(value)
        setSearchError('')
        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (value.length < 2) {
            setSuggestions([])
            setShowDropdown(false)
            return
        }

        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                // Try OpenFDA first
                const fdaRes = await fetch(
                    `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(value)}*&limit=6`
                )
                if (fdaRes.ok) {
                    const data = await fdaRes.json()
                    const results: DrugSuggestion[] = (data.results || []).map((r: any) => ({
                        brandName: r.openfda?.brand_name?.[0] || 'Unknown',
                        genericName: r.openfda?.generic_name?.[0] || ''
                    }))
                    // Deduplicate by brandName
                    const unique = results.filter((r, i, self) =>
                        i === self.findIndex(s => s.brandName.toLowerCase() === r.brandName.toLowerCase())
                    )
                    setSuggestions(unique)
                    setShowDropdown(unique.length > 0)
                    setSearchLoading(false)
                    return
                }
                // Fallback to RxNorm
                const rxRes = await fetch(
                    `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(value)}`
                )
                if (rxRes.ok) {
                    const data = await rxRes.json()
                    const groups = data?.drugGroup?.conceptGroup || []
                    const results: DrugSuggestion[] = []
                    for (const group of groups) {
                        for (const prop of group.conceptProperties || []) {
                            results.push({ brandName: prop.name, genericName: '' })
                        }
                    }
                    setSuggestions(results.slice(0, 6))
                    setShowDropdown(results.length > 0)
                }
            } catch (err) {
                setSearchError('Failed to fetch suggestions. Please try again.')
                setSuggestions([])
            } finally {
                setSearchLoading(false)
            }
        }, 300)
    }, [])

    // ── Fetch Drug Detail ─────────────────────────────────────
    const fetchDrugDetail = async (drugName: string) => {
        setDetailLoading(true)
        setDetailError('')
        setSelectedDrug(null)
        setShowDropdown(false)
        setQuery(drugName)

        try {
            const res = await fetch(
                `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=1`
            )
            if (!res.ok) throw new Error('Drug not found')
            const data = await res.json()
            const r = data.results?.[0]
            if (!r) throw new Error('No data available')

            setSelectedDrug({
                brandName: r.openfda?.brand_name?.[0] || drugName,
                genericName: r.openfda?.generic_name?.[0] || 'N/A',
                drugClass: r.openfda?.pharm_class_epc?.[0] || r.openfda?.product_type?.[0] || 'N/A',
                description: extractField(data, 'description'),
                indications: extractField(data, 'indications_and_usage'),
                dosageAdmin: extractField(data, 'dosage_and_administration'),
                sideEffects: extractField(data, 'adverse_reactions'),
                warnings: extractField(data, 'warnings'),
                contraindications: extractField(data, 'contraindications'),
                interactions: extractField(data, 'drug_interactions'),
                storage: extractField(data, 'storage_and_handling'),
                boxedWarning: extractField(data, 'boxed_warning'),
            })
        } catch (err: any) {
            setDetailError(err.message || 'Failed to fetch drug details.')
        } finally {
            setDetailLoading(false)
        }
    }

    // ── Medication CRUD ───────────────────────────────────────
    const resetForm = () => {
        setFormData({
            dosage: '', frequency: 'Once daily', times: ['08:00'],
            startDate: new Date().toISOString().split('T')[0], notes: ''
        })
        setEditingMed(null)
        setShowAddForm(false)
    }

    const handleSaveMedication = () => {
        if (!formData.dosage.trim()) {
            toast.error('Please enter a dosage amount')
            return
        }
        // Request notification permission on first save
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => setNotificationPermission(perm))
        }

        let updated: SavedMedication[]
        if (editingMed) {
            updated = myMedications.map(m =>
                m.id === editingMed.id
                    ? { ...m, ...formData, brandName: m.brandName, genericName: m.genericName }
                    : m
            )
            toast.success('Medication updated')
        } else {
            const newMed: SavedMedication = {
                id: crypto.randomUUID(),
                brandName: selectedDrug?.brandName || query,
                genericName: selectedDrug?.genericName || '',
                ...formData,
                addedAt: new Date().toISOString()
            }
            updated = [...myMedications, newMed]
            toast.success('Medication added to your list')
        }
        setMyMedications(updated)
        saveMedications(updated)
        resetForm()
    }

    const handleDeleteMedication = (id: string) => {
        const updated = myMedications.filter(m => m.id !== id)
        setMyMedications(updated)
        saveMedications(updated)
        toast.success('Medication removed')
    }

    const handleEditMedication = (med: SavedMedication) => {
        setEditingMed(med)
        setFormData({
            dosage: med.dosage,
            frequency: med.frequency,
            times: med.times,
            startDate: med.startDate,
            notes: med.notes
        })
        setShowAddForm(true)
    }

    const addTimeSlot = () => setFormData(p => ({ ...p, times: [...p.times, '12:00'] }))
    const removeTimeSlot = (i: number) => setFormData(p => ({
        ...p, times: p.times.filter((_, idx) => idx !== i)
    }))
    const updateTimeSlot = (i: number, val: string) => setFormData(p => ({
        ...p, times: p.times.map((t, idx) => idx === i ? val : t)
    }))

    // ── Reminders ─────────────────────────────────────────────
    const startReminderChecker = () => {
        if (reminderRef.current) clearInterval(reminderRef.current)
        setReminderActive(true)

        reminderRef.current = setInterval(() => {
            const now = new Date()
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

            const meds = loadMedications()
            for (const med of meds) {
                for (const time of med.times) {
                    if (time === currentTime) {
                        // Fire browser notification
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification('💊 Medication Reminder', {
                                body: `Time to take ${med.brandName} — ${med.dosage}`,
                                icon: '/favicon.ico'
                            })
                        }
                        // Also fire in-app toast
                        toast.info(`💊 Time to take ${med.brandName} — ${med.dosage}`, {
                            duration: 10000,
                        })
                    }
                }
            }
        }, 60000) // Check every minute
    }

    // Toggle section expand
    const toggleSection = (key: string) =>
        setExpandedSections(p => ({ ...p, [key]: !p[key] }))

    // ── Shopping Links ────────────────────────────────────────
    const shoppingLinks = (name: string) => [
        { label: '1mg', url: `https://www.1mg.com/search/all?name=${encodeURIComponent(name)}`, color: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
        { label: 'Netmeds', url: `https://www.netmeds.com/catalogsearch/result/${encodeURIComponent(name)}/all`, color: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' },
        { label: 'PharmEasy', url: `https://pharmeasy.in/search/all?name=${encodeURIComponent(name)}`, color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
        { label: 'Amazon', url: `https://www.amazon.in/s?k=${encodeURIComponent(name)}+medicine`, color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    ]

    // ── Detail Section Renderer ───────────────────────────────
    const DetailSection = ({ title, content, color = 'blue' }: { title: string; content: string; color?: string }) => {
        const isExpanded = expandedSections[title]
        const isLong = content.length > 200
        const display = isExpanded || !isLong ? content : content.slice(0, 200) + '…'

        return (
            <div className="border-b border-gray-100 dark:border-white/5 last:border-0">
                <button
                    onClick={() => toggleSection(title)}
                    className="w-full flex items-center justify-between py-3 px-1 text-left group"
                >
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h4>
                    {isLong && (
                        isExpanded
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pb-3 px-1 whitespace-pre-line">
                    {display}
                </p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Medication Manager</h1>
                        <p className="text-xs text-gray-500">Search, track, and manage your medications</p>
                    </div>
                </div>
                {/* Reminder status badge */}
                {myMedications.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                            reminderActive 
                                ? 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' 
                                : 'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10'
                        }`}>
                            {reminderActive ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                            {myMedications.length} reminder{myMedications.length !== 1 ? 's' : ''} active
                        </div>
                    </div>
                )}
            </div>

            {/* Disclaimer Banner */}
            <div className="flex items-start gap-3 px-4 py-3 mb-6 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
                <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    ⚠️ This tool is for <strong>informational purposes only</strong>. Always consult a licensed physician before taking any medication.
                </p>
            </div>

            {/* ────── SEARCH ────── */}
            <div ref={searchRef} className="relative mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search medication (e.g. Aspirin, Ibuprofen)…"
                        className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all shadow-sm"
                    />
                    {searchLoading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-spin" />
                    )}
                </div>

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                    {showDropdown && suggestions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute z-50 w-full mt-2 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden"
                        >
                            {suggestions.map((s, i) => (
                                <button
                                    key={`${s.brandName}-${i}`}
                                    onClick={() => fetchDrugDetail(s.brandName)}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
                                >
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.brandName}</p>
                                    {s.genericName && (
                                        <p className="text-xs text-gray-500 mt-0.5">{s.genericName}</p>
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {searchError && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {searchError}
                        <button onClick={() => handleSearch(query)} className="ml-1 underline hover:text-red-600">Retry</button>
                    </div>
                )}
            </div>

            {/* ────── DETAIL LOADING ────── */}
            {detailLoading && (
                <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-100 dark:bg-white/5 rounded w-1/3" />
                        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-1/4" />
                        <div className="space-y-2 mt-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-3 bg-gray-50 dark:bg-white/5 rounded w-full" />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ────── DETAIL ERROR ────── */}
            {detailError && (
                <div className="bg-white dark:bg-[#111111] rounded-2xl border border-red-200 dark:border-red-500/20 p-6 mb-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Could not load drug details</p>
                    <p className="text-xs text-gray-500 mb-3">{detailError}</p>
                    <button
                        onClick={() => fetchDrugDetail(query)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                </div>
            )}

            {/* ────── DRUG DETAIL CARD ────── */}
            <AnimatePresence>
                {selectedDrug && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mb-6 overflow-hidden"
                    >
                        {/* Boxed Warning Banner */}
                        {selectedDrug.boxedWarning && selectedDrug.boxedWarning !== 'Not available' && (
                            <div className="bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/20 px-5 py-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">⚠️ Boxed Warning (Black Box)</p>
                                        <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                                            {truncateText(selectedDrug.boxedWarning, 300)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Card Header */}
                        <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                                        {selectedDrug.brandName}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">{selectedDrug.genericName}</p>
                                    {selectedDrug.drugClass !== 'N/A' && (
                                        <span className="inline-block mt-2 px-2.5 py-1 text-[10px] font-medium bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 rounded-full uppercase tracking-wider">
                                            {selectedDrug.drugClass}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedDrug(null)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Detail Sections */}
                        <div className="px-5 py-2">
                            <DetailSection title="📋 Description" content={selectedDrug.description} />
                            <DetailSection title="💊 Indications & Usage" content={selectedDrug.indications} />
                            <DetailSection title="📐 Dosage & Administration" content={selectedDrug.dosageAdmin} />
                            <DetailSection title="⚡ Side Effects" content={selectedDrug.sideEffects} />
                            <DetailSection title="⚠️ Warnings & Precautions" content={selectedDrug.warnings} color="amber" />
                            <DetailSection title="🚫 Contraindications" content={selectedDrug.contraindications} />
                            <DetailSection title="🔄 Drug Interactions" content={selectedDrug.interactions} />
                            <DetailSection title="🏪 Storage Instructions" content={selectedDrug.storage} />
                        </div>

                        {/* Shopping Links */}
                        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/5">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <ShoppingCart className="w-3.5 h-3.5" /> Where to Buy
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {shoppingLinks(selectedDrug.brandName).map(link => (
                                    <a
                                        key={link.label}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${link.color}`}
                                    >
                                        {link.label} <ExternalLink className="w-3 h-3" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Add to My Medications Button */}
                        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/5">
                            <button
                                onClick={() => { setShowAddForm(true); setEditingMed(null) }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add to My Medications
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ────── ADD / EDIT FORM ────── */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm mb-6 overflow-hidden"
                    >
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                {editingMed ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingMed ? `Edit ${editingMed.brandName}` : `Add ${selectedDrug?.brandName || query}`}
                            </h3>
                            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Dosage */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Dosage Amount *</label>
                                <input
                                    type="text"
                                    value={formData.dosage}
                                    onChange={e => setFormData(p => ({ ...p, dosage: e.target.value }))}
                                    placeholder="e.g., 500mg, 10ml"
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                />
                            </div>
                            {/* Frequency */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Frequency</label>
                                <select
                                    value={formData.frequency}
                                    onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                >
                                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            {/* Time Picker(s) */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Time(s) of Day</label>
                                <div className="space-y-2">
                                    {formData.times.map((t, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <input
                                                type="time"
                                                value={t}
                                                onChange={e => updateTimeSlot(i, e.target.value)}
                                                className="flex-1 px-3.5 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                            />
                                            {formData.times.length > 1 && (
                                                <button onClick={() => removeTimeSlot(i)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={addTimeSlot} className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Add another time
                                    </button>
                                </div>
                            </div>
                            {/* Start Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                />
                            </div>
                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Notes (optional)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="e.g., Take after meals"
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                                />
                            </div>
                            {/* Save Button */}
                            <button
                                onClick={handleSaveMedication}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-green-500/20 transition-all"
                            >
                                <Save className="w-4 h-4" /> {editingMed ? 'Update Medication' : 'Save Medication'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ────── MY MEDICATIONS LIST ────── */}
            {myMedications.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2 px-1">
                        <Pill className="w-4 h-4" /> My Medications ({myMedications.length})
                    </h2>
                    <div className="space-y-3">
                        {myMedications.map(med => (
                            <motion.div
                                key={med.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-white/10 p-4 hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                            <Pill className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{med.brandName}</h3>
                                            {med.genericName && (
                                                <p className="text-xs text-gray-500">{med.genericName}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md">
                                                    {med.dosage}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md">
                                                    {med.frequency}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
                                                    <Clock className="w-2.5 h-2.5" /> {med.times.join(', ')}
                                                </span>
                                            </div>
                                            {med.notes && (
                                                <p className="text-xs text-gray-400 mt-1.5 italic">"{med.notes}"</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => fetchDrugDetail(med.brandName)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-blue-500 transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEditMedication(med)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-amber-500 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMedication(med.id)}
                                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* ────── EMPTY STATE ────── */}
            {!selectedDrug && !detailLoading && !detailError && myMedications.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 flex items-center justify-center">
                        <Pill className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Search for a medication</h2>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                        Look up drug information, save your prescriptions, and set reminders to stay on track.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['Aspirin', 'Ibuprofen', 'Metformin', 'Amoxicillin'].map(name => (
                            <button
                                key={name}
                                onClick={() => { setQuery(name); fetchDrugDetail(name) }}
                                className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-all"
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ────── REMINDER INFO ────── */}
            {myMedications.length > 0 && (
                <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-white/10 p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            notificationPermission === 'granted' 
                                ? 'bg-green-50 dark:bg-green-500/10' 
                                : 'bg-amber-50 dark:bg-amber-500/10'
                        }`}>
                            {notificationPermission === 'granted' 
                                ? <Bell className="w-5 h-5 text-green-500" />
                                : <BellOff className="w-5 h-5 text-amber-500" />
                            }
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {notificationPermission === 'granted' 
                                    ? 'Reminders Active' 
                                    : 'Enable Notifications'
                                }
                            </p>
                            <p className="text-xs text-gray-500">
                                {notificationPermission === 'granted'
                                    ? `You'll receive reminders for ${myMedications.length} medication${myMedications.length !== 1 ? 's' : ''} at scheduled times.`
                                    : 'Allow browser notifications to get medication reminders. In-app alerts are always active.'
                                }
                            </p>
                        </div>
                        {notificationPermission !== 'granted' && (
                            <button
                                onClick={() => {
                                    if (typeof Notification !== 'undefined') {
                                        Notification.requestPermission().then(p => setNotificationPermission(p))
                                    }
                                }}
                                className="px-3 py-1.5 text-xs font-medium bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                            >
                                Enable
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
