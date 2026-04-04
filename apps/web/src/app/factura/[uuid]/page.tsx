import { Metadata } from 'next';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────

interface FacturaPublicData {
  uuid: string | null;
  serie: string | null;
  folio: number;
  fechaEmision: string;
  fechaTimbrado: string | null;
  emisorRfc: string;
  emisorNombre: string;
  receptorRfc: string;
  receptorNombre: string;
  total: number;
  moneda: string;
  estado: string;
  pdfUrl: string | null;
  xmlUrl: string | null;
}

// ─── Metadata ─────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Factura Electrónica — Handy Suites®',
  description: 'Descarga tu factura electrónica (CFDI) en formato PDF y XML.',
  robots: { index: false, follow: false },
};

// ─── Data fetching ────────────────────────────────────────────────────

const BILLING_API_URL =
  process.env.BILLING_API_URL ||
  process.env.NEXT_PUBLIC_BILLING_API_URL ||
  'http://localhost:1051';

async function getFactura(uuid: string): Promise<FacturaPublicData | null> {
  try {
    const res = await fetch(`${BILLING_API_URL}/api/facturas/public/${uuid}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ estado }: { estado: string }) {
  const isTimbrada = estado === 'TIMBRADA';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
        isTimbrada
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      <span
        className={`mr-1.5 h-2 w-2 rounded-full ${
          isTimbrada ? 'bg-green-500' : 'bg-yellow-500'
        }`}
      />
      {isTimbrada ? 'Timbrada' : 'Pendiente'}
    </span>
  );
}

// ─── Page Component ───────────────────────────────────────────────────

export default async function FacturaPublicPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const factura = await getFactura(uuid);

  // Not found
  if (!factura) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Factura no encontrada</h1>
          <p className="mt-2 text-gray-600">
            El folio fiscal no existe o ha sido eliminado. Verifica el enlace e intenta de nuevo.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </main>
    );
  }

  const isTimbrada = factura.estado === 'TIMBRADA';
  const folioDisplay = [factura.serie, factura.folio].filter(Boolean).join('-');

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">{factura.emisorNombre}</h2>
          <p className="text-sm text-gray-500">RFC: {factura.emisorRfc}</p>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Factura Electrónica</h1>
          {folioDisplay && (
            <p className="mt-1 text-sm text-gray-500">Folio: {folioDisplay}</p>
          )}
        </div>

        {/* Card */}
        <div className="mt-6 rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          {/* Status */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <span className="text-sm font-medium text-gray-500">Estado</span>
            <StatusBadge estado={factura.estado} />
          </div>

          {/* Folio fiscal */}
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Folio Fiscal (UUID)</p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">{factura.uuid}</p>
          </div>

          {/* Emisor */}
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Emisor</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{factura.emisorNombre}</p>
            <p className="text-sm text-gray-600">RFC: {factura.emisorRfc}</p>
          </div>

          {/* Receptor */}
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Receptor</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{factura.receptorNombre}</p>
            <p className="text-sm text-gray-600">RFC: {factura.receptorRfc}</p>
          </div>

          {/* Fecha & Total */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            <div className="border-r border-gray-100 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Fecha</p>
              <p className="mt-1 text-sm text-gray-900">{formatDate(factura.fechaEmision)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Total</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {formatCurrency(factura.total, factura.moneda)}
              </p>
            </div>
          </div>

          {/* Download buttons or pending message */}
          <div className="px-5 py-5">
            {isTimbrada ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                {factura.pdfUrl && (
                  <a
                    href={factura.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Descargar PDF
                  </a>
                )}
                {factura.xmlUrl && (
                  <a
                    href={factura.xmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    Descargar XML
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-yellow-50 p-4 text-center">
                <p className="text-sm text-yellow-800">
                  Tu factura esta siendo procesada, intenta de nuevo en unos minutos.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>&copy; {new Date().getFullYear()} Handy Suites&reg; &mdash; Todos los derechos reservados</p>
          <Link href="/" className="mt-1 inline-block text-green-600 hover:underline">
            handysuites.com
          </Link>
        </div>
      </div>
    </main>
  );
}
