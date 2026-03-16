"use client"
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useApiClient } from '@/lib/api'
import { useAuth } from '@clerk/nextjs'

/**
 * Client-side guard that checks if the user has completed onboarding.
 * If not, redirects to /onboarding.
 * Wraps all dashboard routes.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const apiClient = useApiClient()
    const { isSignedIn, isLoaded } = useAuth()
    const [checked, setChecked] = useState(false)

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return

        // Skip check if already on doctor registration (onboarding flow)
        if (pathname?.includes('/doctor-portal/register')) {
            setChecked(true)
            return
        }

        const checkOnboarding = async () => {
            try {
                const res = await apiClient('/onboarding/status')
                const data = res.data
                if (!data.onboarded) {
                    router.replace('/onboarding')
                    return
                }
                setChecked(true)
            } catch (err) {
                // If API fails, allow access (don't block user)
                console.error('[OnboardingGuard] Status check failed:', err)
                setChecked(true)
            }
        }

        checkOnboarding()
    }, [isLoaded, isSignedIn, pathname])

    if (!checked) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-3 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </div>
        )
    }

    return <>{children}</>
}
