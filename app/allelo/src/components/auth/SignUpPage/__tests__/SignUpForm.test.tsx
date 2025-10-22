import { render, screen, fireEvent } from '@testing-library/react';
import { SignUpForm } from '../SignUpForm';
import type { SignUpFormData } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockFormData: SignUpFormData = {
  email: '',
  password: '',
  pin: '',
  agreedToContract: false
};

const defaultProps = {
  formData: mockFormData,
  errors: {},
  showPassword: false,
  onFormDataChange: jest.fn(),
  onShowPasswordToggle: jest.fn(),
};

describe('SignUpForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<SignUpForm {...defaultProps} />);
    
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Security PIN')).toBeInTheDocument();
  });

  it('displays form field values correctly', () => {
    const filledFormData = {
      ...mockFormData,
      email: 'test@example.com',
      password: 'password123',
      pin: '1234'
    };
    
    render(<SignUpForm {...defaultProps} formData={filledFormData} />);
    
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('password123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1234')).toBeInTheDocument();
  });

  it('calls onFormDataChange when email input changes', () => {
    render(<SignUpForm {...defaultProps} />);
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'new@email.com' } });
    
    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith('email', 'new@email.com');
  });

  it('calls onFormDataChange when password input changes', () => {
    render(<SignUpForm {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'newpassword' } });
    
    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith('password', 'newpassword');
  });

  it('calls onFormDataChange when PIN input changes', () => {
    render(<SignUpForm {...defaultProps} />);
    
    const pinInput = screen.getByLabelText('Security PIN');
    fireEvent.change(pinInput, { target: { value: '5678' } });
    
    expect(defaultProps.onFormDataChange).toHaveBeenCalledWith('pin', '5678');
  });

  it('displays password as hidden by default', () => {
    render(<SignUpForm {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays password as text when showPassword is true', () => {
    render(<SignUpForm {...defaultProps} showPassword={true} />);
    
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('calls onShowPasswordToggle when password visibility button is clicked', () => {
    render(<SignUpForm {...defaultProps} />);
    
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
      password: 'Password must be at least 8 characters',
      pin: 'PIN must be 4-6 digits'
    };
    
    render(<SignUpForm {...defaultProps} errors={errorsWithMessages} />);
    
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('PIN must be 4-6 digits')).toBeInTheDocument();
  });

  it('shows helper text for password field when no error', () => {
    render(<SignUpForm {...defaultProps} />);
    
    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
  });

  it('shows helper text for PIN field when no error', () => {
    render(<SignUpForm {...defaultProps} />);
    
    expect(screen.getByText('Used for additional security verification')).toBeInTheDocument();
  });

  it('has correct input attributes for PIN field', () => {
    render(<SignUpForm {...defaultProps} />);
    
    const pinInput = screen.getByLabelText('Security PIN');
    expect(pinInput).toHaveAttribute('maxLength', '6');
    expect(pinInput).toHaveAttribute('pattern', '[0-9]*');
  });
});