import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginForm } from '../login/LoginForm';
import * as hooks from '@/hooks';
import * as navigation from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the useAuth hook
jest.mock('@/hooks', () => ({
  useAuth: jest.fn(),
  useErrorHandler: jest.fn().mockReturnValue({
    localError: null,
    clearLocalError: jest.fn(),
    handleLocalError: jest.fn(),
  }),
}));

describe('LoginForm', () => {
  // Common test setup
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockLoginWithEmail = jest.fn();
  const mockLoginWithGoogle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup router mock
    jest.mocked(navigation.useRouter).mockReturnValue(mockRouter);

    // Setup auth mock with default values for happy path
    jest.mocked(hooks.useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      loginWithEmail: mockLoginWithEmail,
      loginWithGoogle: mockLoginWithGoogle,
      registerWithEmail: jest.fn(),
      logout: jest.fn(),
    });
  });

  test('should render the login form correctly', () => {
    // Arrange & Act
    render(<LoginForm />);

    // Assert
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  test('should successfully login with email and password and redirect', async () => {
    // Arrange
    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockLoginWithEmail.mockResolvedValue(testUser);

    render(<LoginForm />);

    // Act - Fill in the form
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });

    // Wrap in act for React state updates
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    await waitFor(() => {
      // Verify that loginWithEmail was called with correct credentials
      expect(mockLoginWithEmail).toHaveBeenCalledWith(
        'test@example.com',
        'ValidPass123!'
      );
      // Verify navigation occurred
      expect(mockRouter.push).toHaveBeenCalledWith('/chat');
    });
  });

  test('should call loginWithEmail when form is submitted', async () => {
    // This test just focuses on verifying the function is called without waiting for loading states
    mockLoginWithEmail.mockResolvedValue({
      id: 'test-id',
      email: 'test@example.com',
      displayName: 'Test User',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<LoginForm />);

    // Act - Fill in the form and submit
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    expect(mockLoginWithEmail).toHaveBeenCalledWith(
      'test@example.com',
      'ValidPass123!'
    );
  });

  test('should successfully login with Google and redirect', async () => {
    // Arrange
    const testUser = {
      id: 'google-user-id',
      email: 'google@example.com',
      displayName: 'Google User',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockLoginWithGoogle.mockResolvedValue(testUser);

    render(<LoginForm />);

    // Act
    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });

    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Assert
    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/chat');
    });
  });
});
