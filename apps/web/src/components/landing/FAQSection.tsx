'use client';

import { useState } from 'react';

const faqs = [
  {
    q: '¿Necesito instalar algo?',
    a: 'La plataforma web funciona desde cualquier navegador sin instalar nada, ideal para administradores y gerentes. Para vendedores y supervisores en campo, hay una app móvil disponible en App Store y Google Play.',
  },
  {
    q: '¿Es compatible con facturación SAT / CFDI?',
    a: 'Sí. Contamos con facturación electrónica integrada y administrada desde la misma plataforma, sin necesidad de salir a otro sistema. Solo necesitas tu Certificado de Sello Digital (CSD) para empezar a timbrar.\n\n*Disponible solo para México.',
  },
  {
    q: '¿Puedo migrar mis datos desde otro sistema?',
    a: 'Sí. Puedes importar clientes, productos e inventario desde archivos CSV o Excel. Nuestro equipo te ayuda con la migración sin costo adicional.',
  },
  {
    q: '¿Hay contrato o permanencia mínima?',
    a: 'No. Puedes cancelar cuando quieras. Sin penalizaciones, sin letra chica. Tu información siempre es tuya y puedes exportarla en cualquier momento.',
  },
  {
    q: '¿Funciona sin internet?',
    a: 'Sí. La app móvil permite capturar pedidos, visitas y cobros sin conexión. Todo se sincroniza automáticamente cuando vuelves a tener señal.',
  },
  {
    q: '¿Cuántos usuarios puedo agregar?',
    a: 'Depende del plan. El plan Básico incluye hasta 3 usuarios, Pro hasta 15, y Enterprise es ilimitado. Cada usuario adicional tiene un costo accesible.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-medium text-gray-900 text-[15px] pr-4 group-hover:text-indigo-600 transition-colors">
          {q}
        </span>
        <span
          className={`text-gray-400 text-xl leading-none flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-gray-500 leading-relaxed pb-5 pr-8 whitespace-pre-line">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQSection({ fontClassName }: { fontClassName: string }) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-indigo-600 mb-2">Preguntas frecuentes</p>
          <h2 className={`text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight ${fontClassName}`}>
            ¿Tienes dudas?
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 px-6 divide-y-0">
          {faqs.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
