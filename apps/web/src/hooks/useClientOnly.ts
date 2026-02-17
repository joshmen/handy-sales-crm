import { useState, useEffect } from 'react';

// Hook que indica si estamos en el cliente (post-hidratación)
// Útil para evitar mismatches de SSR
export const useClientOnly = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};