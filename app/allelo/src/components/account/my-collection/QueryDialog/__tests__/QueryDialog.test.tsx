import { render, screen, fireEvent } from '@testing-library/react';
import { QueryDialog } from '../QueryDialog';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeDisabled(): R;
    }
  }
}

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  queryText: '',
  onQueryTextChange: jest.fn(),
  onRunQuery: jest.fn(),
};

describe('QueryDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<QueryDialog {...defaultProps} />);
    expect(screen.getByText('AI Query Assistant')).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    render(<QueryDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('AI Query Assistant')).not.toBeInTheDocument();
  });

  it('calls onQueryTextChange when text input changes', () => {
    render(<QueryDialog {...defaultProps} />);
    const textField = screen.getByPlaceholderText(/Ask me about your collection/i);
    fireEvent.change(textField, { target: { value: 'test query' } });
    expect(defaultProps.onQueryTextChange).toHaveBeenCalledWith('test query');
  });

  it('calls onRunQuery when send button is clicked', () => {
    render(<QueryDialog {...defaultProps} queryText="test query" />);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[0]; // First button is the send button (contains SendIcon)
    fireEvent.click(sendButton);
    expect(defaultProps.onRunQuery).toHaveBeenCalled();
  });

  it('disables send button when query text is empty', () => {
    render(<QueryDialog {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[0]; // First button is the send button
    expect(sendButton).toBeDisabled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<QueryDialog {...defaultProps} />);
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onRunQuery when Enter is pressed in text field', () => {
    render(<QueryDialog {...defaultProps} queryText="test query" />);
    const textField = screen.getByPlaceholderText(/Ask me about your collection/i);
    fireEvent.keyDown(textField, { key: 'Enter', shiftKey: false });
    expect(defaultProps.onRunQuery).toHaveBeenCalled();
  });
});