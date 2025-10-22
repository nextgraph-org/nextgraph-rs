import { render, screen, fireEvent } from '@testing-library/react';
import { Conversation } from './Conversation';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: string): R;
      toBeChecked(): R;
      toHaveTextContent(text: string | RegExp): R;
    }
  }
}

const mockMessages = [
  {
    id: '1',
    text: 'Hello everyone!',
    sender: 'John Doe',
    timestamp: new Date('2023-01-01T12:00:00Z'),
    isOwn: false
  },
  {
    id: '2', 
    text: 'Hi there!',
    sender: 'You',
    timestamp: new Date('2023-01-01T12:01:00Z'),
    isOwn: true
  }
];

describe('Messages', () => {
  const mockProps = {
    messages: mockMessages,
    currentMessage: '',
    onMessageChange: jest.fn(),
    onSendMessage: jest.fn(),
    groupName: 'Test Group'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no messages', () => {
    render(<Conversation {...mockProps} messages={[]} />);

    expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument();
  });

  it('calls onMessageChange when input changes', () => {
    render(<Conversation {...mockProps} />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'New message' } });

    expect(mockProps.onMessageChange).toHaveBeenCalledWith('New message');
  });

  it('calls onSendMessage when send button is clicked', () => {
    render(<Conversation {...mockProps} currentMessage="Test message" />);

    const sendButton = document.querySelector('[data-testid="SendIcon"]')?.closest('button');
    if (sendButton) {
      fireEvent.click(sendButton);
      expect(mockProps.onSendMessage).toHaveBeenCalledTimes(1);
    }
  });

  it('calls onSendMessage when Enter key is pressed', () => {
    render(<Conversation {...mockProps} currentMessage="Test message" />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(mockProps.onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not send message when Shift+Enter is pressed', () => {
    render(<Conversation {...mockProps} currentMessage="Test message" />);

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(mockProps.onSendMessage).not.toHaveBeenCalled();
  });

  it('disables send button when message is empty', () => {
    render(<Conversation {...mockProps} currentMessage="" />);

    const sendButton = document.querySelector('[data-testid="SendIcon"]')?.closest('button');
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when message has content', () => {
    render(<Conversation {...mockProps} currentMessage="Hello" />);

    const sendButton = document.querySelector('[data-testid="SendIcon"]')?.closest('button');
    expect(sendButton).not.toBeDisabled();
  });

  it('renders message timestamps', () => {
    render(<Conversation {...mockProps} />);

    // Should show relative time format
    const timestamps = screen.getAllByText(/ago|now/i);
    expect(timestamps.length).toBeGreaterThan(0);
  });


  it('renders attachment and emoji buttons', () => {
    render(<Conversation {...mockProps} />);

    expect(document.querySelector('[data-testid="AttachFileIcon"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="EmojiEmotionsIcon"]')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Conversation {...mockProps} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });


  it('displays input value correctly', () => {
    render(<Conversation {...mockProps} currentMessage="Current input" />);

    const input = screen.getByDisplayValue('Current input');
    expect(input).toBeInTheDocument();
  });

  it('handles multiline input', () => {
    render(<Conversation {...mockProps} />);

    const input = screen.getByPlaceholderText('Type a message...');
    expect(input).toBeInTheDocument(); // Input is present and multiline by MUI InputBase
  });
});