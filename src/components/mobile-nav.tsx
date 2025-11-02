"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface MobileNavProps {
  isAdmin: boolean
  signOutAction: () => void
}

export function MobileNav({ isAdmin, signOutAction }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const navLinks = [
    { href: '/builder', label: 'PRD Builder' },
    { href: '/library', label: 'PRD Library' },
    { href: '/ai-builder', label: 'AI Builder' },
    { href: '/ai-instructions', label: 'AI Library' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/billing', label: 'Billing' },
    ...(isAdmin ? [{ href: '/admin/billing', label: 'Admin' }] : []),
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle className="text-left">PRD Builder Pro</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-base font-medium hover:text-primary transition-colors py-2"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t pt-4 mt-4 flex flex-col gap-3">
            <Link href="/account" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start" size="sm">
                Account
              </Button>
            </Link>
            <form action={signOutAction}>
              <Button variant="outline" className="w-full" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
