"use client";

import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

export default function CtaSection() {
    const { user } = useUser();

    return (
        <section className="py-24 bg-white dark:bg-[#020408] transition-colors duration-500">
            <div className="container mx-auto px-4">
                <motion.div
                    className="relative overflow-hidden rounded-3xl bg-gray-950 dark:bg-white/[0.03] dark:border dark:border-white/10 p-12 md:p-20 text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 dark:from-blue-600/10 dark:via-purple-600/10 dark:to-pink-600/10" />

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white dark:text-white mb-4">
                            Ready to experience{" "}
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                MedSage?
                            </span>
                        </h2>
                        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
                            Start your AI-powered healthcare journey today. Free to get started, powerful enough for any medical need.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href={user ? "/dashboard" : "/sign-up"}
                                className={cn(
                                    buttonVariants({ size: "lg" }),
                                    "h-14 px-8 rounded-full text-base font-medium gap-2 bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
                                )}
                            >
                                {user ? "Go to Dashboard" : "Get Started Free"}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
