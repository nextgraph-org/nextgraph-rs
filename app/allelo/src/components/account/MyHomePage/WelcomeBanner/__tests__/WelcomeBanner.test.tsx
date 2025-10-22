import { render, screen } from '@testing-library/react';
import { WelcomeBanner } from '../WelcomeBanner';
import type { ContentStats } from '@/types/userContent';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockStats: ContentStats = {
  totalItems: 15,
  byType: {
    post: 5,
    offer: 3,
    want: 2,
    image: 2,
    link: 1,
    file: 1,
    article: 1,
  },
  byVisibility: {
    public: 8,
    network: 5,
    private: 2,
  },
  totalViews: 1250,
  totalLikes: 89,
  totalComments: 42,
};

const defaultProps = {
  contentStats: mockStats,
};

describe('WelcomeBanner', () => {
  it('renders header', () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText('My Stream')).toBeInTheDocument();
    expect(screen.getByText('Content Overview')).toBeInTheDocument();
  });

  it('renders content statistics', () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText('1250')).toBeInTheDocument(); // Total views
    expect(screen.getByText('42')).toBeInTheDocument(); // Total comments
  });

  it('renders content type breakdown', () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText('Posts:')).toBeInTheDocument();
    expect(screen.getByText('Offers:')).toBeInTheDocument();
    expect(screen.getByText('Wants:')).toBeInTheDocument();
    expect(screen.getByText('Images:')).toBeInTheDocument();
    expect(screen.getByText('Links:')).toBeInTheDocument();
    expect(screen.getByText('Files:')).toBeInTheDocument();
    expect(screen.getByText('Articles:')).toBeInTheDocument();
  });

  it('displays total views and comments', () => {
    render(<WelcomeBanner {...defaultProps} />);
    expect(screen.getByText('Total Views:')).toBeInTheDocument();
    expect(screen.getByText('Total Comments:')).toBeInTheDocument();
  });

  it('handles zero stats gracefully', () => {
    const zeroStats: ContentStats = {
      totalItems: 0,
      byType: { post: 0, offer: 0, want: 0, image: 0, link: 0, file: 0, article: 0 },
      byVisibility: { public: 0, network: 0, private: 0 },
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
    };
    
    render(<WelcomeBanner {...defaultProps} contentStats={zeroStats} />);
    expect(screen.getByText('Content Overview')).toBeInTheDocument();
  });
});