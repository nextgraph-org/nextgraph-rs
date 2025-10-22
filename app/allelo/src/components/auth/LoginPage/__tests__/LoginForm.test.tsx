import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from '../LoginForm';
import type { LoginFormData } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockFormData: LoginFormData = {
  email: '',
  password: ''
};

const defaultProps = {
  formData: mockFormData,
  errors: {},
  showPassword: false,
  onFormDataChange: jest.fn(),
  onShowPasswordToggle: jest.fn(),
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<LoginForm {...defaultProps} />);
    
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('displays form field values correctly', () => {
    const filledFormData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    render(<LoginForm {...defaultProps} formData={filledFormData} />);
    
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('password123')).toBeInTheDocument();
  });

  it('calls onFormDataChange when email input changes', () => {
    render(<LoginForm {...defaultProps} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'new@email.com' } });
    
    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith('email', 'new@email.com');
  });

  it('calls onFormDataChange when password input changes', () => {
    render(<LoginForm {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'newpassword' } });
    
    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith('password', 'newpassword');
  });

  it('displays password as hidden by default', () => {
    render(<LoginForm {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays password as text when showPassword is true', () => {
    render(<LoginForm {...defaultProps} showPassword={true} />);
    
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('calls onShowPasswordToggle when password visibility button is clicked', () => {
    render(<LoginForm {...defaultProps} />);
    
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(button => button.closest('.MuiInputAdornment-positionEnd'));
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(defaultProps.onShowPasswordToggle).toHaveBeenCalled();
    }
  });

  it('displays error messages for form fields', () => {
    const errorsWithMessages = {
      email: 'Email is required',
      password: 'Password is required'
    };
    
    render(<LoginForm {...defaultProps} errors={errorsWithMessages} />);
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('has correct placeholder text', () => {
    render(<LoginForm {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('your.email@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
  });

  it('renders email and lock icons in input fields', () => {
    render(<LoginForm {...defaultProps} />);
    
    expect(screen.getByTestId('EmailIcon')).toBeInTheDocument();
    expect(screen.getByTestId('LockIcon')).toBeInTheDocument();
  });
});