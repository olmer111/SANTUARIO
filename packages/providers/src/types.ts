import type {
  EstadoJobProveedor,
  Formato,
  SolicitudEscena,
} from "@santuario/shared";

export type JobId = string;
export type RutaArchivo = string;

export interface CapacidadesProveedor {
  textToVideo: boolean;
  /** Clave para la continuidad por encadenamiento de último frame. */
  imageToVideo: boolean;
  duracionMaxSeg: number;
  soportaSeed: boolean;
  formatos: Formato[];
}

/**
 * Interfaz común que TODO proveedor de video implementa (sección 8).
 * Los adaptadores concretos (Higgsfield, fal.ai, Replicate…) llegan en Fase 2,
 * cada uno tras verificar con búsqueda web su free tier vigente.
 */
export interface VideoProvider {
  id: string;
  capacidades: CapacidadesProveedor;
  generar(req: SolicitudEscena): Promise<JobId>;
  estado(jobId: JobId): Promise<EstadoJobProveedor>;
  descargar(jobId: JobId): Promise<RutaArchivo>;
  cuotaRestante(): Promise<number>;
}
