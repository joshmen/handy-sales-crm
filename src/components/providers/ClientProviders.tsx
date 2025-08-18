"use client"

import { AuthProvider } from "./AuthProvider"
import { AppProvider } from "@/context/AppContext"
import { UIProvider } from "@/context/UIContext"
import { Toaster } from '@/components/ui'
import { HydrationProvider } from "./HydrationProvider"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HydrationProvider>
        <AppProvider>
          <UIProvider>
            {children}
            <Toaster />
          </UIProvider>
        </AppProvider>
      </HydrationProvider>
    </AuthProvider>
  )
}
