// Mock module imports
import { useRouter } from 'next/navigation';
import * as hooks from '@/hooks';

// Setup mock modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks', () => ({
  useAuth: jest.fn(),
  useErrorHandler: jest.fn().mockReturnValue({
    localError: null,
    clearLocalError: jest.fn(),
    handleLocalError: jest.fn(),
    createLocalErrorWrapper: jest.fn((fn) => fn),
  }),
  useChat: jest.fn(),
  useSocket: jest.fn(),
}));

// Default mock values
export const mockAuthValues = {
  user: null,
  loading: false,
  error: null,
  loginWithEmail: jest.fn(),
  loginWithGoogle: jest.fn(),
  registerWithEmail: jest.fn(),
  logout: jest.fn(),
};

export const mockRouterValues = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

// Helper functions to reset mocks
export function resetAllMocks() {
  jest.clearAllMocks();

  // Reset specific mocks to their default values
  jest.mocked(hooks.useAuth).mockReturnValue({ ...mockAuthValues });
  jest.mocked(useRouter).mockReturnValue({ ...mockRouterValues });
}

// Create specific mock factories
export function createAuthMock(overrides = {}) {
  return {
    ...mockAuthValues,
    ...overrides,
  };
}

export function createRouterMock(overrides = {}) {
  return {
    ...mockRouterValues,
    ...overrides,
  };
}
