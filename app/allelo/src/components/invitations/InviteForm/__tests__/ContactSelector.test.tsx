import { render, screen, fireEvent } from '@testing-library/react';
import { ContactSelector } from '../ContactSelector';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const defaultProps = {
  onSelectFromNetwork: jest.fn(),
};

describe('ContactSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders select from network button', () => {
    render(<ContactSelector {...defaultProps} />);
    expect(screen.getByText('Select from your network')).toBeInTheDocument();
  });

  it('renders descriptive text', () => {
    render(<ContactSelector {...defaultProps} />);
    expect(screen.getByText('Choose from your existing contacts to invite')).toBeInTheDocument();
  });

  it('renders divider with "or enter manually" text', () => {
    render(<ContactSelector {...defaultProps} />);
    expect(screen.getByText('or enter manually')).toBeInTheDocument();
  });

  it('calls onSelectFromNetwork when button is clicked', () => {
    render(<ContactSelector {...defaultProps} />);
    const selectButton = screen.getByText('Select from your network');
    fireEvent.click(selectButton);
    expect(defaultProps.onSelectFromNetwork).toHaveBeenCalled();
  });

  it('renders contact page icon', () => {
    render(<ContactSelector {...defaultProps} />);
    const icon = screen.getByTestId('ContactPageIcon');
    expect(icon).toBeInTheDocument();
  });
});