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
 * Adaptador Higgsfield — contrato verificado por búsqueda web (regla de oro
 * 1) contra las SDKs oficiales (github.com/higgsfield-ai/higgsfield-js y
 * higgsfield-client): base URL, header de auth y el endpoint
 * /v1/image2video/dop con polling están confirmados. El endpoint exacto de
 * texto-a-imagen (paso previo para escenas sin frame de referencia) NO está
 * confirmado en documentación pública — el slug por defecto abajo viene de
 * un ejemplo de la SDK y debe verificarse contra el dashboard de Higgsfield
 * antes de producción (HIGGSFIELD_TEXT2IMAGE_MODEL en .env lo sobreescribe).
 */

const BASE_URL = "https://platform.higgsfield.ai";

interface HiggsfieldStatusResponse {
  status: "queued" | "in_progress" | "nsfw" | "failed" | "completed";
  jobs?: { results?: { raw?: { url: string } } }[];
}

export class HiggsfieldProvider implements VideoProvider {
  readonly id = "higgsfield";
  readonly capacidades: CapacidadesProveedor = {
    textToVideo: false, // sin endpoint confirmado; se compone vía texto→imagen→video
    imageToVideo: true, // /v1/image2video/dop — confirmado
    duracionMaxSeg: 10,
    soportaSeed: true,
    formatos: ["9:16", "16:9", "1:1"],
  };

  private authHeader: string;
  /** Sufijo de modelo en /v1/text2image/{modelo}, igual que "dop" en
   * /v1/image2video/dop. "soul" está confirmado en la documentación pública;
   * HIGGSFIELD_TEXT2IMAGE_MODEL lo sobreescribe si cambia. */
  private text2ImageModel: string;

  constructor(keyId: string, keySecret: string, text2ImageModel?: string) {
    this.authHeader = `Key ${keyId}:${keySecret}`;
    this.text2ImageModel = text2ImageModel ?? "soul";
  }

  private async fetchJSON<T>(pathname: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${pathname}`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new Error(
        `Higgsfield ${pathname} respondió ${res.status}: ${detalle.slice(0, 300)}`
      );
    }
    return res.json() as Promise<T>;
  }

  /** Genera (o reutiliza) una imagen de referencia y lanza el image-to-video. */
  async generar(req: SolicitudEscena): Promise<JobId> {
    let imagenUrl = req.imagenReferencia;

    if (!imagenUrl) {
      const t2i = await this.fetchJSON<{
        request_id?: string;
        jobs?: { results?: { raw?: { url: string } } }[];
      }>(`/v1/text2image/${this.text2ImageModel}`, {
        input: {
          prompt: req.prompt,
          negative_prompt: req.negativePrompt,
          aspect_ratio: req.formato,
          ...(req.seed !== undefined ? { seed: req.seed } : {}),
        },
      });
      const url = t2i.jobs?.[0]?.results?.raw?.url;
      if (!url) {
        throw new Error(
          "Higgsfield no devolvió una imagen de referencia (paso texto→imagen)"
        );
      }
      imagenUrl = url;
    }

    const i2v = await this.fetchJSON<{ request_id: string }>(
      "/v1/image2video/dop",
      {
        model: "dop-turbo",
        prompt: req.prompt,
        input_images: [{ type: "image_url", image_url: imagenUrl }],
        aspect_ratio: req.formato,
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
      }
    );
    return i2v.request_id;
  }

  async estado(jobId: JobId): Promise<EstadoJobProveedor> {
    const res = await fetch(`${BASE_URL}/requests/${jobId}/status`, {
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok) throw new Error(`Higgsfield status respondió ${res.status}`);
    const data = (await res.json()) as HiggsfieldStatusResponse;
    switch (data.status) {
      case "queued":
        return "cola";
      case "in_progress":
        return "procesando";
      case "completed":
        return "listo";
      default:
        return "error"; // nsfw | failed
    }
  }

  async descargar(jobId: JobId): Promise<RutaArchivo> {
    const res = await fetch(`${BASE_URL}/requests/${jobId}/status`, {
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok) throw new Error(`Higgsfield status respondió ${res.status}`);
    const data = (await res.json()) as HiggsfieldStatusResponse;
    const url = data.jobs?.[0]?.results?.raw?.url;
    if (!url) throw new Error("Higgsfield no tiene un resultado descargable aún");

    const media = await fetch(url);
    if (!media.ok) throw new Error(`No se pudo descargar el resultado: ${media.status}`);
    const buffer = Buffer.from(await media.arrayBuffer());

    const storageDir = process.env.STORAGE_DIR ?? "./storage";
    const destino = path.join(storageDir, "higgsfield", `${jobId}.mp4`);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, buffer);
    return destino;
  }

  /** Higgsfield no documenta públicamente un endpoint de cuota; se mantiene
   * en provider_quota (tabla) y se refresca manualmente hasta confirmar uno. */
  async cuotaRestante(): Promise<number> {
    return Number(process.env.HIGGSFIELD_CUOTA_ASUMIDA ?? 0);
  }
}

export function crearHiggsfieldProvider(): HiggsfieldProvider | null {
  const raw = process.env.HIGGSFIELD_API_KEY;
  if (!raw) return null;
  const [keyId, keySecret] = raw.split(":");
  if (!keyId || !keySecret) {
    throw new Error(
      'HIGGSFIELD_API_KEY debe tener el formato "KEY_ID:KEY_SECRET"'
    );
  }
  return new HiggsfieldProvider(
    keyId,
    keySecret,
    process.env.HIGGSFIELD_TEXT2IMAGE_MODEL
  );
}
