"use client";

import { motion } from "framer-motion";
import { Brain, HeartPulse, Stethoscope, Dna, Activity, ScanLine } from "lucide-react";

const capabilities = [
  {
    id: "01",
    icon: Brain,
    title: "Neurological Diagnostics",
    description: "Advanced classification of MRI scans using multi-modal AI to detect anomalies with sub-millimeter precision. Integrates Explainable AI to highlight regions of interest.",
    color: "text-indigo-500",
  },
  {
    id: "02",
    icon: Activity,
    title: "Radiology & Imaging",
    description: "Automated analysis of Chest X-rays for pneumonia, COVID-19, and other pulmonary conditions, delivering confidence scores within seconds.",
    color: "text-blue-500",
  },
  {
    id: "03",
    icon: Stethoscope,
    title: "Clinical Triage",
    description: "A continuous conversational agent that assesses symptoms, categorizes urgency, and recommends the appropriate care pathway before you see a doctor.",
    color: "text-teal-500",
  },
  {
    id: "04",
    icon: Dna,
    title: "Genomic Profiling",
    description: "Synthesizing patient history and lab reports into a comprehensive profile, enabling highly personalized treatment recommendations.",
    color: "text-purple-500",
  },
];

export default function Capabilities() {
  return (
    <section id="capabilities" className="py-32 bg-white dark:bg-[#020408] relative overflow-hidden transition-colors duration-500">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-8 items-start">
          
          {/* Sticky Header Section */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-100px" }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-[1px] bg-black dark:bg-white" />
                <span className="text-sm font-semibold uppercase tracking-widest text-gray-900 dark:text-white">Core Capabilities</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-gray-950 dark:text-white leading-[1.1]">
                Intelligence that adapts to every medical scenario.
              </h2>
              
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md leading-relaxed font-medium">
                Our suite of specialized agents handles everything from initial symptom assessment to deep radiological analysis, working in tandem to provide a holistic view of patient health.
              </p>
            </motion.div>
          </div>

          {/* Scrolling Capabilities List */}
          <div className="lg:col-span-7 flex flex-col gap-8 md:gap-12 lg:pt-24">
            {capabilities.map((cap, index) => (
              <motion.div
                key={cap.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, margin: "-100px" }}
                className="group relative flex flex-col sm:flex-row gap-6 p-8 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <cap.icon className={`w-8 h-8 ${cap.color}`} strokeWidth={1.5} />
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 mb-2 font-mono">{cap.id}</span>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                    {cap.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    {cap.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
