import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main heading and subheading', () => {
    renderWithRouter(<LoginPage />);
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your NAO account')).toBeInTheDocument();
  });

  it('renders login form fields', () => {
    renderWithRouter(<LoginPage />);
    
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderWithRouter(<LoginPage />);
    
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('renders create account link', () => {
    renderWithRouter(<LoginPage />);
    
    expect(screen.getByText(/Don't have an account/)).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    renderWithRouter(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('validates email format and prevents submission', async () => {
    renderWithRouter(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitButton);
    
    // Should not navigate on invalid email
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears field errors when user starts typing', async () => {
    renderWithRouter(<LoginPage />);
    
    // First trigger validation errors
    const submitButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    
    // Then clear error by typing
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  it('submits form successfully with valid data', async () => {
    renderWithRouter(<LoginPage />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    
    const submitButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(screen.getByRole('button', { name: /Signing In.../i })).toBeInTheDocument();
    
    // Wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 2000 });
  });

  it('navigates to signup when Create Account link is clicked', () => {
    renderWithRouter(<LoginPage />);
    
    const createAccountLink = screen.getByText('Create Account');
    fireEvent.click(createAccountLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('toggles password visibility', () => {
    renderWithRouter(<LoginPage />);
    
    const passwordInput = screen.getByLabelText('Password');
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(button => button.closest('.MuiInputAdornment-positionEnd'));
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  it('updates form data when inputs change', () => {
    renderWithRouter(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
    
    expect(screen.getByDisplayValue('user@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('mypassword')).toBeInTheDocument();
  });

  it('prevents default navigation on link clicks', () => {
    renderWithRouter(<LoginPage />);
    
    const createAccountLink = screen.getByText('Create Account');
    fireEvent.click(createAccountLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('handles form submission with Enter key', async () => {
    renderWithRouter(<LoginPage />);
    
    // Fill out valid form data
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    
    // Submit with Enter key
    const form = screen.getByRole('button', { name: /Sign In/i }).closest('form');
    fireEvent.submit(form!);
    
    // Check loading state
    expect(screen.getByRole('button', { name: /Signing In.../i })).toBeInTheDocument();
    
    // Wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 2000 });
  });
});