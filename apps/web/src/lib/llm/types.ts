export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Pide al modelo que responda únicamente con un objeto JSON. */
  jsonMode?: boolean;
}

/** Todo proveedor de LLM (cerebro de agentes) implementa esto. */
export interface LLMProvider {
  id: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}
