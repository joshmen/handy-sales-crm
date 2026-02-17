"use client"

import { AuthProvider } from "./AuthProvider"
import { AppProvider } from "@/context/AppContext"
import { UIProvider } from "@/context/UIContext"
import { GlobalSettingsProvider } from "@/contexts/GlobalSettingsContext"
import { CompanyProvider } from "@/contexts/CompanyContext"
import { ProfileProvider } from "@/contexts/ProfileContext"
import { LoadingProvider } from "@/contexts/LoadingContext"
import { Toaster } from "sonner"
import { GlobalLoadingIndicator } from "@/components/ui/GlobalLoadingIndicator"
import { HydrationProvider } from "./HydrationProvider"
import NextTopLoader from "nextjs-toploader"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HydrationProvider>
        <NextTopLoader
          color="#14B8A6"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #14B8A6,0 0 5px #14B8A6"
        />
        <LoadingProvider>
          <GlobalSettingsProvider>
            <CompanyProvider>
              <ProfileProvider>
                <AppProvider>
                  <UIProvider>
                    {children}
                    <Toaster richColors position="top-right" toastOptions={{ duration: 4000 }} />
                    <GlobalLoadingIndicator />
                  </UIProvider>
                </AppProvider>
              </ProfileProvider>
            </CompanyProvider>
          </GlobalSettingsProvider>
        </LoadingProvider>
      </HydrationProvider>
    </AuthProvider>
  )
}
