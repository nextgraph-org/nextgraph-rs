import { render, screen } from '@testing-library/react';
import { Dashboard, Groups, Person } from '@mui/icons-material';
import { Sidebar } from './Sidebar';
import type { NavItem } from '../NavigationMenu/types';
import type { RelationshipCategory } from './types';

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

const mockCategories: RelationshipCategory[] = [
  { 
    id: 'business', 
    name: 'Business', 
    icon: Person,
    color: '#7b1fa2',
    count: 5,
    colorScheme: {
      main: '#7b1fa2',
      light: '#ba68c8',
      dark: '#6a1b9a',
      bg: '#f3e5f5'
    }
  },
  { 
    id: 'community', 
    name: 'Community', 
    icon: Groups,
    color: '#1976d2', 
    count: 3,
    colorScheme: {
      main: '#1976d2',
      light: '#64b5f6',
      dark: '#1565c0',
      bg: '#e3f2fd'
    }
  },
];

const defaultProps = {
  navItems: mockNavItems,
  expandedItems: new Set<string>(),
  isActiveRoute: jest.fn(() => false),
  onToggleExpanded: jest.fn(),
  onNavigation: jest.fn(),
  currentPath: '/contacts',
  relationshipCategories: mockCategories,
};

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sidebar with NAO title', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('NAO')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Sidebar {...defaultProps} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('renders navigation menu', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  it('shows relationship categories on contacts page', () => {
    render(<Sidebar {...defaultProps} currentPath="/contacts" />);
    
    expect(screen.getByText('Relationships')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('hides relationship categories on non-contacts pages', () => {
    render(<Sidebar {...defaultProps} currentPath="/groups" />);
    
    expect(screen.queryByText('Relationships')).not.toBeInTheDocument();
  });

  it('displays category counts', () => {
    render(<Sidebar {...defaultProps} currentPath="/contacts" />);
    
    expect(screen.getByText('5')).toBeInTheDocument(); // Friend count
    expect(screen.getByText('3')).toBeInTheDocument(); // Colleague count
  });


  it('shows helper text for drag and drop', () => {
    render(<Sidebar {...defaultProps} currentPath="/contacts" />);
    
    expect(screen.getByText(/Drag and drop contacts into a category/)).toBeInTheDocument();
  });
});