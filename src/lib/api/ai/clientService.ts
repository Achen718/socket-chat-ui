import { AIRequestPayload, AIResponse } from '@/types';
import { log, AREAS } from '@/lib/utils/logger';
import { sendRequest } from '@/lib/api/openrouter/client';
import { prepareMessages } from './messageFormatter';
import { createFallbackResponse, handleApiError } from './fallbackService';
import { processApiResponse } from './responseHandler';

/**
 * Client-side implementation for generating AI responses
 * Used when calling AI services directly from the client
 */
export const generateAIResponseClient = async (
  payload: AIRequestPayload
): Promise<AIResponse> => {
  const startTime = performance.now();
  log.debug(
    AREAS.CHAT,
    `Starting AI response generation for conversation: ${payload.conversationId}`
  );

  // Debug check for API key
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    log.error(AREAS.CHAT, 'Missing OpenRouter API key!');
    return createFallbackResponse(
      "I can't connect to my AI services right now. Please check that you've configured the OpenRouter API key.",
      payload.conversationId
    );
  }

  // Maximum number of retries
  const MAX_RETRIES = 1;
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const { message, conversationId, messageHistory } = payload;
      const messages = prepareMessages(message, messageHistory);

      log.debug(
        AREAS.CHAT,
        `Sending request to OpenRouter API... (Attempt ${retries + 1}/${
          MAX_RETRIES + 1
        })`
      );

      const response = await sendRequest(
        messages,
        apiKey,
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://chatapp.com'
      );

      const result = processApiResponse(response, conversationId);

      const endTime = performance.now();
      log.debug(
        AREAS.CHAT,
        `AI response generation completed in ${(endTime - startTime).toFixed(
          2
        )}ms`
      );

      return result;
    } catch (error) {
      retries++;

      // If we've exhausted our retries, break the loop
      if (retries > MAX_RETRIES) {
        const endTime = performance.now();
        log.error(
          AREAS.CHAT,
          `Error generating AI response after ${retries} retries (${(
            endTime - startTime
          ).toFixed(2)}ms)`,
          error
        );
        break;
      }

      log.debug(AREAS.CHAT, `Retrying request (${retries}/${MAX_RETRIES})...`);
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
    }
  }

  // If we get here without returning, all retries failed
  return handleApiError(
    new Error('Maximum retries exceeded'),
    payload.conversationId
  );
};
