'use client';

import { Inbox } from 'lucide-react';
import { ComingSoonModule } from '@/components/admin/ComingSoonModule';

export default function OnboardingPage() {
  return (
    <ComingSoonModule
      icon={Inbox}
      title="Onboarding"
      subtitle="Pipeline de activacion de nuevas empresas."
    />
  );
}
