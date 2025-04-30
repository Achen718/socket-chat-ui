import { Message } from '@/types';
import { log, AREAS } from '@/lib/utils/logger';
import { ChatMessage, MessageRole } from '@/lib/api/openrouter/types'; // Import types from client

/**
 * Prepares messages for AI in the format expected by the OpenRouter API
 *
 * @param message - The current message to be sent
 * @param messageHistory - Previous message history for context
 * @returns Messages formatted for the OpenRouter API
 */
export const prepareMessages = (
  message: string,
  messageHistory: Message[]
): ChatMessage[] => {
  log.debug(
    AREAS.CHAT,
    `Preparing ${messageHistory.length} messages for AI context`
  );

  // Convert message history to the format expected by OpenRouter
  const formattedHistory = messageHistory.map(
    (msg): ChatMessage => ({
      role: (msg.isAI ? 'assistant' : 'user') as MessageRole,
      content: msg.content,
    })
  );

  // Add the current message
  return [
    {
      role: 'system' as MessageRole,
      content:
        'You are a helpful assistant in a chat application. Provide concise, accurate, and friendly responses.',
    },
    ...formattedHistory,
    {
      role: 'user' as MessageRole,
      content: message,
    },
  ];
};
