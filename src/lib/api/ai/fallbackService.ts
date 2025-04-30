import { AIResponse } from '@/types';
import { log, AREAS } from '@/lib/utils/logger';
import axios from 'axios';

/**
 * Creates a formatted fallback response when the AI service fails
 */
export function createFallbackResponse(
  message: string,
  conversationId: string
): AIResponse {
  log.debug(
    AREAS.CHAT,
    `Creating fallback response for conversation ${conversationId}`
  );

  return {
    content: message,
    conversationId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper function to create simulated AI responses for development
 */
export function createSimulatedResponse(message: string): string {
  // Convert message to lowercase for easier matching
  const lowerMessage = message.toLowerCase();

  // Simple pattern matching for various types of questions
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return 'Hello! How can I help you today?';
  }

  if (lowerMessage.includes('help')) {
    return "I'm here to help! What do you need assistance with?";
  }

  if (lowerMessage.includes('how are you')) {
    return "I'm functioning well, thank you for asking! How can I assist you?";
  }

  if (lowerMessage.includes('weather')) {
    return "I don't have access to real-time weather data, but I can help with many other questions!";
  }

  if (lowerMessage.includes('name')) {
    return "I'm your AI assistant, here to help with your questions and tasks.";
  }

  if (lowerMessage.includes('thank')) {
    return "You're welcome! Let me know if you need anything else.";
  }

  // Check if it's a question
  if (lowerMessage.includes('?')) {
    return "That's an interesting question. In a production environment, I'd connect to an AI service to give you a detailed answer.";
  }

  // Default response
  return `I understand you're saying: "${message}". As a simulated AI response in development mode, I can acknowledge your message but can't provide a contextual response. In production, I'd connect to the OpenRouter API for a proper reply.`;
}

/**
 * Handles API errors and returns appropriate fallback responses
 */
export function handleApiError(
  error: unknown,
  conversationId: string
): AIResponse {
  log.error(AREAS.CHAT, 'Error generating AI response:', error);

  if (axios.isAxiosError(error)) {
    log.error(AREAS.CHAT, 'OpenRouter API error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      message: error.message,
    });

    if (error.response?.status === 400) {
      // Bad request - likely an issue with the API key or request format
      return createFallbackResponse(
        "I'm having trouble connecting to my AI services. There might be an issue with the API configuration.",
        conversationId
      );
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      // Authentication issue
      return createFallbackResponse(
        "I can't authenticate with my AI services. Please check your OpenRouter API key.",
        conversationId
      );
    }
  }

  // Default fallback for any other error
  return createFallbackResponse(
    "I'm sorry, I couldn't generate a response at this time. Please try again later.",
    conversationId
  );
}
