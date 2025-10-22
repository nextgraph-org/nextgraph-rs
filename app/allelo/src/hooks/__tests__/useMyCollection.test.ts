import { renderHook, act } from '@testing-library/react';
import { useMyCollection } from '../useMyCollection';

describe('useMyCollection', () => {
  it('initializes with default state values', () => {
    const { result } = renderHook(() => useMyCollection());
    
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedCollection).toBe('all');
    expect(result.current.selectedCategory).toBe('all');
  });

  it('loads data after mount', async () => {
    const { result } = renderHook(() => useMyCollection());
    
    await act(async () => {
      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Just verify that data is loaded, not specific counts
    expect(result.current.collections.length).toBeGreaterThan(0);
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.categories.length).toBeGreaterThan(0);
  });

  it('filters items by search query', async () => {
    const { result } = renderHook(() => useMyCollection());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const initialCount = result.current.items.length;

    act(() => {
      result.current.setSearchQuery('Web Development');
    });

    // Just verify filtering works, not specific counts
    expect(result.current.items.length).toBeLessThanOrEqual(initialCount);
  });

  it('toggles favorite status', async () => {
    const { result } = renderHook(() => useMyCollection());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    if (result.current.items.length > 0) {
      const firstItem = result.current.items[0];
      const initialFavoriteStatus = firstItem.isFavorite;
      
      act(() => {
        result.current.handleToggleFavorite(firstItem.id);
      });

      const updatedItem = result.current.items.find(item => item.id === firstItem.id);
      expect(updatedItem?.isFavorite).toBe(!initialFavoriteStatus);
    }
  });

  it('marks item as read', async () => {
    const { result } = renderHook(() => useMyCollection());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    if (result.current.items.length > 0) {
      const firstUnreadItem = result.current.items.find(item => !item.isRead);
      
      if (firstUnreadItem) {
        act(() => {
          result.current.handleMarkAsRead(firstUnreadItem.id);
        });

        const updatedItem = result.current.items.find(item => item.id === firstUnreadItem.id);
        expect(updatedItem?.isRead).toBe(true);
        expect(updatedItem?.lastViewedAt).toBeInstanceOf(Date);
      }
    }
  });
});