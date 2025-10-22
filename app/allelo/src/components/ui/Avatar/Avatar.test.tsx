import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

describe('Avatar', () => {
  it('renders with name initial when no profile image', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Avatar name="Test" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('handles click events when onClick provided', () => {
    const handleClick = jest.fn();
    render(<Avatar name="Test User" onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('T'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct size dimensions', () => {
    const { rerender } = render(<Avatar name="Test" size="small" />);
    let avatar = screen.getByText('T');
    expect(avatar).toHaveStyle({ width: '32px', height: '32px' });

    rerender(<Avatar name="Test" size="medium" />);
    avatar = screen.getByText('T');
    expect(avatar).toHaveStyle({ width: '44px', height: '44px' });

    rerender(<Avatar name="Test" size="large" />);
    avatar = screen.getByText('T');
    expect(avatar).toHaveStyle({ width: '80px', height: '80px' });
  });

  it('displays profile image when provided', () => {
    const { container } = render(<Avatar name="Test" profileImage="/test-image.jpg" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveStyle({ backgroundImage: 'url(/test-image.jpg)' });
  });

  it('applies custom className when provided', () => {
    render(<Avatar name="Test" className="custom-class" />);
    expect(screen.getByText('T')).toHaveClass('custom-class');
  });

  it('handles empty name gracefully', () => {
    const { container } = render(<Avatar name="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows first character of name in uppercase', () => {
    render(<Avatar name="test user" />);
    expect(screen.getByText('t')).toBeInTheDocument();
  });

  it('applies contact photo styles when profile image exists', () => {
    const { container } = render(<Avatar name="Test User" profileImage="/test.jpg" />);
    const avatar = container.firstChild as HTMLElement;
    expect(avatar).toHaveStyle({ backgroundImage: 'url(/test.jpg)' });
  });
});