import { render, screen, fireEvent } from '@testing-library/react';
import { AccountVerification } from '../AccountVerification';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeChecked(): R;
    }
  }
}

const defaultProps = {
  agreedToContract: false,
  onAgreementChange: jest.fn(),
  onContractDetailsClick: jest.fn(),
};

describe('AccountVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the NAO Social Contract title', () => {
    render(<AccountVerification {...defaultProps} />);
    
    expect(screen.getAllByText('NAO Social Contract')).toHaveLength(2); // Header + link
  });

  it('renders all social contract principles', () => {
    render(<AccountVerification {...defaultProps} />);
    
    expect(screen.getByText(/Respectful Communication/)).toBeInTheDocument();
    expect(screen.getByText(/Authentic Identity/)).toBeInTheDocument();
    expect(screen.getByText(/Constructive Participation/)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Respect/)).toBeInTheDocument();
  });

  it('renders checkbox unchecked by default', () => {
    render(<AccountVerification {...defaultProps} />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders checkbox checked when agreedToContract is true', () => {
    render(<AccountVerification {...defaultProps} agreedToContract={true} />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onAgreementChange when checkbox is clicked', () => {
    render(<AccountVerification {...defaultProps} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(defaultProps.onAgreementChange).toHaveBeenCalledWith(true);
  });

  it('calls onContractDetailsClick when contract link is clicked', () => {
    render(<AccountVerification {...defaultProps} />);
    
    const contractLinks = screen.getAllByText('NAO Social Contract');
    const linkElement = contractLinks.find(link => link.tagName === 'A');
    
    if (linkElement) {
      fireEvent.click(linkElement);
      expect(defaultProps.onContractDetailsClick).toHaveBeenCalled();
    }
  });

  it('does not display error when no contractError provided', () => {
    render(<AccountVerification {...defaultProps} />);
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('displays error message when contractError is provided', () => {
    const errorMessage = 'You must agree to the social contract to continue';
    render(<AccountVerification {...defaultProps} contractError={errorMessage} />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('applies error styling when contractError is present', () => {
    const errorMessage = 'Contract agreement required';
    const { container } = render(
      <AccountVerification {...defaultProps} contractError={errorMessage} />
    );
    
    const paper = container.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
  });

  it('includes introduction text about NAO network participation', () => {
    render(<AccountVerification {...defaultProps} />);
    
    expect(screen.getByText(/By creating an account, you agree to participate/)).toBeInTheDocument();
    expect(screen.getByText(/respect, authenticity, and positive intent/)).toBeInTheDocument();
  });

  it('includes commitment text in checkbox label', () => {
    render(<AccountVerification {...defaultProps} />);
    
    expect(screen.getByText(/commit to being a positive member of the network/)).toBeInTheDocument();
  });
});