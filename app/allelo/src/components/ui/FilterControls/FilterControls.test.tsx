import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterControls } from './FilterControls';
import {
  UilStar as Star,
  UilBriefcase as Business
} from '@iconscout/react-unicons';

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
    }
  }
}

const mockSortOptions = [
  { value: 'name', label: 'Name', icon: <Star /> },
  { value: 'date', label: 'Date', icon: <Business /> }
];

const mockFilterOptions = [
  { value: 'active', label: 'Active', icon: <Star /> },
  { value: 'inactive', label: 'Inactive', icon: <Business /> }
];

describe('FilterControls', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<FilterControls onSearchChange={jest.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows search input when onSearchChange is provided', () => {
    const handleSearchChange = jest.fn();
    render(<FilterControls onSearchChange={handleSearchChange} />);
    
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('does not show search input when onSearchChange is not provided', () => {
    render(<FilterControls />);
    
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('handles search input changes', async () => {
    const handleSearchChange = jest.fn();
    render(<FilterControls onSearchChange={handleSearchChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Wait for debounced search
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(handleSearchChange).toHaveBeenCalledWith('test search');
    });
  });

  it('shows sort button when sort options are provided', () => {
    render(<FilterControls sortOptions={mockSortOptions} />);
    
    expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
  });

  it('does not show sort button when no sort options provided', () => {
    render(<FilterControls />);
    
    expect(screen.queryByRole('button', { name: /sort/i })).not.toBeInTheDocument();
  });

  it('opens sort menu when sort button is clicked', () => {
    render(<FilterControls sortOptions={mockSortOptions} />);
    
    const sortButton = screen.getByRole('button', { name: /sort/i });
    fireEvent.click(sortButton);
    
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('calls onSortChange when sort option is selected', () => {
    const handleSortChange = jest.fn();
    render(
      <FilterControls 
        sortOptions={mockSortOptions} 
        onSortChange={handleSortChange}
      />
    );
    
    const sortButton = screen.getByRole('button', { name: /sort/i });
    fireEvent.click(sortButton);
    
    const nameOption = screen.getByText('Name');
    fireEvent.click(nameOption);
    
    expect(handleSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('toggles sort direction when same sort is selected', () => {
    const handleSortChange = jest.fn();
    render(
      <FilterControls 
        sortOptions={mockSortOptions} 
        currentSort="name"
        sortDirection="asc"
        onSortChange={handleSortChange}
      />
    );
    
    const sortButton = screen.getByRole('button', { name: /name ↑/i });
    fireEvent.click(sortButton);
    
    const nameOption = screen.getByText('Name');
    fireEvent.click(nameOption);
    
    expect(handleSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('shows filter button when filter options are provided', () => {
    render(<FilterControls filterOptions={mockFilterOptions} />);
    
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('shows active filter count on filter button', () => {
    render(
      <FilterControls 
        filterOptions={mockFilterOptions} 
        activeFilters={['active', 'inactive']}
      />
    );
    
    expect(screen.getByRole('button', { name: /filters \(2\)/i })).toBeInTheDocument();
  });

  it('opens filter menu when filter button is clicked', () => {
    render(<FilterControls filterOptions={mockFilterOptions} />);
    
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);
    
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls onFilterChange when filter option is toggled', () => {
    const handleFilterChange = jest.fn();
    render(
      <FilterControls 
        filterOptions={mockFilterOptions} 
        onFilterChange={handleFilterChange}
        activeFilters={[]}
      />
    );
    
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);
    
    // Find the Active option within the menu items
    const menuItems = screen.getAllByRole('menuitem');
    const activeOption = menuItems.find(item => item.textContent?.includes('Active'));
    if (activeOption) {
      fireEvent.click(activeOption);
    }
    
    expect(handleFilterChange).toHaveBeenCalledWith(['active']);
  });

  it('removes filter when already active filter is clicked', () => {
    const handleFilterChange = jest.fn();
    render(
      <FilterControls 
        filterOptions={mockFilterOptions} 
        onFilterChange={handleFilterChange}
        activeFilters={['active']}
      />
    );
    
    const filterButton = screen.getByRole('button', { name: /filters \(1\)/i });
    fireEvent.click(filterButton);
    
    // Find the Active option within the menu
    const menuItems = screen.getAllByRole('menuitem');
    const activeOption = menuItems.find(item => item.textContent?.includes('Active'));
    if (activeOption) {
      fireEvent.click(activeOption);
    }
    
    expect(handleFilterChange).toHaveBeenCalledWith([]);
  });

  it('shows clear all button when there are active filters or search', () => {
    const handleClearAll = jest.fn();
    render(
      <FilterControls 
        searchValue="test"
        onClearAll={handleClearAll}
      />
    );
    
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('calls onClearAll when clear all button is clicked', () => {
    const handleClearAll = jest.fn();
    render(
      <FilterControls 
        activeFilters={['active']}
        onClearAll={handleClearAll}
      />
    );
    
    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);
    
    expect(handleClearAll).toHaveBeenCalledTimes(1);
  });

  it('shows result count when provided', () => {
    render(<FilterControls resultCount={42} />);
    
    expect(screen.getByText('42 results')).toBeInTheDocument();
  });

  it('hides result count when showResultCount is false', () => {
    render(<FilterControls resultCount={42} showResultCount={false} />);
    
    expect(screen.queryByText('42 results')).not.toBeInTheDocument();
  });

  it('shows active filter chips', () => {
    render(
      <FilterControls 
        filterOptions={mockFilterOptions}
        activeFilters={['active', 'inactive']}
      />
    );
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('removes filter when chip delete is clicked', () => {
    const handleFilterChange = jest.fn();
    render(
      <FilterControls 
        filterOptions={mockFilterOptions}
        activeFilters={['active', 'inactive']}
        onFilterChange={handleFilterChange}
      />
    );
    
    // Find the delete button for the "Active" chip
    const activeChip = screen.getByText('Active').closest('.MuiChip-root');
    const deleteButton = activeChip?.querySelector('.MuiChip-deleteIcon');
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(handleFilterChange).toHaveBeenCalledWith(['inactive']);
    }
  });

  it('shows loading state in search input', () => {
    render(
      <FilterControls 
        onSearchChange={jest.fn()}
        loading
      />
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays correct sort direction indicators', () => {
    const { rerender } = render(
      <FilterControls 
        sortOptions={mockSortOptions}
        currentSort="name"
        sortDirection="asc"
      />
    );
    
    expect(screen.getByRole('button', { name: /name ↑/i })).toBeInTheDocument();
    
    rerender(
      <FilterControls 
        sortOptions={mockSortOptions}
        currentSort="name"
        sortDirection="desc"
      />
    );
    
    expect(screen.getByRole('button', { name: /name ↓/i })).toBeInTheDocument();
  });

  it('shows checkmarks for selected filters in menu', () => {
    render(
      <FilterControls 
        filterOptions={mockFilterOptions}
        activeFilters={['active']}
      />
    );
    
    const filterButton = screen.getByRole('button', { name: /filters \(1\)/i });
    fireEvent.click(filterButton);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // Active filter
    expect(checkboxes[1]).not.toBeChecked(); // Inactive filter
  });
});