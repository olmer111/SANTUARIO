import type {
  CapacidadesProveedor,
  JobId,
  RutaArchivo,
  VideoProvider,
} from "@santuario/providers";
import type { EstadoJobProveedor, SolicitudEscena } from "@santuario/shared";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Adaptador fal.ai — segundo proveedor para demostrar fallback real
 * (sección 8: "si un proveedor falla 2 veces o agota cuota, pasa al
 * siguiente automáticamente"). Créditos gratis al registrarse (~$10-20,
 * verificado por búsqueda web en fal.ai/pricing).
 *
 * Contrato verificado contra la documentación pública de fal.ai (cola
 * asíncrona) y los slugs de modelo LTX-Video:
 *   - submit:  POST https://queue.fal.run/{modelo}
 *   - status:  GET  https://queue.fal.run/{modelo}/requests/{id}/status
 *   - result:  GET  https://queue.fal.run/{modelo}/requests/{id}
 *   - auth:    Authorization: Key {FAL_API_KEY}
 * A diferencia de Higgsfield, LTX-Video SÍ tiene texto-a-video directo
 * ("fal-ai/ltx-video"), además de imagen-a-video
 * ("fal-ai/ltx-video/image-to-video") — útil para escenas sin frame de
 * referencia. El nombre exacto del campo de salida (video.url) no se pudo
 * confirmar contra la referencia interactiva (bloqueada por Cloudflare al
 * verificar); el código revisa las formas más comunes y falla con un
 * mensaje claro si no la encuentra, en vez de asumir en silencio.
 */

const BASE_URL = "https://queue.fal.run";

interface FalSubmitResponse {
  request_id: string;
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | string;
}

interface FalResultResponse {
  video?: { url?: string };
  output?: { url?: string };
  url?: string;
}

export class FalProvider implements VideoProvider {
  readonly id = "fal";
  readonly capacidades: CapacidadesProveedor = {
    textToVideo: true, // fal-ai/ltx-video
    imageToVideo: true, // fal-ai/ltx-video/image-to-video
    duracionMaxSeg: 10,
    soportaSeed: true,
    formatos: ["9:16", "16:9", "1:1"],
  };

  private apiKey: string;
  private modeloTextoAVideo: string;
  private modeloImagenAVideo: string;

  constructor(apiKey: string, modeloTextoAVideo?: string, modeloImagenAVideo?: string) {
    this.apiKey = apiKey;
    this.modeloTextoAVideo = modeloTextoAVideo ?? "fal-ai/ltx-video";
    this.modeloImagenAVideo = modeloImagenAVideo ?? "fal-ai/ltx-video/image-to-video";
  }

  private headers() {
    return {
      Authorization: `Key ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /** El jobId codifica el modelo usado (necesario para estado/descarga,
   * que son endpoints por-modelo en fal.ai). */
  private codificarJobId(modelo: string, requestId: string): JobId {
    return `${modelo}::${requestId}`;
  }
  private decodificarJobId(jobId: JobId): { modelo: string; requestId: string } {
    const [modelo, requestId] = jobId.split("::");
    if (!modelo || !requestId) throw new Error(`jobId de fal.ai inválido: ${jobId}`);
    return { modelo, requestId };
  }

  async generar(req: SolicitudEscena): Promise<JobId> {
    const usaImagen = Boolean(req.imagenReferencia);
    const modelo = usaImagen ? this.modeloImagenAVideo : this.modeloTextoAVideo;

    const input: Record<string, unknown> = {
      prompt: req.prompt,
      ...(req.seed !== undefined ? { seed: req.seed } : {}),
      ...(usaImagen ? { image_url: req.imagenReferencia } : {}),
    };

    const res = await fetch(`${BASE_URL}/${modelo}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new Error(`fal.ai ${modelo} respondió ${res.status}: ${detalle.slice(0, 300)}`);
    }
    const data = (await res.json()) as FalSubmitResponse;
    return this.codificarJobId(modelo, data.request_id);
  }

  async estado(jobId: JobId): Promise<EstadoJobProveedor> {
    const { modelo, requestId } = this.decodificarJobId(jobId);
    const res = await fetch(`${BASE_URL}/${modelo}/requests/${requestId}/status`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`fal.ai status respondió ${res.status}`);
    const data = (await res.json()) as FalStatusResponse;
    switch (data.status) {
      case "IN_QUEUE":
        return "cola";
      case "IN_PROGRESS":
        return "procesando";
      case "COMPLETED":
        return "listo";
      default:
        return "error";
    }
  }

  async descargar(jobId: JobId): Promise<RutaArchivo> {
    const { modelo, requestId } = this.decodificarJobId(jobId);
    const res = await fetch(`${BASE_URL}/${modelo}/requests/${requestId}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`fal.ai result respondió ${res.status}`);
    const data = (await res.json()) as FalResultResponse;
    const url = data.video?.url ?? data.output?.url ?? data.url;
    if (!url) {
      throw new Error(
        `fal.ai completó el job pero no se encontró la URL del video en la respuesta (revisar el esquema real de "${modelo}")`
      );
    }

    const media = await fetch(url);
    if (!media.ok) throw new Error(`No se pudo descargar el resultado: ${media.status}`);
    const buffer = Buffer.from(await media.arrayBuffer());

    const storageDir = process.env.STORAGE_DIR ?? "./storage";
    const destino = path.join(storageDir, "fal", `${requestId}.mp4`);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, buffer);
    return destino;
  }

  /** fal.ai no documenta públicamente un endpoint de cuota/créditos
   * restantes vía API; se mantiene en provider_quota hasta confirmar uno. */
  async cuotaRestante(): Promise<number> {
    return Number(process.env.FAL_CUOTA_ASUMIDA ?? 0);
  }
}

export function crearFalProvider(): FalProvider | null {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return null;
  return new FalProvider(
    apiKey,
    process.env.FAL_MODELO_TEXTO_A_VIDEO,
    process.env.FAL_MODELO_IMAGEN_A_VIDEO
  );
}
