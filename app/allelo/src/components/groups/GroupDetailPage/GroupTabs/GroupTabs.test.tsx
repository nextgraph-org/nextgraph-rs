import { render, screen, fireEvent } from '@testing-library/react';
import { GroupTabs } from './GroupTabs';

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

describe('GroupTabs', () => {
  const mockProps = {
    tabValue: 0,
    onTabChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all tab labels', () => {
    render(<GroupTabs {...mockProps} />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();
  });

  it('calls onTabChange when tab is clicked', () => {
    render(<GroupTabs {...mockProps} />);

    const chatTab = screen.getByText('Chat').closest('button');
    if (chatTab) {
      fireEvent.click(chatTab);
      expect(mockProps.onTabChange).toHaveBeenCalledWith(expect.any(Object), 1);
    }
  });

  it('shows correct active tab', () => {
    render(<GroupTabs {...mockProps} tabValue={2} />);

    const tabs = document.querySelectorAll('.MuiTab-root');
    expect(tabs[2]).toHaveClass('Mui-selected');
  });

  it('renders with correct number of tabs', () => {
    render(<GroupTabs {...mockProps} />);

    const tabs = document.querySelectorAll('.MuiTab-root');
    expect(tabs).toHaveLength(3);
  });

  it('handles tab change correctly', () => {
    render(<GroupTabs {...mockProps} />);

    const docsTab = screen.getByText('Docs').closest('button');
    if (docsTab) {
      fireEvent.click(docsTab);
      expect(mockProps.onTabChange).toHaveBeenCalledWith(expect.any(Object), 2);
    }
  });
});