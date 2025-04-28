import React from 'react';
import { fireEvent, waitFor, act, render, screen } from '@/test-utils/render';
import '@testing-library/jest-dom';
import { RegisterForm } from './RegisterForm';

describe('RegisterForm', () => {
  const mockRegisterWithEmail = jest.fn();
  const mockLoginWithGoogle = jest.fn();
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render the registration form correctly', () => {
    // Arrange & Act
    render(<RegisterForm />);

    // Assert
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    // Use getAllByPlaceholderText instead of getByPlaceholderText for password fields
    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    expect(passwordFields.length).toBe(2); // Ensure we have both password fields
    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument();
  });

  test('should successfully register with email and redirect', async () => {
    // Arrange
    const testUser = {
      id: 'new-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Render with our custom auth and router mocks
    render(<RegisterForm />, {
      authValues: {
        registerWithEmail: mockRegisterWithEmail.mockResolvedValue(testUser),
      },
      routerValues: {
        push: mockRouterPush,
      },
    });

    // Act - Fill in the form
    const nameInput = screen.getByPlaceholderText('John Doe');
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];
    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'ValidPass123!' },
    });

    // Use act to wrap the form submission
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    await waitFor(() => {
      // Verify that registerWithEmail was called with correct credentials
      expect(mockRegisterWithEmail).toHaveBeenCalledWith(
        'test@example.com',
        'ValidPass123!',
        'Test User'
      );

      // Verify navigation occurred
      expect(mockRouterPush).toHaveBeenCalledWith('/chat');
    });
  });

  test('should show loading state during registration submission', async () => {
    // Create a delayed mock implementation
    const delayedMockRegister = jest.fn().mockImplementation(
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

    render(<RegisterForm />, {
      authValues: {
        registerWithEmail: delayedMockRegister,
      },
    });

    // Act - Fill in the form
    const nameInput = screen.getByPlaceholderText('John Doe');
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];
    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'ValidPass123!' },
    });

    // Use act to wrap the form submission
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert - Button should show loading state
    expect(submitButton).toBeDisabled();

    // Wait for registration to complete
    await waitFor(() => {
      expect(delayedMockRegister).toHaveBeenCalled();
    });
  });

  test('should successfully register with Google and redirect', async () => {
    // Arrange
    const testUser = {
      id: 'google-user-id',
      email: 'google@example.com',
      displayName: 'Google User',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<RegisterForm />, {
      authValues: {
        loginWithGoogle: mockLoginWithGoogle.mockResolvedValue(testUser),
      },
      routerValues: {
        push: mockRouterPush,
      },
    });

    // Act - Use act to wrap the Google button click
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

  test('should validate form inputs and allow successful submission', async () => {
    // Arrange
    const validUser = {
      id: 'validated-user-id',
      email: 'valid@example.com',
      displayName: 'Valid User',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<RegisterForm />, {
      authValues: {
        registerWithEmail: mockRegisterWithEmail.mockResolvedValue(validUser),
      },
      routerValues: {
        push: mockRouterPush,
      },
    });

    // Act - Fill form correctly
    const nameInput = screen.getByPlaceholderText('John Doe');
    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];
    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });

    // Fill form with valid data
    fireEvent.change(nameInput, { target: { value: 'Valid User' } });
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'ValidPass123!' },
    });

    // Submit the form using act
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Assert
    await waitFor(() => {
      expect(mockRegisterWithEmail).toHaveBeenCalledWith(
        'valid@example.com',
        'ValidPass123!',
        'Valid User'
      );
      expect(mockRouterPush).toHaveBeenCalledWith('/chat');
    });
  });
});
