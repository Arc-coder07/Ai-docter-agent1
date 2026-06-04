"use client";

import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

// WebGL/Canvas-like background effect using pure CSS and framer-motion for performance
function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dynamic gradient mesh */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[100px] opacity-40 mix-blend-screen"
        animate={{
          x: mousePosition.x - 400,
          y: mousePosition.y - 400,
        }}
        transition={{ type: "spring", bounce: 0, duration: 2 }}
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-30 mix-blend-screen"
        animate={{
          x: mousePosition.x - 100,
          y: mousePosition.y - 300,
        }}
        transition={{ type: "spring", bounce: 0, duration: 4 }}
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
      {/* Base grid and static mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-100 via-white to-white dark:from-[#050b14] dark:via-[#020408] dark:to-[#020408]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
    </div>
  );
}

function HeroPill() {
  return (
    <motion.div
      className="relative flex w-auto items-center space-x-2 rounded-full bg-white/50 dark:bg-white/5 px-4 py-1.5 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-8 overflow-hidden group"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
      <div className="flex items-center justify-center gap-1.5 relative z-10">
        <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
        <span className="text-sm font-medium tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
          Introducing MedSage AI
        </span>
      </div>
    </motion.div>
  );
}

function HeroTitles() {
  return (
    <div className="flex w-full max-w-[800px] flex-col space-y-6 items-center text-center relative z-10">
      <motion.h1
        className="text-5xl font-semibold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl text-gray-950 dark:text-white leading-[1.1]"
        initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        Your intelligence. <br className="hidden sm:block" />
        <span className="relative inline-block">
          <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-2xl opacity-20 dark:opacity-30 mix-blend-screen" />
          <span className="relative bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
            Amplified.
          </span>
        </span>
      </motion.h1>

      <motion.p
        className="max-w-[600px] text-lg sm:text-xl font-medium tracking-tight text-gray-600 dark:text-gray-400 leading-relaxed text-balance"
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
      className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full relative z-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={user ? "/dashboard" : "/sign-up"}
        className={cn(
          buttonVariants({ size: "lg" }),
          "group relative h-14 px-8 rounded-full text-base font-medium overflow-hidden transition-all duration-300 gap-2 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_0_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        )}
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        <span className="relative flex items-center gap-2">
          {user ? "Go to Dashboard" : "Start your trial"}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </span>
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

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500">
      <AnimatedBackground />

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 md:px-6 py-20">
        <HeroPill />
        <HeroTitles />
        <HeroCTA />
      </div>
    </section>
  );
}