/**
 * OpenRouter API types
 * These types are specific to the OpenRouter API implementation
 */

/**
 * Allowed message roles in the OpenRouter API
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

/**
 * Structure of a single message for the OpenRouter API
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string; // Optional field for function messages
}

/**
 * Request options for the OpenRouter API
 */
export interface RequestOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

/**
 * Structure of the OpenRouter API response
 */
export interface OpenRouterResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
    index: number;
  }[];
  created: number;
  model: string;
  object: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
