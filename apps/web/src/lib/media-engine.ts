const BASE_URL = process.env.MEDIA_ENGINE_URL ?? "http://localhost:8001";

export interface Word {
  word: string;
  start: number;
  end: number;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`media-engine ${path} respondió ${res.status}: ${detalle.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export function generarTTS(params: {
  text: string;
  voice: string;
  rate?: string;
  pitch?: string;
  outputName?: string;
}) {
  return postJSON<{ path: string; duracion_seg: number }>("/tts", {
    text: params.text,
    voice: params.voice,
    rate: params.rate ?? "+0%",
    pitch: params.pitch ?? "+0Hz",
    output_name: params.outputName,
  });
}

export function transcribir(audioPath: string, idioma?: string) {
  return postJSON<{ words: Word[]; idioma: string; texto: string }>("/transcribe", {
    audio_path: audioPath,
    idioma,
  });
}

export function renderizarSubtitulos(params: {
  videoPath: string;
  words: Word[];
  preset: string;
  outputName?: string;
  audioPath?: string;
}) {
  return postJSON<{ path: string; preset: string }>("/subtitles/render", {
    video_path: params.videoPath,
    words: params.words,
    preset: params.preset,
    output_name: params.outputName,
    audio_path: params.audioPath,
  });
}

/** Extrae el último frame de una toma — encadenamiento de continuidad
 * (sección 7, regla 2: técnica #1 para no perder el hilo entre tomas). */
export function extraerUltimoFrame(videoPath: string, outputName?: string) {
  return postJSON<{ path: string }>("/frames/last", {
    video_path: videoPath,
    output_name: outputName,
  });
}

/** QA visual: compara la paleta dominante de dos frames (sección 7, regla 5). */
export function compararFrames(frameAPath: string, frameBPath: string) {
  return postJSON<{ paleta_a: string[]; paleta_b: string[]; similitud: number }>(
    "/qa/comparar",
    { frame_a_path: frameAPath, frame_b_path: frameBPath }
  );
}

/** Concatena las tomas finales en el video del proyecto (sección 6, paso 9). */
export function concatenarTomas(videoPaths: string[], outputName?: string) {
  return postJSON<{ path: string }>("/render/concat", {
    video_paths: videoPaths,
    output_name: outputName,
    normalizar_loudness: true,
  });
}
