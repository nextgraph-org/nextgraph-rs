import { useState, useEffect, useMemo } from 'react';
import type { BookmarkedItem, Collection, CollectionStats } from '@/types/collection';

export const useMyCollection = () => {
  const [items, setItems] = useState<BookmarkedItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stats] = useState<CollectionStats>({
    totalItems: 0,
    unreadItems: 0,
    favoriteItems: 0,
    byType: {},
    byCategory: {},
    recentlyAdded: 0,
  });

  useEffect(() => {
    const mockCollections: Collection[] = [
      {
        id: 'reading-list',
        name: 'Reading List',
        description: 'Articles to read later',
        items: [],
        isDefault: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        updatedAt: new Date(),
      },
      {
        id: 'design-inspiration',
        name: 'Design Inspiration',
        description: 'Design ideas and inspiration',
        items: [],
        isDefault: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
        updatedAt: new Date(),
      },
      {
        id: 'tech-resources',
        name: 'Tech Resources',
        description: 'Useful development resources',
        items: [],
        isDefault: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        updatedAt: new Date(),
      },
    ];

    const mockItems: BookmarkedItem[] = [
      {
        id: '1',
        originalId: 'article-123',
        type: 'article',
        title: 'The Future of Web Development',
        description: 'An in-depth look at emerging trends in web development including AI integration and new frameworks.',
        content: 'Web development is evolving rapidly with new technologies...',
        author: {
          id: 'author-1',
          name: 'Sarah Johnson',
          avatar: '/api/placeholder/40/40',
        },
        source: 'TechBlog',
        bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        tags: ['web-development', 'ai', 'trends'],
        notes: 'Good insights on AI integration. Need to research the frameworks mentioned.',
        category: 'Technology',
        isRead: false,
        isFavorite: true,
      },
      {
        id: '2',
        originalId: 'post-456',
        type: 'post',
        title: 'Remote Work Best Practices',
        description: 'Tips for staying productive while working remotely',
        content: 'Working remotely requires discipline and the right tools...',
        author: {
          id: 'author-2',
          name: 'Mike Chen',
          avatar: '/api/placeholder/40/40',
        },
        source: 'LinkedIn',
        bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        tags: ['remote-work', 'productivity', 'tips'],
        category: 'Work',
        isRead: true,
        isFavorite: false,
      },
      {
        id: '3',
        originalId: 'link-789',
        type: 'link',
        title: 'Design System Component Library',
        url: 'https://designsystem.example.com',
        description: 'Comprehensive component library for modern design systems',
        author: {
          id: 'author-3',
          name: 'Design Team',
          avatar: '/api/placeholder/40/40',
        },
        source: 'Design Community',
        bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        tags: ['design-system', 'components', 'ui'],
        notes: 'Great reference for our upcoming design system project',
        category: 'Design',
        isRead: false,
        isFavorite: true,
      },
      {
        id: '4',
        originalId: 'offer-101',
        type: 'offer',
        title: 'Freelance React Developer Available',
        description: 'Experienced React developer offering freelance services',
        author: {
          id: 'author-4',
          name: 'Alex Rodriguez',
          avatar: '/api/placeholder/40/40',
        },
        source: 'Freelance Board',
        bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
        tags: ['react', 'freelance', 'development'],
        category: 'Opportunities',
        isRead: true,
        isFavorite: false,
      },
      {
        id: '5',
        originalId: 'image-202',
        type: 'image',
        title: 'Modern Office Interior Design',
        imageUrl: '/api/placeholder/600/400',
        description: 'Beautiful modern office space with natural lighting',
        author: {
          id: 'author-5',
          name: 'Interior Design Studio',
          avatar: '/api/placeholder/40/40',
        },
        source: 'Design Portfolio',
        bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
        tags: ['office', 'interior', 'modern'],
        category: 'Design',
        isRead: true,
        isFavorite: true,
      },
      {
        id: '6',
        originalId: 'file-303',
        type: 'file',
        title: 'Product Strategy Template',
        description: 'Comprehensive template for product strategy documentation',
        author: {
          id: 'author-6',
          name: 'Product Manager',
          avatar: '/api/placeholder/40/40',
        },
        source: 'Product Community',
        bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
        tags: ['product', 'strategy', 'template'],
        notes: 'Use this for Q2 strategy planning',
        category: 'Product',
        isRead: false,
        isFavorite: false,
      },
    ];

    setCollections(mockCollections);
    setItems(mockItems);
    //setFilteredItems(mockItems);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCollection = selectedCollection === 'all';
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      return matchesSearch && matchesCollection && matchesCategory;
    });
  }, [items, searchQuery, selectedCollection, selectedCategory]);

  const categories = useMemo(() => 
    [...new Set(items.map(item => item.category).filter(Boolean))] as string[]
  , [items]);

  const handleToggleFavorite = (itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const handleMarkAsRead = (itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, isRead: true, lastViewedAt: new Date() } : item
    ));
  };

  return {
    items: filteredItems,
    collections,
    categories,
    stats,
    searchQuery,
    setSearchQuery,
    selectedCollection,
    setSelectedCollection,
    selectedCategory,
    setSelectedCategory,
    handleToggleFavorite,
    handleMarkAsRead,
  };
};