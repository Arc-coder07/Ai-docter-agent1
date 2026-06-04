"use client"
import React, { useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import {
    Settings, HelpCircle, User, Moon, Sun, Monitor,
    Bell, Globe, Info, Mail, ChevronRight,
    MessageSquare, Brain, Mic, Activity, LogOut, Heart
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import Link from 'next/link'

// ─── Settings Dialog ───────────────────────────────────────
export function SettingsDialog({ children }: { children: React.ReactNode }) {
    const { setTheme, resolvedTheme } = useTheme()

    const themes = [
        { key: 'light', label: 'Light', icon: Sun },
        { key: 'dark', label: 'Dark', icon: Moon },
        { key: 'system', label: 'System', icon: Monitor },
    ]

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Settings
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Appearance */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Appearance</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {themes.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setTheme(key)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                        resolvedTheme === key || (key === 'system' && !['light', 'dark'].includes(resolvedTheme || ''))
                                            ? 'border-primary bg-primary/5'
                                            : 'border-transparent bg-muted/50 hover:bg-muted'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Notifications */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Notifications</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Push Notifications</span>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Email Alerts</span>
                                </div>
                                <Switch />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Language */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Language</h3>
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">Display Language</span>
                            </div>
                            <span className="text-sm text-muted-foreground">English</span>
                        </div>
                    </div>

                    <Separator />

                    {/* About */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">About</h3>
                        <div className="bg-muted/30 rounded-xl p-4 space-y-1">
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">MedSage AI</span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">Version 1.0.0 • Multi-Agent Medical Assistant</p>
                            <p className="text-xs text-muted-foreground pl-6">Built with Next.js, FastAPI & LangChain</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Help Dialog ───────────────────────────────────────────
export function HelpDialog({ children }: { children: React.ReactNode }) {
    const faqs = [
        {
            q: "How does the AI Medical Assistant work?",
            a: "Our assistant uses 8 specialized AI agents that automatically route your query to the right specialist — from general health questions to brain tumor MRI analysis."
        },
        {
            q: "Is my medical data private and secure?",
            a: "Yes, all conversations are encrypted. We use Clerk for authentication and Supabase for secure data storage. Your data is never shared with third parties."
        },
        {
            q: "Can I upload medical images?",
            a: "Yes! You can upload brain MRIs, chest X-rays, and skin lesion images for AI-powered analysis with explainable results."
        },
        {
            q: "How do I book a doctor consultation?",
            a: "Navigate to 'Book a Doctor' from the sidebar, browse available doctors, choose a time slot, and book your video consultation."
        },
        {
            q: "Does this replace a real doctor?",
            a: "No. MedSage is designed as an AI assistant to provide preliminary insights. Always consult a qualified healthcare professional for medical decisions."
        },
    ]

    const features = [
        { icon: Mic, label: "Voice Consultation", desc: "Talk to AI doctors" },
        { icon: Brain, label: "Brain Tumor CDSS", desc: "MRI analysis with XAI" },
        { icon: Activity, label: "X-Ray Analysis", desc: "Pneumonia/COVID detection" },
        { icon: MessageSquare, label: "Symptom Checker", desc: "Preliminary assessment" },
    ]

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5" />
                        Help & Support
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Feature Guide */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quick Guide</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {features.map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <Icon className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* FAQ */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">FAQ</h3>
                        <Accordion type="single" collapsible className="space-y-1">
                            {faqs.map((faq, i) => (
                                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-3">
                                    <AccordionTrigger className="text-sm py-3 hover:no-underline">
                                        {faq.q}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-sm text-muted-foreground pb-3">
                                        {faq.a}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                    <Separator />

                    {/* Contact */}
                    <div className="bg-muted/30 rounded-xl p-4">
                        <h3 className="text-sm font-medium mb-2">Need more help?</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                            Reach out to our support team for any questions or issues.
                        </p>
                        <a
                            href="mailto:support@medsage.ai"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            <Mail className="w-4 h-4" />
                            support@medsage.ai
                        </a>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Account Dialog ────────────────────────────────────────
export function AccountDialog({ children }: { children: React.ReactNode }) {
    const { user } = useUser()
    const { signOut } = useClerk()

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[400px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Account
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-4">
                    {/* Profile Card */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                        {user?.imageUrl ? (
                            <img src={user.imageUrl} alt="Avatar" className="w-12 h-12 rounded-full" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                                {user?.fullName || user?.firstName || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.primaryEmailAddress?.emailAddress || ''}
                            </p>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-1">
                        <Link
                            href="/dashboard/health-profile"
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <Heart className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">Health Profile</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <Separator />

                    {/* Sign Out */}
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
                        onClick={() => signOut({ redirectUrl: '/' })}
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
