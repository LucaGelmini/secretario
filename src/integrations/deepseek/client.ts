import { IntegrationError } from "@/integrations/types";
import type {
	DeepSeekChatCompletionRequest,
	DeepSeekChatCompletionResponse,
	DeepSeekErrorResponse,
	DeepSeekMessage,
} from "./types";

/**
 * DeepSeek API client (OpenAI-compatible)
 *
 * Uses the OpenAI-compatible API endpoint for chat completions.
 * Docs: https://api-docs.deepseek.com/
 */
export class DeepSeekClient {
	private readonly baseUrl = "https://api.deepseek.com/v1";

	constructor(private readonly apiKey: string) {}

	/**
	 * Create a chat completion
	 */
	async chatCompletion(
		messages: DeepSeekMessage[],
		options?: {
			model?: string;
			temperature?: number;
			maxTokens?: number;
		},
	): Promise<DeepSeekChatCompletionResponse> {
		const request: DeepSeekChatCompletionRequest = {
			model: options?.model || "deepseek-chat",
			messages,
			temperature: options?.temperature ?? 0.7,
			max_tokens: options?.maxTokens,
		};

		try {
			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(request),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("DeepSeek API error response:", errorText);
				
				let errorMessage = `HTTP ${response.status}`;
				try {
					const errorData = JSON.parse(errorText) as DeepSeekErrorResponse;
					errorMessage = errorData.error.message;
				} catch {
					errorMessage = errorText.substring(0, 200);
				}
				
				throw new IntegrationError(
					"deepseek",
					`DeepSeek API error: ${errorMessage}`,
					response.status,
				);
			}

			const data = (await response.json()) as DeepSeekChatCompletionResponse;
			return data;
		} catch (error) {
			if (error instanceof IntegrationError) {
				throw error;
			}

			throw new IntegrationError(
				"deepseek",
				`Failed to call DeepSeek API: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Helper: Simple text completion
	 */
	async complete(prompt: string, systemPrompt?: string): Promise<string> {
		const messages: DeepSeekMessage[] = [];

		if (systemPrompt) {
			messages.push({ role: "system", content: systemPrompt });
		}

		messages.push({ role: "user", content: prompt });

		const response = await this.chatCompletion(messages);

		const choice = response.choices[0];
		if (!choice) {
			throw new IntegrationError("deepseek", "No completion choice returned");
		}

		return choice.message.content;
	}
}
