import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
// import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)'])
// Uncomment for Option 3 (production): enforce doctor role on doctor-portal
// const isDoctorRoute = createRouteMatcher(['/dashboard/doctor-portal(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  // OPTION 3 UPGRADE: Uncomment to enforce doctor role for doctor-portal.
  // For now, the doctor-portal page itself handles the "no profile" case
  // gracefully with a clear error message, making it demo-friendly.
  //
  // if (isDoctorRoute(req)) {
  //   const session = await auth()
  //   const role = (session?.sessionClaims?.publicMetadata as any)?.role
  //   if (role !== 'doctor') {
  //     return NextResponse.redirect(new URL('/dashboard', req.url))
  //   }
  // }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}