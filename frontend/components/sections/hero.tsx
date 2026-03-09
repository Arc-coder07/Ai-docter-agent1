"use client";

import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, Sparkles } from "lucide-react";

function HeroPill() {
  return (
    <motion.div
      className="flex w-auto items-center space-x-2 rounded-full bg-white/5 px-4 py-1.5 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-8"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-medium tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          Introducing MedSage AI
        </span>
      </div>
    </motion.div>
  );
}

function HeroTitles() {
  return (
    <div className="flex w-full max-w-[800px] flex-col space-y-6 items-center text-center">
      <motion.h1
        className="text-5xl font-semibold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl text-gray-950 dark:text-gray-50 leading-[1.1]"
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        Your intelligence. <br className="hidden sm:block" />
        <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
          Amplified.
        </span>
      </motion.h1>

      <motion.p
        className="max-w-[600px] text-lg sm:text-xl font-medium tracking-tight text-gray-500 dark:text-gray-400 leading-relaxed text-balance"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.4,
          duration: 1,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        Experience a breakthrough in medical assistance. Powerful agents designed to seamlessly integrate with your workflow, making every diagnosis clearer and faster.
      </motion.p>
    </div>
  );
}

function HeroCTA() {
  const { user } = useUser();

  return (
    <motion.div
      className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={user ? "/dashboard" : "/sign-up"}
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-14 px-8 rounded-full text-base font-medium shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_0_rgba(0,0,0,0.15)] transition-all duration-300 gap-2 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        )}
      >
        {user ? "Go to Dashboard" : "Start your trial"}
        <ArrowRight className="w-4 h-4" />
      </Link>

      <Link
        href="/about"
        className={cn(
          buttonVariants({ variant: "ghost", size: "lg" }),
          "h-14 px-8 rounded-full text-base font-medium tracking-tight hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        )}
      >
        Learn more
      </Link>
    </motion.div>
  );
}

export default function Hero2() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-[#0a0a0a]">
      {/* Subtle background gradient / glow */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-100 via-white to-white dark:from-[#1a1a1a] dark:via-[#0a0a0a] dark:to-[#0a0a0a] opacity-60" />

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 md:px-6 py-20">
        <HeroPill />
        <HeroTitles />
        <HeroCTA />
      </div>
    </section>
  );
}