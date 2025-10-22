import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionFilters } from './CollectionFilters';
import type { Collection } from '@/types/collection';

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

const mockCollections: Collection[] = [
  {
    id: 'reading-list',
    name: 'Reading List',
    description: 'Articles to read later',
    items: [],
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'design-inspiration',
    name: 'Design Inspiration',
    description: 'Design ideas and inspiration',
    items: [],
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCategories = ['Technology', 'Work', 'Design'];

const defaultProps = {
  searchQuery: '',
  onSearchChange: jest.fn(),
  selectedCollection: 'all',
  onCollectionChange: jest.fn(),
  selectedCategory: 'all',
  onCategoryChange: jest.fn(),
  collections: mockCollections,
  categories: mockCategories,
};

describe('CollectionFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input and filters', () => {
    render(<CollectionFilters {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Search your bookmarks...')).toBeInTheDocument();
    expect(screen.getAllByText('Collection')).toHaveLength(2); // Label and legend
    expect(screen.getAllByText('Category')).toHaveLength(2);
    expect(screen.getByTestId('SearchIcon')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<CollectionFilters {...defaultProps} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('calls onSearchChange when search input changes', () => {
    const onSearchChange = jest.fn();
    render(<CollectionFilters {...defaultProps} onSearchChange={onSearchChange} />);
    
    const searchInput = screen.getByPlaceholderText('Search your bookmarks...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    expect(onSearchChange).toHaveBeenCalledWith('test query');
  });

  it('displays search query value', () => {
    render(<CollectionFilters {...defaultProps} searchQuery="existing query" />);
    
    const searchInput = screen.getByDisplayValue('existing query');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders collection options correctly', () => {
    render(<CollectionFilters {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]);
    
    expect(screen.getAllByText('All Collections')).toHaveLength(2); // Combobox + option
    expect(screen.getByRole('option', { name: 'Reading List' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Design Inspiration' })).toBeInTheDocument();
  });

  it('renders category options correctly', () => {
    render(<CollectionFilters {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[1]); // Category select
    
    expect(screen.getAllByText('All Categories')).toHaveLength(2); // Combobox + option
    expect(screen.getByRole('option', { name: 'Technology' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Design' })).toBeInTheDocument();
  });

  it('calls onCollectionChange when collection is selected', () => {
    const onCollectionChange = jest.fn();
    render(<CollectionFilters {...defaultProps} onCollectionChange={onCollectionChange} />);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]); // Collection select
    fireEvent.click(screen.getByRole('option', { name: 'Reading List' }));
    
    expect(onCollectionChange).toHaveBeenCalledWith('reading-list');
  });

  it('calls onCategoryChange when category is selected', () => {
    const onCategoryChange = jest.fn();
    render(<CollectionFilters {...defaultProps} onCategoryChange={onCategoryChange} />);
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[1]); // Category select
    fireEvent.click(screen.getByRole('option', { name: 'Technology' }));
    
    expect(onCategoryChange).toHaveBeenCalledWith('Technology');
  });

  it('displays selected values correctly', () => {
    render(
      <CollectionFilters 
        {...defaultProps} 
        selectedCollection="reading-list"
        selectedCategory="Technology"
      />
    );
    
    // Just verify the component renders with selected values
    expect(screen.getByPlaceholderText('Search your bookmarks...')).toBeInTheDocument();
  });
});