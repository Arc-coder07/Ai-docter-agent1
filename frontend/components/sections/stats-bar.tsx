"use client";

import { motion } from "framer-motion";
import { Bot, Brain, Activity, Shield } from "lucide-react";

const stats = [
  { value: "8+", label: "Specialized Agents", icon: Bot },
  { value: "Multi-Modal", label: "Diagnostic capability", icon: Brain },
  { value: "<200ms", label: "Analysis latency", icon: Activity },
  { value: "HIPAA", label: "Compliance ready", icon: Shield },
];

export default function StatsBar() {
  return (
    <section className="relative py-12 bg-white dark:bg-[#020408] border-y border-gray-100 dark:border-white/[0.05] z-20">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 divide-x divide-gray-100 dark:divide-white/[0.05]">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="flex flex-col items-center lg:items-start text-center lg:text-left px-4 lg:px-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-50px" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
                  {stat.label}
                </span>
              </div>
              <span className="text-3xl md:text-4xl font-bold tracking-tighter text-gray-900 dark:text-white">
                {stat.value}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
