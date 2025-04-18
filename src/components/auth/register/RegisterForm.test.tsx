import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegisterForm } from '../register/RegisterForm';
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
    createLocalErrorWrapper: jest.fn((fn) => fn),
  }),
}));

describe('RegisterForm', () => {
  // Common test setup
  const mockRouter = {
    push: jest.fn(),
  };

  const mockRegisterWithEmail = jest.fn();
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
      loginWithEmail: jest.fn(),
      loginWithGoogle: mockLoginWithGoogle,
      registerWithEmail: mockRegisterWithEmail,
      logout: jest.fn(),
    });
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

    mockRegisterWithEmail.mockResolvedValue(testUser);

    render(<RegisterForm />);

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
      expect(mockRouter.push).toHaveBeenCalledWith('/chat');
    });
  });

  test('should show loading state during registration submission', async () => {
    // Arrange
    mockRegisterWithEmail.mockImplementation(
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

    render(<RegisterForm />);

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
    expect(
      screen.getByRole('button', { name: /creating account/i })
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Wait for registration to complete
    await waitFor(() => {
      expect(mockRegisterWithEmail).toHaveBeenCalled();
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

    mockLoginWithGoogle.mockResolvedValue(testUser);

    render(<RegisterForm />);

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
      expect(mockRouter.push).toHaveBeenCalledWith('/chat');
    });
  });

  test('should validate form inputs and allow successful submission', async () => {
    // Arrange
    mockRegisterWithEmail.mockResolvedValue({
      id: 'validated-user-id',
      email: 'valid@example.com',
      displayName: 'Valid User',
      status: 'online',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<RegisterForm />);

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
      expect(mockRouter.push).toHaveBeenCalledWith('/chat');
    });
  });
});
