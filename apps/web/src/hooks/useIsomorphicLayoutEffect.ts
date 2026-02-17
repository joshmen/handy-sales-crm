import { useEffect, useLayoutEffect } from 'react';

// Hook que usa useLayoutEffect en el cliente y useEffect en el servidor
// Esto evita warnings de hidratación
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;