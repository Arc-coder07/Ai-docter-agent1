"use client";

import Marquee from "@/components/magicui/marquee";
import { cn } from "@/lib/utils";

const techStack = [
    { name: "Next.js", category: "Frontend" },
    { name: "React", category: "Frontend" },
    { name: "TypeScript", category: "Language" },
    { name: "Tailwind CSS", category: "Styling" },
    { name: "FastAPI", category: "Backend" },
    { name: "Python", category: "Language" },
    { name: "LangChain", category: "AI Framework" },
    { name: "LangGraph", category: "AI Framework" },
    { name: "Google Gemini", category: "LLM" },
    { name: "Qdrant", category: "Vector DB" },
    { name: "Supabase", category: "Database" },
    { name: "Clerk", category: "Auth" },
    { name: "WebRTC", category: "Video" },
    { name: "TensorFlow", category: "ML" },
    { name: "VAPI", category: "Voice AI" },
    { name: "Framer Motion", category: "Animation" },
];

const firstRow = techStack.slice(0, Math.ceil(techStack.length / 2));
const secondRow = techStack.slice(Math.ceil(techStack.length / 2));

function TechCard({ name, category }: { name: string; category: string }) {
    return (
        <figure
            className={cn(
                "relative cursor-default overflow-hidden rounded-xl border px-5 py-3",
                "border-gray-950/[.08] bg-gray-950/[.01] hover:bg-gray-950/[.04]",
                "dark:border-gray-50/[.08] dark:bg-gray-50/[.03] dark:hover:bg-gray-50/[.06]",
                "transition-colors duration-200"
            )}
        >
            <div className="flex items-center gap-3">
                <div>
                    <figcaption className="text-sm font-semibold text-gray-900 dark:text-white">
                        {name}
                    </figcaption>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{category}</p>
                </div>
            </div>
        </figure>
    );
}

export default function TechStack() {
    return (
        <section className="py-20 bg-gray-50/50 dark:bg-[#020408] overflow-hidden transition-colors duration-500">
            <div className="container mx-auto px-4 mb-12">
                <div className="text-center">
                    <p className="text-sm font-medium uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                        Built with
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Modern Technology Stack
                    </h2>
                    <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                        Powered by cutting-edge frameworks and AI models for reliable, scalable healthcare technology.
                    </p>
                </div>
            </div>

            <div className="relative flex flex-col gap-4">
                <Marquee className="[--duration:35s]" pauseOnHover>
                    {firstRow.map((tech) => (
                        <TechCard key={tech.name} {...tech} />
                    ))}
                </Marquee>
                <Marquee className="[--duration:35s]" reverse pauseOnHover>
                    {secondRow.map((tech) => (
                        <TechCard key={tech.name} {...tech} />
                    ))}
                </Marquee>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white dark:from-[#020408]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-white dark:from-[#020408]" />
            </div>
        </section>
    );
}
