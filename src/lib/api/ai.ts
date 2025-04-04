import axios from 'axios';
import { Message, AIResponse, AIRequestPayload } from '@/types';

// Define the OpenRouter API endpoint for DeepSeek R1
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-r1:free';

// Prepare messages for AI in the format expected by the OpenRouter API
const prepareMessages = (message: string, messageHistory: Message[]) => {
  // Convert message history to the format expected by OpenRouter
  const formattedHistory = messageHistory.map((msg) => ({
    role: msg.isAI ? 'assistant' : 'user',
    content: msg.content,
  }));

  // Add the current message
  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant in a chat application. Provide concise, accurate, and friendly responses.',
    },
    ...formattedHistory,
    {
      role: 'user',
      content: message,
    },
  ];
};

// Generate AI response using DeepSeek R1 model via OpenRouter
export const generateAIResponse = async (
  payload: AIRequestPayload
): Promise<AIResponse> => {
  const startTime = performance.now();
  console.log(
    `Starting AI response generation for conversation: ${payload.conversationId}`
  );

  // Debug check for API key
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Missing OpenRouter API key! Using fallback response.');
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

      // For development and testing, provide a simulated response without calling the API
      if (
        process.env.NODE_ENV === 'development' &&
        !process.env.FORCE_REAL_AI
      ) {
        console.log('Using simulated AI response in development mode');

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

      console.log(`Preparing ${messageHistory.length} messages for AI context`);
      const messages = prepareMessages(message, messageHistory);
      console.log('Messages prepared for OpenRouter API');

      console.log(
        `Sending request to OpenRouter API... (Attempt ${retries + 1}/${
          MAX_RETRIES + 1
        })`
      );

      // Set a timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        const response = await axios.post(
          API_URL,
          {
            model: MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 500,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer':
                typeof window !== 'undefined'
                  ? window.location.origin
                  : 'https://chatapp.com',
            },
            signal: controller.signal,
          }
        );

        // Clear the timeout since the request completed
        clearTimeout(timeoutId);

        console.log('Received response from OpenRouter API');

        // Extract the AI's response from the API result
        const aiContent =
          response.data.choices[0]?.message?.content ||
          "Sorry, I couldn't generate a response";

        console.log(`AI response generated (${aiContent.length} chars)`);

        const result = {
          content: aiContent,
          conversationId,
          timestamp: new Date().toISOString(),
        };

        const endTime = performance.now();
        console.log(
          `AI response generation completed in ${(endTime - startTime).toFixed(
            2
          )}ms`
        );

        return result;
      } catch (requestError) {
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);

        // Rethrow the error to be handled by the outer catch block
        throw requestError;
      }
    } catch (error) {
      retries++;

      console.error('Error details:', error);

      // Log detailed error information
      if (axios.isAxiosError(error)) {
        console.error('OpenRouter API error details:', {
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
            payload.conversationId
          );
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
          // Authentication issue
          return createFallbackResponse(
            "I can't authenticate with my AI services. Please check your OpenRouter API key.",
            payload.conversationId
          );
        }
      }

      // If we've exhausted our retries, break the loop
      if (retries > MAX_RETRIES) {
        const endTime = performance.now();
        console.error(
          `Error generating AI response after ${retries} retries (${(
            endTime - startTime
          ).toFixed(2)}ms)`
        );
        break;
      }

      console.log(`Retrying request (${retries}/${MAX_RETRIES})...`);
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
    }
  }

  // If we get here without returning, all retries failed
  return createFallbackResponse(
    "I'm sorry, I couldn't generate a response at this time. Please try again later.",
    payload.conversationId
  );
};

// Helper function to create a fallback response
function createFallbackResponse(
  message: string,
  conversationId: string
): AIResponse {
  return {
    content: message,
    conversationId,
    timestamp: new Date().toISOString(),
  };
}

// Helper function to create simulated AI responses for development
function createSimulatedResponse(message: string): string {
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

// Server-side function for the API route
export const generateAIResponseServer = async (
  payload: AIRequestPayload
): Promise<AIResponse> => {
  try {
    const { message, conversationId, messageHistory } = payload;

    // Check for API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('Missing OpenRouter API key in server environment!');
      return createFallbackResponse(
        "I can't connect to my AI services right now. Please check the server configuration.",
        conversationId
      );
    }

    // For development and testing, provide a simulated response without calling the API
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_REAL_AI) {
      console.log('[Server] Using simulated AI response in development mode');

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

    // Set a timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await axios.post(
        API_URL,
        {
          model: MODEL,
          messages: prepareMessages(message, messageHistory),
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer':
              process.env.NEXT_PUBLIC_APP_URL || 'https://chatapp.com',
          },
          signal: controller.signal,
        }
      );

      // Clear the timeout
      clearTimeout(timeoutId);

      // Extract the AI's response from the API result
      const aiContent =
        response.data.choices[0]?.message?.content ||
        "Sorry, I couldn't generate a response";

      return {
        content: aiContent,
        conversationId,
        timestamp: new Date().toISOString(),
      };
    } catch (requestError) {
      // Clear the timeout to prevent memory leaks
      clearTimeout(timeoutId);
      throw requestError;
    }
  } catch (error) {
    console.error('[Server] Error generating AI response:', error);

    // Provide more specific error messages based on error type
    if (axios.isAxiosError(error)) {
      console.error('[Server] OpenRouter API error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      if (error.response?.status === 400) {
        return createFallbackResponse(
          "I'm having trouble with my AI service configuration. Please check the server logs.",
          payload.conversationId
        );
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        return createFallbackResponse(
          "There's an authentication issue with the AI service. Please check the API key configuration.",
          payload.conversationId
        );
      }
    }

    return createFallbackResponse(
      "I'm sorry, I couldn't generate a response at this time. Please try again later.",
      payload.conversationId
    );
  }
};
