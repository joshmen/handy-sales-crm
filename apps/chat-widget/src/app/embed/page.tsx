'use client';

import { useEffect } from 'react';
import { ChatWidget } from '@/components/ChatWidget';

/**
 * Ruta del widget para embeber por iframe (la carga embed.js). Fondo transparente
 * para que solo se vea la burbuja/panel; el tamano del iframe lo controla el loader
 * via postMessage segun abierto/cerrado.
 */
export default function EmbedPage() {
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
  }, []);

  return <ChatWidget embed />;
}
