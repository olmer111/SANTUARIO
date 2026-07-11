import type { ChatMessage, ChatOptions, LLMProvider } from "../types";

/**
 * Anthropic — alternativa de mayor calidad (de pago) para partes críticas
 * del pipeline, si el usuario decide activarla (ANTHROPIC_API_KEY en .env).
 */
export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic";
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.anthropic.com/v1";

  constructor(apiKey: string, model = "claude-sonnet-5") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const sistema = messages.find((m) => m.role === "system")?.content;
    const resto = messages.filter((m) => m.role !== "system");

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        system: sistema,
        messages: resto,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.4,
      }),
    });

    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new Error(
        `Anthropic respondió ${res.status}: ${detalle.slice(0, 300)}`
      );
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const contenido = data.content?.find((b) => b.type === "text")?.text;
    if (!contenido) throw new Error("Anthropic devolvió una respuesta vacía");
    return contenido;
  }
}
