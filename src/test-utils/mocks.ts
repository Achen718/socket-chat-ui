// Mock module imports
import { useRouter } from 'next/navigation';
import * as hooks from '@/hooks';
import * as stores from '@/store';

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
}));

jest.mock('@/store', () => ({
  ...jest.requireActual('@/store'),
  useSocketStore: jest.fn(),
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

export const mockSocketValues = {
  socket: null,
  isConnected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
};

export const mockUseSocketReturn = {
  socket: null,
  isConnected: false,
};

// Helper functions to reset mocks
export function resetAllMocks() {
  jest.clearAllMocks();

  // Reset specific mocks to their default values
  jest.mocked(hooks.useAuth).mockReturnValue({ ...mockAuthValues });
  jest.mocked(useRouter).mockReturnValue({ ...mockRouterValues });

  // Reset the store mocks
  jest.mocked(stores.useSocketStore).mockImplementation((selector) => {
    if (selector) {
      return selector(mockSocketValues);
    }
    return mockSocketValues;
  });
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

export function createSocketMock(overrides = {}) {
  return {
    ...mockSocketValues,
    ...overrides,
  };
}
