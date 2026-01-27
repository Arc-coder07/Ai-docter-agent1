"use client";

import { Icons } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

export default function Header() {
  const [addBorder, setAddBorder] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setAddBorder(true);
      } else {
        setAddBorder(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-50 py-2 bg-background/60 backdrop-blur px-2 sm:px-4"
      }
    >
      <div className="flex justify-between items-center container">
        <Link
          href="/"
          title="brand-logo"
          className="relative mr-6 flex items-center space-x-2 px-0 sm:pl-20"
        >
          {/* <Icons.logo className="w-auto h-[40px]" /> */}
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden lg:block">
          <div className="flex items-center">
            <div className="gap-2 flex">
              
              {/* Option 1: User IS Logged In */}
              <SignedIn>
                <Link
                  href="/dashboard"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Dashboard
                </Link>
                <UserButton />
              </SignedIn>

              {/* Option 2: User IS NOT Logged In */}
              <SignedOut>
                <Link
                  href="/sign-in"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "w-full sm:w-auto text-background"
                  )}
                >
                  Start a Consultation
                </Link>
              </SignedOut>

            </div>
          </div>
        </div>

        {/* MOBILE MENU */}
        <div className="mt-2 cursor-pointer block lg:hidden">
          <div className="flex items-center gap-4">
            
            <SignedIn>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline" })}
              >
                Dashboard
              </Link>
              <UserButton />
            </SignedIn>

            <SignedOut>
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "outline" })}
              >
                Login
              </Link>
            </SignedOut>

          </div>
        </div>
      </div>
      <hr
        className={cn(
          "absolute w-full bottom-0 transition-opacity duration-300 ease-in-out",
          addBorder ? "opacity-100" : "opacity-0"
        )}
      />
    </header>
  );
}