import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyCollectionPage } from './MyCollectionPage';

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

describe('MyCollectionPage', () => {
  it('renders page components', () => {
    render(<MyCollectionPage />);
    
    expect(screen.getByText('My Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Query Collection')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search your bookmarks...')).toBeInTheDocument();
    expect(screen.getAllByText('Collection')).toHaveLength(2); // Label and legend
    expect(screen.getAllByText('Category')).toHaveLength(2);
  });

  it('displays mock data items', async () => {
    render(<MyCollectionPage />);
    
    await waitFor(() => {
      expect(screen.getByText('The Future of Web Development')).toBeInTheDocument();
      expect(screen.getByText('Remote Work Best Practices')).toBeInTheDocument();
    });
  });

  it('opens query dialog when Query Collection button is clicked', () => {
    render(<MyCollectionPage />);
    
    fireEvent.click(screen.getByText('Query Collection'));
    
    expect(screen.getByText('AI Query Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask me about your collection/)).toBeInTheDocument();
  });

  it('filters items based on search query', async () => {
    render(<MyCollectionPage />);
    
    await waitFor(() => {
      expect(screen.getByText('The Future of Web Development')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText('Search your bookmarks...');
    fireEvent.change(searchInput, { target: { value: 'remote' } });
    
    await waitFor(() => {
      expect(screen.getByText('Remote Work Best Practices')).toBeInTheDocument();
      expect(screen.queryByText('The Future of Web Development')).not.toBeInTheDocument();
    });
  });


  it('filters by collection', async () => {
    render(<MyCollectionPage />);
    
    await waitFor(() => {
      expect(screen.getByText('The Future of Web Development')).toBeInTheDocument();
    });
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]); // Collection select
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Reading List' })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('option', { name: 'Reading List' }));
    
    // Since items don't have collection assignments in mock data,
    // selecting a specific collection filters out all items
    await waitFor(() => {
      expect(screen.getByText('No bookmarks found')).toBeInTheDocument();
    });
  });

  it('filters by category', async () => {
    render(<MyCollectionPage />);
    
    await waitFor(() => {
      expect(screen.getByText('The Future of Web Development')).toBeInTheDocument();
    });
    
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[1]); // Category select
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Technology' })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('option', { name: 'Technology' }));
    
    await waitFor(() => {
      expect(screen.getByText('The Future of Web Development')).toBeInTheDocument();
      expect(screen.queryByText('Remote Work Best Practices')).not.toBeInTheDocument();
    });
  });

  it('handles query dialog interactions', async () => {
    render(<MyCollectionPage />);
    
    fireEvent.click(screen.getByText('Query Collection'));
    
    const queryInput = screen.getByPlaceholderText(/Ask me about your collection/);
    fireEvent.change(queryInput, { target: { value: 'test query' } });
    
    const sendButton = screen.getByTestId('SendIcon').closest('button');
    expect(sendButton).not.toBeDisabled();
    
    fireEvent.click(sendButton!);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes query dialog with close button', async () => {
    render(<MyCollectionPage />);
    
    fireEvent.click(screen.getByText('Query Collection'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Close'));
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles Enter key in query dialog', async () => {
    render(<MyCollectionPage />);
    
    fireEvent.click(screen.getByText('Query Collection'));
    
    const queryInput = screen.getByPlaceholderText(/Ask me about your collection/);
    fireEvent.change(queryInput, { target: { value: 'test query' } });
    
    fireEvent.keyDown(queryInput, { key: 'Enter', shiftKey: false });
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders empty state correctly', async () => {
    render(<MyCollectionPage />);
    
    await waitFor(() => {
      expect(screen.getByText('The Future of Web Development')).toBeInTheDocument();
    });
    
    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search your bookmarks...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent content' } });
    
    await waitFor(() => {
      expect(screen.getByText('No bookmarks found')).toBeInTheDocument();
      expect(screen.getByText('No bookmarks match "nonexistent content"')).toBeInTheDocument();
    });
  });
});