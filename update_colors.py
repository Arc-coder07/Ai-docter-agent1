import re

file_path = "/Users/amarnadhpb/Desktop/Projects/College Project/Project Code/Med-Github-Clone/Ai-docter-agent/frontend/app/(routes)/dashboard/brain-tumor-analysis/page.tsx"

with open(file_path, 'r') as f:
    content = f.read()

replacements = [
    # Backgrounds
    (r'bg-\[\#0f172a\](?!/)', 'bg-gray-50 dark:bg-[#0a0a0a]'),
    (r'bg-\[\#0f172a\]/50', 'bg-white dark:bg-[#0a0a0a]/50'),
    (r'bg-\[\#0f172a\]/60', 'bg-white dark:bg-white/5'),
    (r'bg-\[\#0f172a\]/40', 'bg-gray-50/50 dark:bg-white/5'),
    (r'bg-\[\#0f172a\]/30', 'bg-gray-50 dark:bg-white/5'),
    (r'bg-\[\#1e293b\]/60', 'bg-white dark:bg-[#111111]'),
    (r'bg-\[\#1e293b\]/80', 'bg-white/90 dark:bg-[#111111]/90'),
    (r'bg-\[\#1e293b\]/90', 'bg-white/90 dark:bg-[#111111]/90'),
    (r'bg-\[\#1e293b\]/50', 'bg-gray-50 dark:bg-white/5'),
    (r'bg-slate-900', 'bg-gray-100 dark:bg-[#0a0a0a]'),
    (r'bg-slate-800/50', 'bg-gray-100 dark:bg-white/5'),
    (r'bg-slate-800/40', 'bg-gray-50 dark:bg-white/5'),
    (r'bg-slate-800/60', 'bg-gray-100 dark:bg-white/5'),
    (r'bg-slate-800', 'bg-gray-100 dark:bg-white/10'),
    (r'bg-slate-700/50', 'bg-gray-200 dark:bg-white/10'),
    
    # Borders
    (r'border-slate-700/50', 'border-gray-200/80 dark:border-white/10'),
    (r'border-slate-700/60', 'border-gray-200/80 dark:border-white/10'),
    (r'border-slate-700/80', 'border-gray-200 dark:border-white/20'),
    (r'border-slate-700', 'border-gray-200 dark:border-white/10'),
    (r'border-slate-800', 'border-gray-100 dark:border-white/5'),
    
    # Text
    (r'text-slate-100', 'text-gray-900 dark:text-white'),
    (r'text-slate-200', 'text-gray-900 dark:text-gray-100'),
    (r'text-slate-300', 'text-gray-600 dark:text-gray-300'),
    (r'text-slate-400', 'text-gray-500 dark:text-gray-400'),
    (r'text-slate-500', 'text-gray-400 dark:text-gray-500'),
    (r'text-slate-600', 'text-gray-400 dark:text-gray-500'),
    
    # Brand Colors
    (r'text-\[\#667eea\]', 'text-blue-600 dark:text-blue-400'),
    (r'bg-\[\#667eea\]/10', 'bg-blue-50 dark:bg-blue-500/10'),
    (r'border-\[\#667eea\]/50', 'border-blue-200 dark:border-blue-500/30'),
    (r'border-\[\#667eea\]/30', 'border-blue-100 dark:border-blue-500/20'),
    (r'border-\[\#667eea\]', 'border-blue-500'),
    (r'from-\[\#667eea\] to-\[\#764ba2\]', 'from-blue-600 to-indigo-600'),
    (r'hover:from-\[\#5a6ed1\] hover:to-\[\#6a4293\]', 'hover:from-blue-700 hover:to-indigo-700'),
    (r'shadow-\[\#667eea\]/20', 'shadow-blue-500/20'),
    (r'bg-\[\#667eea\]', 'bg-blue-600'),
    
    # Shadows and specific design tweaks for Apple-like UI
    (r'shadow-2xl shadow-black/20', 'shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)]'),
    (r'shadow-2xl', 'shadow-[0_2px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.2)]'),
    (r'shadow-lg', 'shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.1)]'),
    (r'rounded-2xl', 'rounded-[20px]'), # softer apple-like radiuses
    (r'rounded-xl', 'rounded-2xl'),
]

for pat, repl in replacements:
    content = re.sub(pat, repl, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Styles updated successfully.")
