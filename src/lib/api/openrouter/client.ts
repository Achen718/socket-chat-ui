import axios, { AxiosResponse } from 'axios';
import { log, AREAS } from '@/lib/utils/logger';

// Define the OpenRouter API endpoint for DeepSeek R1
export const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const MODEL = 'deepseek/deepseek-r1:free';
type MessageRole = 'system' | 'user' | 'assistant' | 'function';

interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string; // Optional field for function messages
}

// Define the request options
interface RequestOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
  // Add other options as needed
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
    index: number;
  }[];
  // Other fields in the response
}

export async function sendRequest<T = OpenRouterResponse>(
  messages: ChatMessage[],
  apiKey: string,
  referer: string,
  options: RequestOptions = {}
): Promise<AxiosResponse<T>> {
  // The rest of your function remains the same
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    log.debug(AREAS.GENERAL, `Sending request to OpenRouter API...`);

    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 500,
        ...options,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': referer,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
