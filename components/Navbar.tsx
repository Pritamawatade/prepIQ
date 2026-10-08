"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "./toggle-theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/upload", label: "Library" },
  { href: "/query", label: "Reading room" },
  { href: "/history", label: "Notes" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="page-width flex h-[68px] items-center justify-between gap-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-baseline gap-2 rounded-md" aria-label="DocWise home">
            <span className="font-display text-[1.45rem] font-semibold leading-none">DocWise</span>
            <span className="hidden text-[0.8rem] text-muted-foreground sm:inline">a reading room</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label }) => {
              const active = pathname === href || (href === "/query" && pathname.startsWith("/query/"));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-[0.92rem] transition-colors",
                    active ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ModeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm" className="hidden sm:inline-flex">Sign in</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={isMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}>
            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <nav aria-label="Mobile navigation" className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="mx-auto grid max-w-6xl gap-1">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setIsMenuOpen(false)} className="flex min-h-11 items-center rounded-md px-3 text-[0.95rem] hover:bg-muted">
                {label}
              </Link>
            ))}
            <SignedOut><SignInButton mode="modal"><button className="min-h-11 rounded-md px-3 text-left text-[0.95rem] hover:bg-muted">Sign in</button></SignInButton></SignedOut>
          </div>
        </nav>
      )}
    </header>
  );
}
