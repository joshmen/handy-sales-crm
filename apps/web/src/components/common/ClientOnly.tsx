'use client';

import { useClientOnly } from '@/hooks/useClientOnly';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente que solo renderiza en el cliente después de la hidratación
 * Útil para evitar errores de hidratación con elementos que dependen de localStorage
 * o que pueden ser modificados por extensiones del navegador
 */
export const ClientOnly: React.FC<ClientOnlyProps> = ({ 
  children, 
  fallback = null 
}) => {
  const isClient = useClientOnly();

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};