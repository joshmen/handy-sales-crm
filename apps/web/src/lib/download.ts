// Descarga robusta de archivos en el navegador.
//
// Bug (2026-06-23): los exports (PDF/Excel/CSV/XML/ZIP) bajaban SIN extensión en
// Chrome real → Windows preguntaba con qué programa abrirlos. Causa: el patrón
// `a.click()` seguido de `URL.revokeObjectURL(url)` SÍNCRONO e inmediato. Chrome
// procesa la descarga de forma async; si el object URL se revoca antes de que el
// navegador lea el blob y aplique el nombre del atributo `download`, guarda con un
// nombre fallback sin extensión. (Playwright lo intercepta síncrono, por eso el
// smoke pasaba.) El fix estándar — el mismo que usa file-saver — difiere el revoke.
//
// Fuente de verdad ÚNICA: todos los sitios de descarga del web app deben usar
// estas funciones en lugar de crear su propio `<a download>`.

/** ms a esperar antes de liberar el object URL (Chrome async necesita leer el blob). */
const REVOKE_DELAY_MS = 2000;

/**
 * Dispara la descarga de un Blob con el nombre (y extensión) indicados.
 * Difiere `remove()` + `revokeObjectURL()` para no truncar el nombre en Chrome.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Cleanup diferido: NO revocar de inmediato (rompe el nombre/extensión en Chrome).
  setTimeout(() => {
    try { a.remove(); } catch { /* noop */ }
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
}

/**
 * Conveniencia: arma un Blob de texto/contenido y lo descarga.
 * Ej: downloadTextFile(csv, 'clientes.csv', 'text/csv;charset=utf-8;').
 */
export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}
