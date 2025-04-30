/**
 * AI Service Module
 *
 * This module provides functions for generating AI responses using the OpenRouter API.
 * It's been refactored following the Single Responsibility Principle, with separate
 * modules for different concerns:
 *
 * - messageFormatter: Prepares messages for the API
 * - responseHandler: Processes API responses
 * - fallbackService: Handles errors and provides fallback responses
 * - clientService: Client-side implementation
 * - serverService: Server-side implementation
 */

import { generateAIResponseClient } from './clientService';
import { generateAIResponseServer } from './serverService';
import { prepareMessages } from './messageFormatter';
import {
  createFallbackResponse,
  createSimulatedResponse,
} from './fallbackService';

// Main export for client-side usage
export const generateAIResponse = generateAIResponseClient;

// Export all necessary components
export {
  generateAIResponseServer,
  prepareMessages,
  createFallbackResponse,
  createSimulatedResponse,
};
