import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyHomePage } from '../MyHomePage';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: string | number): R;
    }
  }
}

interface MockWelcomeBannerProps {
  contentStats: { totalItems: number };
}

interface MockQuickActionsProps {
  searchQuery: string;
  selectedTab: string;
  onSearchChange: (query: string) => void;
  onTabChange: (tab: string) => void;
}

interface MockRecentActivityProps {
  content: unknown[];
}

jest.mock('../../WelcomeBanner', () => ({
  WelcomeBanner: ({ contentStats }: MockWelcomeBannerProps) => (
    <div data-testid="welcome-banner">
      Welcome Banner - Total: {contentStats.totalItems}
    </div>
  ),
}));

jest.mock('../../QuickActions', () => ({
  QuickActions: ({ searchQuery, selectedTab, onSearchChange, onTabChange }: MockQuickActionsProps) => (
    <div data-testid="quick-actions">
      <input
        data-testid="search-input"
        value={searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
      />
      <button onClick={() => onTabChange('post')}>Filter Posts</button>
      <span>Selected: {selectedTab}</span>
    </div>
  ),
}));

jest.mock('../../RecentActivity', () => ({
  RecentActivity: ({ content }: MockRecentActivityProps) => (
    <div data-testid="recent-activity">
      Recent Activity - Items: {content.length}
    </div>
  ),
}));

describe('MyHomePage', () => {
  it('renders all sub-components', () => {
    render(<MyHomePage />);
    expect(screen.getByTestId('welcome-banner')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
  });

  it('passes correct stats to WelcomeBanner', async () => {
    render(<MyHomePage />);
    await waitFor(() => {
      expect(screen.getByText(/Total: 7/)).toBeInTheDocument(); // Mock data has 7 items
    });
  });

  it('handles search functionality', async () => {
    render(<MyHomePage />);
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Design' } });
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('Design');
    });
  });

  it('handles tab filtering', async () => {
    render(<MyHomePage />);
    
    const filterButton = screen.getByText('Filter Posts');
    fireEvent.click(filterButton);
    
    await waitFor(() => {
      expect(screen.getByText('Selected: post')).toBeInTheDocument();
    });
  });

  it('filters content based on search query', async () => {
    render(<MyHomePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Items: 7/)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Items: 0/)).toBeInTheDocument();
    });
  });

  it('renders homepage container', () => {
    const { container } = render(<MyHomePage />);
    expect(container.firstChild).toBeTruthy();
  });

  it('initializes with correct default state', () => {
    render(<MyHomePage />);
    expect(screen.getByText('Selected: all')).toBeInTheDocument();
  });
});