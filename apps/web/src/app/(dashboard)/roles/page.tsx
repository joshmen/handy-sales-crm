'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RolesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/team?tab=roles');
  }, [router]);
  return null;
}
