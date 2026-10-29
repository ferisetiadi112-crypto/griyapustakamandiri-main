/**
 * AI Provider Abstraction
 *
 * Decouples the AI Brain from any specific AI provider.
 * Supports multiple providers; free/local options first.
 *
 * If no AI API key is configured, the system reports:
 * AI_STATUS = NOT_CONFIGURED
 *
 * The provider is server-side only. API keys never reach the browser.
 */

import type { AiProvider, AiProviderConfig, AiProviderResponse } from "./types";

// ─── Provider Configuration ─────────────────────────────────

function getConfig(): AiProviderConfig {
  return {
    apiKey: process.env["AI_API_KEY"] ?? process.env["OPENAI_API_KEY"] ?? null,
    baseUrl: process.env["AI_BASE_URL"] ?? null,
    model: process.env["AI_MODEL"] ?? null,
  };
}

// ─── Stub Provider (no API key configured) ──────────────────

class StubProvider implements AiProvider {
  readonly name = "stub";
  readonly isAvailable = false;

  async generateText(_prompt: string): Promise<AiProviderResponse> {
    return {
      content: JSON.stringify({
        goal: "Configure AI provider to enable autonomous decisions",
        reasoningSummary: "No AI provider configured. AI decisions require a configured AI provider.",
        priority: "medium",
        action: "no_action",
        confidence: 0,
        requiresHuman: false,
      }),
    };
  }
}

// ─── OpenAI-Compatible Provider ─────────────────────────────

class OpenAICompatibleProvider implements AiProvider {
  readonly name: string;
  readonly isAvailable = true;

  private config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
    this.name = `openai:${config.model ?? "gpt-4o-mini"}`;
  }

  async generateText(prompt: string): Promise<AiProviderResponse> {
    if (!this.config.apiKey) {
      throw new Error("AI provider not configured: missing API key");
    }

    const baseUrl = this.config.baseUrl ?? "https://api.openai.com/v1";
    const model = this.config.model ?? "gpt-4o-mini";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a TikTok Growth Manager AI. You analyze account data and make structured decisions. " +
              "Always respond with valid JSON matching the AiDecision schema. " +
              "Never fabricate data. Never claim capabilities that don't exist. " +
              "If you cannot perform an action, say so clearly.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API error (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI API returned empty response");
    }

    const tokensUsed = data.usage?.total_tokens;
    return {
      content,
      ...(tokensUsed != null ? { tokensUsed } : {}),
    };
  }
}

// ─── Provider Factory ───────────────────────────────────────

let cachedProvider: AiProvider | null = null;

/**
 * Get the configured AI provider.
 * Returns a stub provider if no API key is configured.
 * Caches the provider instance for reuse.
 */
export function getAiProvider(): AiProvider {
  if (cachedProvider) return cachedProvider;

  const config = getConfig();

  if (config.apiKey) {
    cachedProvider = new OpenAICompatibleProvider(config);
  } else {
    cachedProvider = new StubProvider();
  }

  return cachedProvider;
}

/**
 * Check if an AI provider is configured and available.
 */
export function isAiConfigured(): boolean {
  return getAiProvider().isAvailable;
}

/**
 * Get the AI provider status for the frontend.
 */
export function getAiStatus(): { configured: boolean; provider: string } {
  const provider = getAiProvider();
  return {
    configured: provider.isAvailable,
    provider: provider.name,
  };
}
