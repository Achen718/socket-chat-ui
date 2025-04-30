import { AIRequestPayload, AIResponse } from '@/types';
import { log, AREAS } from '@/lib/utils/logger';
import { sendRequest } from '../openrouter/client';
import { prepareMessages } from './messageFormatter';
import {
  createFallbackResponse,
  createSimulatedResponse,
  handleApiError,
} from './fallbackService';
import { processApiResponse } from './responseHandler';

/**
 * Server-side implementation for generating AI responses
 * Used for the API route to protect API keys
 */
export const generateAIResponseServer = async (
  payload: AIRequestPayload
): Promise<AIResponse> => {
  try {
    const { message, conversationId, messageHistory } = payload;

    // Check for API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    log.debug(AREAS.CHAT, `[Server] Debug - API key exists: ${!!apiKey}`);

    if (!apiKey) {
      log.error(
        AREAS.CHAT,
        'Missing OpenRouter API key in server environment!'
      );
      return createFallbackResponse(
        "I can't connect to my AI services right now. Please check the server configuration.",
        conversationId
      );
    }

    // Debug environment variables
    log.debug(AREAS.CHAT, `[Server] Debug - NODE_ENV: ${process.env.NODE_ENV}`);
    log.debug(
      AREAS.CHAT,
      `[Server] Debug - FORCE_REAL_AI exists: ${!!process.env.FORCE_REAL_AI}`
    );

    // Check if we should use simulation or real AI
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_REAL_AI) {
      log.debug(
        AREAS.CHAT,
        '[Server] Using simulated AI response in development mode'
      );

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate a simple response based on the message
      const simulatedResponse = createSimulatedResponse(message);
      return {
        content: simulatedResponse,
        conversationId,
        timestamp: new Date().toISOString(),
      };
    }

    log.debug(
      AREAS.CHAT,
      '[Server] Using REAL OpenRouter API for response generation'
    );

    // Send request to API
    const response = await sendRequest(
      prepareMessages(message, messageHistory),
      apiKey,
      process.env.NEXT_PUBLIC_APP_URL || 'https://socket-chat-ui.netlify.app'
    );

    // Process the response
    return processApiResponse(response, conversationId);
  } catch (error) {
    return handleApiError(error, payload.conversationId);
  }
};
