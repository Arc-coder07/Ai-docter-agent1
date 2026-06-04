"use client";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
    Bot, Mic, Brain, Activity, FileText, Calendar,
    HeartPulse, Sparkles, Stethoscope, Pill
} from "lucide-react";
import Marquee from "@/components/magicui/marquee";
import { cn } from "@/lib/utils";

// Agent cards for the marquee background
const agents = [
    { name: "Triage Agent", role: "Initial assessment" },
    { name: "Diagnostic Agent", role: "In-depth analysis" },
    { name: "Specialist Agent", role: "Expert guidance" },
    { name: "Brain Tumor Agent", role: "MRI classification" },
    { name: "X-Ray Agent", role: "Chest analysis" },
    { name: "Skin Lesion Agent", role: "Dermatology scan" },
    { name: "Guardrail Agent", role: "Safety checks" },
    { name: "Meta Agent", role: "Orchestration" },
];

const features = [
    {
        Icon: Bot,
        name: "Multi-Agent Medical AI",
        description: "8 specialized AI agents collaborate in real-time — from triage to specialist diagnosis, powered by LangChain and Google Gemini.",
        href: "/dashboard/assistant",
        cta: "Try the Assistant",
        className: "col-span-3 lg:col-span-2 lg:row-span-2",
        background: (
            <Marquee
                pauseOnHover
                className="absolute top-10 [mask-image:linear-gradient(to_top,transparent_30%,#000_100%)] [--duration:25s]"
            >
                {agents.map((agent, idx) => (
                    <figure
                        key={idx}
                        className={cn(
                            "relative w-36 cursor-pointer overflow-hidden rounded-xl border p-4 shadow-sm",
                            "border-gray-950/[.05] bg-white/[0.6] hover:bg-white/[0.9]",
                            "dark:border-white/[.05] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
                            "transform-gpu backdrop-blur-sm transition-all duration-300 ease-out"
                        )}
                    >
                        <div className="flex flex-col">
                            <figcaption className="text-sm font-semibold text-gray-900 dark:text-white">
                                {agent.name}
                            </figcaption>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">{agent.role}</p>
                        </div>
                    </figure>
                ))}
            </Marquee>
        ),
    },
    {
        Icon: Mic,
        name: "Voice Consultation",
        description: "Speak naturally with AI doctors using real-time voice — powered by VAPI and advanced speech recognition.",
        href: "/dashboard/consultation",
        cta: "Start Talking",
        className: "col-span-3 lg:col-span-1 lg:row-span-1",
        background: (
            <div className="absolute inset-0 flex items-center justify-center opacity-30 dark:opacity-20 transition-opacity group-hover:opacity-100">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 blur-sm" />
                    <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/50 via-indigo-500/50 to-purple-500/50 animate-ping" />
                </div>
            </div>
        ),
    },
    {
        Icon: Brain,
        name: "Brain Tumor Detection",
        description: "Upload MRI scans for AI-powered classification with Explainable AI heatmap visualization.",
        href: "/dashboard/brain-tumor-analysis",
        cta: "Analyze MRI",
        className: "col-span-3 lg:col-span-1 lg:row-span-1",
        background: (
            <div className="absolute top-8 right-8 opacity-10 dark:opacity-[0.05] group-hover:opacity-20 transition-opacity">
                <Brain className="w-40 h-40 text-purple-600" strokeWidth={1} />
            </div>
        ),
    },
    {
        Icon: Activity,
        name: "Chest X-Ray Analysis",
        description: "AI-powered detection of pneumonia and COVID-19 from chest X-rays with confidence scoring.",
        href: "/dashboard/xray_analysis",
        cta: "Upload X-Ray",
        className: "col-span-3 lg:col-span-1 lg:row-span-1",
        background: (
            <div className="absolute top-8 right-8 opacity-10 dark:opacity-[0.05] group-hover:opacity-20 transition-opacity">
                <Activity className="w-32 h-32 text-blue-600" strokeWidth={1} />
            </div>
        ),
    },
    {
        Icon: Calendar,
        name: "Doctor Booking",
        description: "Browse real doctors, book appointments, and join video consultations.",
        href: "/dashboard/consultation_booking",
        cta: "Book a Doctor",
        className: "col-span-3 lg:col-span-1 lg:row-span-1",
        background: (
            <div className="absolute top-8 right-8 opacity-10 dark:opacity-[0.05] group-hover:opacity-20 transition-opacity">
                <Stethoscope className="w-32 h-32 text-teal-600" strokeWidth={1} />
            </div>
        ),
    },
    {
        Icon: FileText,
        name: "Blood Report Analysis",
        description: "Upload blood reports and medical documents for instant AI-powered interpretation and insights.",
        href: "/dashboard/report_analysis",
        cta: "Upload Report",
        className: "col-span-3 lg:col-span-1 lg:row-span-1",
        background: (
            <div className="absolute top-12 right-8 opacity-10 dark:opacity-[0.05] group-hover:opacity-20 transition-opacity">
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex gap-2">
                            <div className={`h-2.5 rounded bg-gray-900 dark:bg-white`} style={{ width: `${60 + Math.random() * 40}px` }} />
                            <div className={`h-2.5 rounded bg-gray-400 dark:bg-gray-600`} style={{ width: `${30 + Math.random() * 30}px` }} />
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        Icon: HeartPulse,
        name: "Symptom Checker",
        description: "Describe your symptoms for an AI-powered preliminary assessment with triage recommendations.",
        href: "/dashboard/symptom-checker",
        cta: "Check Symptoms",
        className: "col-span-3 lg:col-span-2 lg:row-span-1",
        background: (
            <div className="absolute -bottom-8 -right-8 opacity-10 dark:opacity-[0.05] group-hover:opacity-20 transition-opacity">
                <HeartPulse className="w-64 h-64 text-rose-600" strokeWidth={0.5} />
            </div>
        ),
    },
    {
        Icon: Pill,
        name: "Medication Manager",
        description: "Track medications, set reminders, and manage your prescriptions all in one place.",
        href: "/dashboard/medications",
        cta: "Manage Meds",
        className: "col-span-3 lg:col-span-1 lg:row-span-1",
        background: (
            <div className="absolute top-8 right-8 opacity-10 dark:opacity-[0.05] group-hover:opacity-20 transition-opacity">
                <Pill className="w-32 h-32 text-green-600" strokeWidth={1} />
            </div>
        ),
    },
];

export default function BentoFeatures() {
    return (
        <section className="py-24 bg-white dark:bg-[#020408] transition-colors duration-500">
            <div className="container mx-auto px-4 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
                        Comprehensive Toolset
                    </p>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-950 dark:text-white leading-tight">
                        Everything you need,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-gray-400 dark:from-gray-300 dark:to-gray-500">
                            in one platform.
                        </span>
                    </h2>
                    <p className="mt-5 text-lg text-gray-600 dark:text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        From AI-powered diagnostics to real doctor consultations — MedSage combines cutting-edge technology with healthcare expertise.
                    </p>
                </div>
                <BentoGrid className="auto-rows-[16rem] md:auto-rows-[18rem] lg:grid-cols-3 max-w-6xl mx-auto gap-4 md:gap-6">
                    {features.map((feature) => (
                        <BentoCard key={feature.name} {...feature} />
                    ))}
                </BentoGrid>
            </div>
        </section>
    );
}
