'use client';

import { useCallback, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCompany } from '@/contexts/CompanyContext';
import { datosEmpresaService } from '@/services/api/datosEmpresa';
import type { DatosEmpresa } from '@/types/datosEmpresa';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFormatDate } from '@/lib/formatters';

// ─── Types ──────────────────────────────────────────────────────

export interface ReportExportConfig {
  /** File name without extension */
  fileName: string;
  /** Report title displayed in PDF */
  title: string;
  /** Date range filter applied */
  dateRange?: { desde: string; hasta: string };
  /** KPI cards to render natively */
  kpis?: Array<{ label: string; value: string | number }>;
  /** Ref to chart DOM element for screenshot capture */
  chartRef?: React.RefObject<HTMLElement | null>;
  /** Table data rendered natively via jspdf-autotable */
  table?: {
    headers: string[];
    rows: (string | number)[][];
    footerRow?: (string | number)[];
  };
  /** Fallback: screenshot entire element (for DashboardEjecutivo) */
  fallbackRef?: React.RefObject<HTMLElement | null>;
}

// ─── Constants ──────────────────────────────────────────────────

const DEFAULT_PRIMARY = '#16a34a';
const MARGIN = 12;
const HEADER_H = 30;
const FOOTER_H = 10;
const TITLE_BAR_H = 11;

// ─── Helpers ────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function fmtDateEs(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return libFormatDate(d, null, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

async function loadImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Cache ──────────────────────────────────────────────────────

const TTL = 5 * 60_000;

// ─── Hook ───────────────────────────────────────────────────────

export function useReportExport(config: ReportExportConfig) {
  const { formatDate, formatCurrency } = useFormatters();
  const [exporting, setExporting] = useState(false);
  const { settings } = useCompany();
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const datosRef = useRef<DatosEmpresa | null>(null);
  const logo64Ref = useRef<string | null>(null);
  const cacheAtRef = useRef(0);

  const exportPDF = useCallback(async () => {
    setExporting(true);
    const cfg = cfgRef.current;

    try {
      // ── Fetch company data ────────────────────────────────
      const now = Date.now();
      if (!datosRef.current || now - cacheAtRef.current > TTL) {
        try { datosRef.current = await datosEmpresaService.get(); cacheAtRef.current = now; } catch { /* noop */ }
      }
      const logoUrl = settings?.companyLogo;
      if (logoUrl && (!logo64Ref.current || now - cacheAtRef.current > TTL)) {
        logo64Ref.current = await loadImageBase64(logoUrl);
      }

      const primary = settings?.companyPrimaryColor || DEFAULT_PRIMARY;
      const [pr, pg, pb] = hexToRgb(primary);
      const name = datosRef.current?.razonSocial || settings?.companyName || '';

      // ── Create PDF (Landscape A4) ─────────────────────────
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const cw = pw - MARGIN * 2;
      let y = MARGIN;

      // ── HEADER (reusable) ─────────────────────────────────
      const drawHeader = () => {
        let lx = MARGIN;

        if (logo64Ref.current) {
          try { pdf.addImage(logo64Ref.current, 'PNG', MARGIN, MARGIN, 18, 18); lx = MARGIN + 22; } catch { /* noop */ }
        }

        // Company name
        pdf.setFont('helvetica', 'bold').setFontSize(13).setTextColor(30, 30, 30);
        pdf.text(name, lx, MARGIN + 6);

        // Details
        pdf.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(110, 110, 110);
        let sy = MARGIN + 11;

        if (datosRef.current?.identificadorFiscal) { pdf.text(`ID Fiscal: ${datosRef.current.identificadorFiscal}`, lx, sy); sy += 3.5; }

        const addr = [datosRef.current?.direccion, datosRef.current?.ciudad, datosRef.current?.estado, datosRef.current?.codigoPostal].filter(Boolean);
        if (addr.length) { pdf.text(addr.join(', '), lx, sy); sy += 3.5; }

        const contact = [datosRef.current?.telefono ? `Tel: ${datosRef.current.telefono}` : null, datosRef.current?.email].filter(Boolean);
        if (contact.length) { pdf.text(contact.join(' · '), lx, sy); }

        // Colored divider
        pdf.setDrawColor(pr, pg, pb).setLineWidth(0.7);
        pdf.line(MARGIN, MARGIN + HEADER_H, pw - MARGIN, MARGIN + HEADER_H);
      };

      drawHeader();
      y = MARGIN + HEADER_H + 3;

      // ── TITLE BAR ─────────────────────────────────────────
      pdf.setFillColor(pr, pg, pb);
      pdf.roundedRect(MARGIN, y, cw, TITLE_BAR_H, 1.5, 1.5, 'F');

      pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(255, 255, 255);
      pdf.text(cfg.title.toUpperCase(), MARGIN + 4, y + 7.5);

      if (cfg.dateRange) {
        pdf.setFont('helvetica', 'normal').setFontSize(8.5);
        pdf.text(
          `${fmtDateEs(cfg.dateRange.desde)} — ${fmtDateEs(cfg.dateRange.hasta)}`,
          pw - MARGIN - 4, y + 7.5, { align: 'right' }
        );
      }
      y += TITLE_BAR_H + 5;

      // ── KPI CARDS ─────────────────────────────────────────
      if (cfg.kpis?.length) {
        const gap = 4;
        const kw = (cw - gap * (cfg.kpis.length - 1)) / cfg.kpis.length;
        const kh = 17;

        cfg.kpis.forEach((kpi, i) => {
          const kx = MARGIN + i * (kw + gap);

          // Light bg
          pdf.setFillColor(pr, pg, pb);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdf.setGState(new (pdf as any).GState({ opacity: 0.07 }));
          pdf.roundedRect(kx, y, kw, kh, 1.5, 1.5, 'F');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

          // Border
          pdf.setDrawColor(pr, pg, pb).setLineWidth(0.25);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdf.setGState(new (pdf as any).GState({ opacity: 0.25 }));
          pdf.roundedRect(kx, y, kw, kh, 1.5, 1.5, 'S');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

          // Value
          pdf.setFont('helvetica', 'bold').setFontSize(13).setTextColor(30, 30, 30);
          pdf.text(String(kpi.value), kx + kw / 2, y + 8.5, { align: 'center' });

          // Label
          pdf.setFont('helvetica', 'normal').setFontSize(7).setTextColor(110, 110, 110);
          pdf.text(kpi.label, kx + kw / 2, y + 14, { align: 'center' });
        });

        y += kh + 5;
      }

      // ── CHART ─────────────────────────────────────────────
      if (cfg.chartRef?.current) {
        try {
          const canvas = await html2canvas(cfg.chartRef.current, {
            scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
          });
          const imgData = canvas.toDataURL('image/png');
          const ratio = canvas.height / canvas.width;
          let imgW = cw;
          let imgH = imgW * ratio;
          const maxH = 65;
          if (imgH > maxH) { imgH = maxH; imgW = imgH / ratio; }

          if (y + imgH > ph - MARGIN - FOOTER_H) {
            drawFooterOnPage(pdf, pw, ph, primary);
            pdf.addPage();
            drawHeader();
            y = MARGIN + HEADER_H + 3;
          }

          pdf.addImage(imgData, 'PNG', MARGIN + (cw - imgW) / 2, y, imgW, imgH);
          y += imgH + 5;
        } catch { /* chart capture failed */ }
      }

      // ── TABLE ─────────────────────────────────────────────
      if (cfg.table) {
        if (y > ph - MARGIN - FOOTER_H - 15) {
          drawFooterOnPage(pdf, pw, ph, primary);
          pdf.addPage();
          drawHeader();
          y = MARGIN + HEADER_H + 3;
        }

        autoTable(pdf, {
          startY: y,
          head: [cfg.table.headers],
          body: cfg.table.rows.map(r => r.map(String)),
          foot: cfg.table.footerRow ? [cfg.table.footerRow.map(String)] : undefined,
          margin: { left: MARGIN, right: MARGIN },
          styles: { fontSize: 7.5, cellPadding: 2, lineColor: [230, 230, 230], lineWidth: 0.15 },
          headStyles: { fillColor: [pr, pg, pb], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
          footStyles: { fillColor: [242, 242, 242], textColor: [30, 30, 30], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [249, 249, 249] },
          didDrawPage: () => { drawHeader(); },
        });
      }

      // ── FALLBACK (screenshot) ─────────────────────────────
      if (!cfg.table && !cfg.chartRef?.current && cfg.fallbackRef?.current) {
        const canvas = await html2canvas(cfg.fallbackRef.current, {
          scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        const ratio = canvas.height / canvas.width;
        const imgW = cw;
        const imgH = imgW * ratio;
        const avail = ph - y - MARGIN - FOOTER_H;
        if (imgH <= avail) {
          pdf.addImage(imgData, 'PNG', MARGIN, y, imgW, imgH);
        } else {
          const s = avail / imgH;
          pdf.addImage(imgData, 'PNG', MARGIN, y, imgW * s, avail);
        }
      }

      // ── FOOTER on every page ──────────────────────────────
      const total = pdf.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        pdf.setPage(p);
        drawFooterOnPage(pdf, pw, ph, primary, p, total);
      }

      pdf.save(`${cfg.fileName}.pdf`);
    } finally {
      setExporting(false);
    }
  }, [settings]);

  return { exportPDF, exporting };
}

// ─── Footer ─────────────────────────────────────────────────────

function drawFooterOnPage(pdf: jsPDF, pw: number, ph: number, color: string, page?: number, total?: number) {
  const fy = ph - MARGIN + 2;
  const [r, g, b] = hexToRgb(color);

  pdf.setDrawColor(r, g, b).setLineWidth(0.3);
  pdf.line(MARGIN, fy - 4, pw - MARGIN, fy - 4);

  pdf.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(160, 160, 160);
  pdf.text('Confidencial — Solo uso interno', MARGIN, fy);

  const gen = libFormatDate(new Date(), null, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  pdf.text(`Generado: ${gen}`, pw / 2, fy, { align: 'center' });

  if (page && total) {
    pdf.text(`Pág ${page} de ${total}`, pw - MARGIN, fy, { align: 'right' });
  }
}
