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
