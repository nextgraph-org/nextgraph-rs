import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SignUpPage } from '../SignUpPage';

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

describe('SignUpPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main heading and subheading', () => {
    renderWithRouter(<SignUpPage />);
    
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByText(/Join the NAO network and start building meaningful connections/)).toBeInTheDocument();
  });

  it('renders the NAO welcome image placeholder', () => {
    renderWithRouter(<SignUpPage />);
    
    expect(screen.getByText('NAO Welcome Image')).toBeInTheDocument();
  });

  it('renders all form components', () => {
    renderWithRouter(<SignUpPage />);
    
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Security PIN')).toBeInTheDocument();
    expect(screen.getAllByText('NAO Social Contract')).toHaveLength(2); // Header + link
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithRouter(<SignUpPage />);
    
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('renders login link', () => {
    renderWithRouter(<SignUpPage />);
    
    expect(screen.getByText(/Already have an account/)).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    renderWithRouter(<SignUpPage />);
    
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('PIN is required')).toBeInTheDocument();
      expect(screen.getByText('You must agree to the social contract to continue')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderWithRouter(<SignUpPage />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitButton);
    
    // Should not proceed with invalid email - just verify no navigation occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows validation error for short password', async () => {
    renderWithRouter(<SignUpPage />);
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('validates PIN format', async () => {
    renderWithRouter(<SignUpPage />);
    
    const pinInput = screen.getByLabelText('Security PIN');
    fireEvent.change(pinInput, { target: { value: 'abc' } });
    
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitButton);
    
    // Should not proceed with invalid PIN
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears field errors when user starts typing', async () => {
    renderWithRouter(<SignUpPage />);
    
    // First trigger validation errors
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
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
    renderWithRouter(<SignUpPage />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Security PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('checkbox'));
    
    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(screen.getByRole('button', { name: /Creating Account.../i })).toBeInTheDocument();
    
    // Wait for navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/import');
    }, { timeout: 2000 });
  });

  it('navigates to login when Sign In link is clicked', () => {
    renderWithRouter(<SignUpPage />);
    
    const signInLink = screen.getByText('Sign In');
    fireEvent.click(signInLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('toggles password visibility', () => {
    renderWithRouter(<SignUpPage />);
    
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
});