import type { ProviderType } from "@/types/chat";
import { generateGeminiReply } from "./gemini";
import { generateOpenAICompatibleReply } from "./openaiCompatible";
import { PROVIDER_META } from "./providerDefaults";
import { AiProviderError, toUserFacingError, type GenerateReplyInput } from "./types";

export { AiProviderError, toUserFacingError, isRotatableError } from "./types";
export { buildSystemPrompt, splitIntoBubbles, BUBBLE_DELIMITER } from "./promptBuilder";
export type { ChatTurn } from "./types";
export type { UserContext } from "./promptBuilder";

export async function generateCharacterReply(
  providerType: ProviderType,
  input: GenerateReplyInput
): Promise<string> {
  switch (providerType) {
    case "gemini":
      return generateGeminiReply(input);
    case "groq":
      return generateOpenAICompatibleReply({
        ...input,
        baseUrl: input.baseUrl || PROVIDER_META.groq.baseUrl!,
        providerLabel: PROVIDER_META.groq.name,
      });
    case "openrouter":
      return generateOpenAICompatibleReply({
        ...input,
        baseUrl: input.baseUrl || PROVIDER_META.openrouter.baseUrl!,
        providerLabel: PROVIDER_META.openrouter.name,
        extraHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://waichat.vercel.app",
          "X-Title": "WaiChat",
        },
      });
    case "custom": {
      if (!input.baseUrl) {
        throw new AiProviderError("Base URL untuk provider custom belum diatur.");
      }
      return generateOpenAICompatibleReply({
        ...input,
        baseUrl: input.baseUrl,
        providerLabel: "Custom Provider",
      });
    }
    default:
      throw new AiProviderError(`Provider tidak dikenal: ${providerType}`);
  }
}
