'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <BrandedLoadingScreen />;
  }

  if (!session) {
    return <BrandedLoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  );
}
