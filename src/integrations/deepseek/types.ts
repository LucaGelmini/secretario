/**
 * DeepSeek API types (OpenAI-compatible)
 */

export interface DeepSeekMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface DeepSeekChatCompletionRequest {
	model: string;
	messages: DeepSeekMessage[];
	temperature?: number;
	max_tokens?: number;
	top_p?: number;
	frequency_penalty?: number;
	presence_penalty?: number;
	stop?: string | string[];
	stream?: boolean;
}

export interface DeepSeekChatCompletionResponse {
	id: string;
	object: "chat.completion";
	created: number;
	model: string;
	choices: DeepSeekChoice[];
	usage: DeepSeekUsage;
}

export interface DeepSeekChoice {
	index: number;
	message: DeepSeekMessage;
	finish_reason: "stop" | "length" | "content_filter" | null;
}

export interface DeepSeekUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
}

export interface DeepSeekErrorResponse {
	error: {
		message: string;
		type: string;
		code: string | null;
	};
}
