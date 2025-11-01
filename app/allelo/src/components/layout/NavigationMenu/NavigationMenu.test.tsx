import { render, screen, fireEvent } from '@testing-library/react';
import {
  UilDashboard as Dashboard,
  UilUsersAlt as Groups
} from '@iconscout/react-unicons';
import { NavigationMenu } from './NavigationMenu';
import type { NavItem } from './types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockNavItems: NavItem[] = [
  { text: 'Home', icon: <Dashboard />, path: '/feed' },
  { text: 'Groups', icon: <Groups />, path: '/groups' },
];

const defaultProps = {
  navItems: mockNavItems,
  expandedItems: new Set<string>(),
  isActiveRoute: jest.fn(() => false),
  onToggleExpanded: jest.fn(),
  onNavigation: jest.fn(),
};

describe('NavigationMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation items correctly', () => {
    render(<NavigationMenu {...defaultProps} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<NavigationMenu {...defaultProps} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLUListElement);
  });

  it('handles navigation item clicks', () => {
    const onNavigation = jest.fn();
    render(<NavigationMenu {...defaultProps} onNavigation={onNavigation} />);
    
    fireEvent.click(screen.getByText('Home'));
    expect(onNavigation).toHaveBeenCalledWith('/feed');
  });

  it('displays active route styling', () => {
    const isActiveRoute = jest.fn((path) => path === '/feed');
    render(<NavigationMenu {...defaultProps} isActiveRoute={isActiveRoute} />);
    
    const homeButton = screen.getByText('Home').closest('.MuiListItemButton-root');
    expect(homeButton).toHaveClass('Mui-selected');
  });

  it('renders badges when provided', () => {
    const itemsWithBadge: NavItem[] = [
      { text: 'Home', icon: <Dashboard />, path: '/feed', badge: 5 },
    ];
    
    render(<NavigationMenu {...defaultProps} navItems={itemsWithBadge} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles expandable items', () => {
    const itemsWithChildren: NavItem[] = [
      { 
        text: 'Parent', 
        icon: <Groups />, 
        path: '/parent',
        children: [
          { text: 'Child', icon: <Dashboard />, path: '/parent/child' }
        ]
      },
    ];
    const onToggleExpanded = jest.fn();
    
    render(
      <NavigationMenu 
        {...defaultProps} 
        navItems={itemsWithChildren} 
        onToggleExpanded={onToggleExpanded} 
      />
    );
    
    fireEvent.click(screen.getByText('Parent'));
    expect(onToggleExpanded).toHaveBeenCalledWith('Parent');
  });

  it('shows expanded children when expanded', () => {
    const itemsWithChildren: NavItem[] = [
      { 
        text: 'Parent', 
        icon: <Groups />, 
        path: '/parent',
        children: [
          { text: 'Child', icon: <Dashboard />, path: '/parent/child' }
        ]
      },
    ];
    const expandedItems = new Set(['Parent']);
    
    render(
      <NavigationMenu 
        {...defaultProps} 
        navItems={itemsWithChildren} 
        expandedItems={expandedItems}
      />
    );
    
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('hides children when not expanded', () => {
    const itemsWithChildren: NavItem[] = [
      { 
        text: 'Parent', 
        icon: <Groups />, 
        path: '/parent',
        children: [
          { text: 'Child', icon: <Dashboard />, path: '/parent/child' }
        ]
      },
    ];
    
    render(<NavigationMenu {...defaultProps} navItems={itemsWithChildren} />);
    
    expect(screen.queryByText('Child')).not.toBeInTheDocument();
  });
});