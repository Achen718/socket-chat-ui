import { AIResponse } from '@/types';
import { log, AREAS } from '@/lib/utils/logger';
import { AxiosResponse } from 'axios';

/**
 * Processes a successful API response and formats it as an AIResponse
 */
export function processApiResponse(
  response: AxiosResponse,
  conversationId: string
): AIResponse {
  // Extract the AI's response from the API result
  const aiContent =
    response.data.choices[0]?.message?.content ||
    "Sorry, I couldn't generate a response";

  log.debug(
    AREAS.CHAT,
    `Successfully processed AI response for conversation ${conversationId}`
  );

  return {
    content: aiContent,
    conversationId,
    timestamp: new Date().toISOString(),
  };
}
