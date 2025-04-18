import React from 'react';
import { fireEvent, waitFor, act, render, screen } from '@/test-utils';
import '@testing-library/jest-dom';
import { LoginForm } from './LoginForm';
import { testUsers } from '@/test-utils/test-data';

describe('LoginForm', () => {
  const mockLoginWithEmail = jest.fn();
  const mockLoginWithGoogle = jest.fn();
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    // Render with our custom auth and router mocks
    render(<LoginForm />, {
      authValues: {
        loginWithEmail: mockLoginWithEmail.mockResolvedValue(
          testUsers.standard
        ),
      },
      routerValues: {
        push: mockRouterPush,
      },
    });

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
      expect(mockRouterPush).toHaveBeenCalledWith('/chat');
    });
  });

  test('should show loading state during login submission', async () => {
    // Create a delayed mock implementation
    const delayedMockLogin = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                id: '1',
                email: 'test@example.com',
                displayName: 'Test User',
                status: 'online',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }),
            100
          )
        )
    );

    render(<LoginForm />, {
      authValues: {
        loginWithEmail: delayedMockLogin,
      },
    });

    // Act - Fill in the form and submit
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert - Button should be disabled during loading
    expect(submitButton).toBeDisabled();

    // Wait for login to complete
    await waitFor(() => {
      expect(delayedMockLogin).toHaveBeenCalled();
    });
  });

  test('should successfully login with Google and redirect', async () => {
    // Render with our custom auth and router mocks
    render(<LoginForm />, {
      authValues: {
        loginWithGoogle: mockLoginWithGoogle.mockResolvedValue(
          testUsers.google
        ),
      },
      routerValues: {
        push: mockRouterPush,
      },
    });

    // Act - Find and click the Google button
    const googleButton = screen.getByRole('button', {
      name: /continue with google/i,
    });

    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Assert
    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith('/chat');
    });
  });
});
