'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MovementsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/inventory?tab=movimientos');
  }, [router]);
  return null;
}
