export interface IntegrationCatalog {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  categoria: string;
  tipoPrecio: string; // PERMANENTE, MENSUAL, GRATIS
  precioMXN: number;
  estado: string; // DISPONIBLE, PROXIMO, DESCONTINUADO
  isActivated: boolean;
  fechaActivacion: string | null;
}

export interface TenantIntegration {
  id: number;
  integrationId: number;
  slug: string;
  nombre: string;
  icono: string | null;
  estado: string;
  fechaActivacion: string;
  configuracion: string | null;
}
