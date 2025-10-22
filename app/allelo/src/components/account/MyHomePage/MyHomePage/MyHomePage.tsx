import { useState, useEffect, forwardRef } from 'react';
import { Box } from '@mui/material';
import { WelcomeBanner } from '../WelcomeBanner';
import { QuickActions } from '../QuickActions';
import { RecentActivity } from '../RecentActivity';
import type { MyHomePageProps } from '../types';
import type { UserContent, ContentFilter, ContentStats, ContentType } from '@/types/userContent';

export const MyHomePage = forwardRef<HTMLDivElement, MyHomePageProps>(
  ({ className }, ref) => {
    const [content, setContent] = useState<UserContent[]>([]);
    const [filteredContent, setFilteredContent] = useState<UserContent[]>([]);
    const [filter] = useState<ContentFilter>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<'all' | ContentType>('all');
    const [menuAnchor, setMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});
    const [filterMenuAnchor, setFilterMenuAnchor] = useState<HTMLElement | null>(null);
    const [stats, setStats] = useState<ContentStats>({
      totalItems: 0,
      byType: {
        post: 0,
        offer: 0,
        want: 0,
        image: 0,
        link: 0,
        file: 0,
        article: 0,
      },
      byVisibility: {
        public: 0,
        network: 0,
        private: 0,
      },
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
    });

    useEffect(() => {
      const mockContent: UserContent[] = [
        {
          id: '1',
          type: 'post',
          title: 'Thoughts on Remote Work Culture',
          content: 'After working remotely for 3 years, I\'ve learned that the key to success is creating boundaries and maintaining human connections...',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          tags: ['remote-work', 'productivity', 'culture'],
          visibility: 'public',
          viewCount: 245,
          likeCount: 18,
          commentCount: 7,
          rCardIds: ['business', 'colleague'],
          attachments: [],
        },
        {
          id: '2',
          type: 'offer',
          title: 'UI/UX Design Consultation',
          description: 'Offering design consultation services for early-stage startups',
          content: 'I\'m offering UI/UX design consultation for early-stage startups. 10+ years experience with SaaS products.',
          category: 'Design Services',
          price: '$150/hour',
          availability: 'available',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          tags: ['design', 'consultation', 'startup'],
          visibility: 'network',
          viewCount: 89,
          likeCount: 12,
          commentCount: 3,
          rCardIds: ['business', 'colleague'],
        },
        {
          id: '3',
          type: 'want',
          title: 'Looking for React Native Developer',
          description: 'Need an experienced React Native developer for mobile app project',
          content: 'Looking for an experienced React Native developer to help with a mobile app project. 3-month contract, remote work possible.',
          category: 'Development',
          budget: '$5000-8000',
          urgency: 'high',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
          tags: ['react-native', 'mobile', 'contract'],
          visibility: 'public',
          viewCount: 156,
          likeCount: 8,
          commentCount: 15,
          rCardIds: ['business'],
        },
        {
          id: '4',
          type: 'link',
          title: 'Great Article on Design Systems',
          url: 'https://designsystems.com/article',
          linkTitle: 'Building Scalable Design Systems',
          linkDescription: 'A comprehensive guide to creating and maintaining design systems that scale with your organization.',
          domain: 'designsystems.com',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
          tags: ['design-systems', 'article', 'resource'],
          visibility: 'public',
          viewCount: 67,
          likeCount: 14,
          commentCount: 2,
          rCardIds: ['business', 'colleague'],
        },
        {
          id: '5',
          type: 'image',
          title: 'Office Setup 2024',
          imageUrl: '/api/placeholder/600/400',
          imageAlt: 'Modern home office setup with dual monitors',
          caption: 'Finally got my home office setup just right! Dual 4K monitors and a standing desk make all the difference.',
          dimensions: { width: 600, height: 400 },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
          tags: ['office', 'setup', 'workspace'],
          visibility: 'network',
          viewCount: 123,
          likeCount: 24,
          commentCount: 9,
          rCardIds: ['colleague', 'friend'],
        },
        {
          id: '6',
          type: 'file',
          title: 'Product Requirements Template',
          fileName: 'PRD_Template_v2.pdf',
          fileUrl: '/files/prd-template.pdf',
          fileSize: 2048576,
          fileType: 'application/pdf',
          downloadCount: 45,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
          tags: ['template', 'product', 'documentation'],
          visibility: 'public',
          viewCount: 89,
          likeCount: 16,
          commentCount: 4,
          rCardIds: ['business'],
        },
        {
          id: '7',
          type: 'article',
          title: 'The Future of Product Management',
          content: 'In this comprehensive article, I explore how AI and automation are reshaping the role of product managers...',
          excerpt: 'AI and automation are reshaping product management. Here\'s what PMs need to know about the future.',
          readTime: 8,
          publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 168),
          featuredImage: '/api/placeholder/400/200',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 168),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 168),
          tags: ['product-management', 'ai', 'future'],
          visibility: 'public',
          viewCount: 342,
          likeCount: 28,
          commentCount: 12,
          rCardIds: ['business', 'colleague'],
        },
      ];

      setContent(mockContent);
      setFilteredContent(mockContent);

      const newStats: ContentStats = {
        totalItems: mockContent.length,
        byType: {
          post: mockContent.filter(c => c.type === 'post').length,
          offer: mockContent.filter(c => c.type === 'offer').length,
          want: mockContent.filter(c => c.type === 'want').length,
          image: mockContent.filter(c => c.type === 'image').length,
          link: mockContent.filter(c => c.type === 'link').length,
          file: mockContent.filter(c => c.type === 'file').length,
          article: mockContent.filter(c => c.type === 'article').length,
        },
        byVisibility: {
          public: mockContent.filter(c => c.visibility === 'public').length,
          network: mockContent.filter(c => c.visibility === 'network').length,
          private: mockContent.filter(c => c.visibility === 'private').length,
        },
        totalViews: mockContent.reduce((sum, c) => sum + c.viewCount, 0),
        totalLikes: mockContent.reduce((sum, c) => sum + c.likeCount, 0),
        totalComments: mockContent.reduce((sum, c) => sum + c.commentCount, 0),
      };
      setStats(newStats);
    }, []);

    useEffect(() => {
      let filtered = [...content];

      if (selectedTab !== 'all') {
        filtered = filtered.filter(item => item.type === selectedTab);
      }

      if (searchQuery) {
        filtered = filtered.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      setFilteredContent(filtered);
    }, [content, selectedTab, searchQuery, filter]);

    const handleMenuOpen = (contentId: string, anchorEl: HTMLElement) => {
      setMenuAnchor({ ...menuAnchor, [contentId]: anchorEl });
    };

    const handleMenuClose = (contentId: string) => {
      setMenuAnchor({ ...menuAnchor, [contentId]: null });
    };

    const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
      setFilterMenuAnchor(event.currentTarget);
    };

    const handleFilterMenuClose = () => {
      setFilterMenuAnchor(null);
    };

    const handleTabChange = (tab: 'all' | ContentType) => {
      setSelectedTab(tab);
    };

    const handleContentAction = (contentId: string, action: string) => {
      console.log(`Action ${action} on content ${contentId}`);
    };

    return (
      <Box ref={ref} className={className}>
        <WelcomeBanner
          contentStats={stats}
        />
        
        <QuickActions
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTab={selectedTab}
          onTabChange={handleTabChange}
          filterMenuAnchor={filterMenuAnchor}
          onFilterMenuOpen={handleFilterMenuOpen}
          onFilterMenuClose={handleFilterMenuClose}
          contentStats={stats}
        />
        
        <RecentActivity
          content={filteredContent}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTab={selectedTab}
          onTabChange={handleTabChange}
          onContentAction={handleContentAction}
          onMenuOpen={handleMenuOpen}
          onMenuClose={handleMenuClose}
          menuAnchor={menuAnchor}
        />
      </Box>
    );
  }
);

MyHomePage.displayName = 'MyHomePage';