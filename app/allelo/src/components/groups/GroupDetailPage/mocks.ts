import type {GroupLink, GroupPost} from '@/types/group';
import {Message} from "@/components/chat/Conversation";
import {ConversationProps} from "@/components/chat/ConversationList/types";
import {GroupMessage} from "@/components/groups/GroupDetailPage/types";

export interface MockMember {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  relationshipStrength: number;
  position: { x: number; y: number };
  activities: Array<{ topic: string; count: number; lastActive: string }>;
  location?: { lat: number; lng: number; visible: boolean };
  vouches: number;
  praises: number;
  connections: string[];
}

export interface ExtendedPost extends GroupPost {
  topic?: string;
  images?: string[];
  isLong?: boolean;
}

export const getMockMembers = (): MockMember[] => [
  {
    id: 'oli-sb',
    name: 'Oliver Sylvester-Bradley',
    initials: 'OS',
    avatar: 'images/Oli.jpg',
    relationshipStrength: 1.0,
    position: { x: 0, y: 0 }, // Center node
    activities: [
      { topic: 'NAO Genesis', count: 25, lastActive: '1 hour ago' },
      { topic: 'Network Building', count: 18, lastActive: '3 hours ago' }
    ],
    location: { lat: 40.7128, lng: -74.0060, visible: true },
    vouches: 15,
    praises: 22,
    connections: ['ruben-daniels', 'margeigh-novotny', 'alex-lion', 'day-waterbury', 'kevin-triplett', 'tim-bansemer']
  },
  {
    id: 'ruben-daniels',
    name: 'Ruben Daniels',
    initials: 'RD',
    avatar: 'images/Ruben.jpg',
    relationshipStrength: 0.95,
    position: { x: -120, y: -80 },
    activities: [
      { topic: 'Career Development', count: 20, lastActive: '45 minutes ago' },
      { topic: 'Education Tech', count: 15, lastActive: '2 hours ago' }
    ],
    location: { lat: 40.7158, lng: -74.0090, visible: true },
    vouches: 12,
    praises: 18,
    connections: ['oli-sb', 'margeigh-novotny', 'alex-lion', 'kevin-triplett']
  },
  {
    id: 'margeigh-novotny',
    name: 'Margeigh Novotny',
    initials: 'MN',
    avatar: 'images/Margeigh.jpg',
    relationshipStrength: 0.95,
    position: { x: 120, y: -80 },
    activities: [
      { topic: 'Sustainable Tech', count: 22, lastActive: '1 hour ago' },
      { topic: 'Environmental Innovation', count: 16, lastActive: '4 hours ago' }
    ],
    location: { lat: 40.7098, lng: -74.0030, visible: true },
    vouches: 11,
    praises: 19,
    connections: ['oli-sb', 'ruben-daniels', 'tree-willard', 'day-waterbury']
  },
  {
    id: 'alex-lion',
    name: 'Alex Lion Yes!',
    initials: 'AL',
    avatar: 'images/Alex.jpg',
    relationshipStrength: 0.8,
    position: { x: -80, y: 120 },
    activities: [
      { topic: 'AI Technology', count: 28, lastActive: '2 hours ago' },
      { topic: 'Innovation Labs', count: 12, lastActive: '1 day ago' }
    ],
    location: { lat: 40.7098, lng: -74.0090, visible: true },
    vouches: 14,
    praises: 16,
    connections: ['oli-sb', 'ruben-daniels', 'aza-mafi', 'joscha-raue']
  },
  {
    id: 'day-waterbury',
    name: 'Day Waterbury',
    initials: 'DW',
    avatar: 'images/Day.jpg',
    relationshipStrength: 0.75,
    position: { x: 140, y: 90 },
    activities: [
      { topic: 'Social Impact', count: 18, lastActive: '3 hours ago' },
      { topic: 'Impact Investing', count: 10, lastActive: '1 day ago' }
    ],
    location: { lat: 40.7068, lng: -74.0040, visible: true },
    vouches: 9,
    praises: 13,
    connections: ['oli-sb', 'margeigh-novotny', 'tree-willard']
  },
  {
    id: 'kevin-triplett',
    name: 'Kevin Triplett',
    initials: 'KT',
    avatar: 'images/Kevin.jpg',
    relationshipStrength: 0.85,
    position: { x: -140, y: 60 },
    activities: [
      { topic: 'Technology Philosophy', count: 24, lastActive: '4 hours ago' },
      { topic: 'Future Vision', count: 11, lastActive: '6 hours ago' }
    ],
    location: { lat: 40.7138, lng: -74.0070, visible: true },
    vouches: 16,
    praises: 20,
    connections: ['oli-sb', 'ruben-daniels', 'aza-mafi']
  },
  {
    id: 'tim-bansemer',
    name: 'Tim Bansemer',
    initials: 'TB',
    avatar: 'images/Tim.jpg',
    relationshipStrength: 0.7,
    position: { x: 0, y: -140 },
    activities: [
      { topic: 'Blockchain Protocols', count: 16, lastActive: '5 hours ago' },
      { topic: 'P2P Networks', count: 8, lastActive: '2 days ago' }
    ],
    location: { lat: 40.7200, lng: -74.0060, visible: true },
    vouches: 8,
    praises: 12,
    connections: ['oli-sb', 'niko-bonnieure']
  }
];

export const getConversations = (): ConversationProps[] => {
  return [
    {
      id: '1',
      name: 'Alex Lion Yes!',
      avatar: '/images/Alex.jpg',
      isGroup: false,
      lastMessage: 'Hey! How did the presentation go today?',
      lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      unreadCount: 2,
      isOnline: true,
      lastActivity: 'Active now'
    },
    {
      id: '2',
      name: 'NAOG1 Team',
      avatar: '/naog1-butterfly-logo.svg',
      isGroup: true,
      lastMessage: 'Oliver: Just uploaded the governance framework for review',
      lastMessageTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      unreadCount: 5,
      members: ['Oliver', 'Sarah', 'Mike', '12 others'],
      lastActivity: '15 members active'
    },
    {
      id: '3',
      name: 'Aza Mafi',
      avatar: '/images/Aza.jpg',
      isGroup: false,
      lastMessage: 'The human-centered design principles are fascinating',
      lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      unreadCount: 0,
      isOnline: false,
      lastActivity: '2 hours ago'
    },
    {
      id: '4',
      name: 'React Developers',
      isGroup: true,
      lastMessage: 'Brad: Has anyone tried the new React 19 features yet?',
      lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      unreadCount: 8,
      members: ['Brad', 'Alex', 'Sarah', '12 others'],
      lastActivity: '8 members active'
    },
    {
      id: '5',
      name: 'David Thomson',
      avatar: '/images/David.jpg',
      isGroup: false,
      lastMessage: 'The climate tech startup space is really heating up',
      lastMessageTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      unreadCount: 1,
      isOnline: false,
      lastActivity: '6 hours ago'
    },
    {
      id: '6',
      name: 'Community Garden Planning',
      isGroup: true,
      lastMessage: 'Tree: Winter planning meeting this Saturday at 10am!',
      lastMessageTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      unreadCount: 0,
      members: ['Tree', 'Day', 'Margeigh', '29 others'],
      lastActivity: '12 members active'
    }
  ];
}

export const getMessagesForConversation = (conversationId: string): Message[] => {
  if (conversationId === '2') { // NAOG1 Team group chat
    return [
      {
        id: '1',
        text: 'Morning everyone! How are we doing with the governance framework?',
        sender: 'Sarah Chen',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isOwn: false
      },
      {
        id: '2',
        text: 'Great progress! I\'ve been working on the legal structure documentation.',
        sender: 'You',
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
        isOwn: true
      },
      {
        id: '3',
        text: 'That\'s fantastic! The technical architecture is coming along well too.',
        sender: 'Mike Torres',
        timestamp: new Date(Date.now() - 75 * 60 * 1000),
        isOwn: false
      },
      {
        id: '4',
        text: 'Just uploaded the governance framework for review. Please check it out!',
        sender: 'Oliver Sylvester-Bradley',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        isOwn: false
      },
      {
        id: '5',
        text: 'Looks amazing Oliver! Really comprehensive approach.',
        sender: 'You',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        isOwn: true
      }
    ];
  } else if (conversationId === '4') { // React Developers group chat
    return [
      {
        id: '1',
        text: 'Has anyone tried the new React 19 features yet?',
        sender: 'Brad de Graf',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isOwn: false
      },
      {
        id: '2',
        text: 'Yes! The compiler changes are really impressive for performance.',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
        isOwn: false
      },
      {
        id: '3',
        text: 'I\'ve been testing it out - the automatic memoization is a game changer!',
        sender: 'You',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isOwn: true
      },
      {
        id: '4',
        text: 'Agreed! Much cleaner than manual useMemo everywhere.',
        sender: 'Sarah Chen',
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
        isOwn: false
      }
    ];
  } else { // Default DM messages (Alex Lion Yes!)
    return [
      {
        id: '1',
        text: 'Hey! How are you doing?',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        isOwn: false
      },
      {
        id: '2',
        text: 'Great! Just finished working on the new NAO features. How about you?',
        sender: 'You',
        timestamp: new Date(Date.now() - 110 * 60 * 1000),
        isOwn: true
      },
      {
        id: '3',
        text: 'That sounds amazing! I\'d love to hear more about what you\'ve been building.',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 100 * 60 * 1000),
        isOwn: false
      },
      {
        id: '4',
        text: 'We\'ve been focusing on improving the user experience and making the network more intuitive. The new theme looks really clean!',
        sender: 'You',
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
        isOwn: true
      },
      {
        id: '5',
        text: 'I love that! User experience is so important. What specific areas are you focusing on?',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 80 * 60 * 1000),
        isOwn: false
      },
      {
        id: '6',
        text: 'Mainly the messaging interface, contact management, and onboarding flow. We want to make it feel natural and intuitive.',
        sender: 'You',
        timestamp: new Date(Date.now() - 70 * 60 * 1000),
        isOwn: true
      },
      {
        id: '7',
        text: 'The messaging updates sound particularly interesting. Are you implementing real-time features?',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        isOwn: false
      },
      {
        id: '8',
        text: 'Yes! Real-time messaging, typing indicators, read receipts - the whole package. We want it to feel as smooth as any modern chat app.',
        sender: 'You',
        timestamp: new Date(Date.now() - 50 * 60 * 1000),
        isOwn: true
      },
      {
        id: '9',
        text: 'That\'s fantastic! The network really needs that level of polish. When are you planning to roll it out?',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 40 * 60 * 1000),
        isOwn: false
      },
      {
        id: '10',
        text: 'We\'re aiming for next month. Still doing final testing and refinements, but it\'s looking really promising.',
        sender: 'You',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        isOwn: true
      },
      {
        id: '11',
        text: 'Can\'t wait to try it! I\'ve been really impressed with the direction NAO is heading.',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        isOwn: false
      },
      {
        id: '12',
        text: 'Thanks! That means a lot. The community feedback has been incredible and really drives us forward.',
        sender: 'You',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        isOwn: true
      },
      {
        id: '13',
        text: 'Speaking of community - how was your presentation today? I heard it went really well!',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        isOwn: false
      },
      {
        id: '14',
        text: 'It went better than expected! The team loved the new features demo. Got some great questions about the technical architecture.',
        sender: 'You',
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        isOwn: true
      },
      {
        id: '15',
        text: 'Hey! How did the presentation go today?',
        sender: 'Alex Lion Yes!',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        isOwn: false
      }
    ];
  }
};

export const getGroupMessages = (): GroupMessage[] => [
  {
    id: '1',
    text: 'Hey everyone! Just uploaded the latest proposal to the docs section. Would love to get your thoughts!',
    sender: 'Oliver Sylvester-Bradley',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isOwn: false
  },
  {
    id: '2',
    text: 'Thanks Oliver! I\'ll review it this afternoon. The networking improvements look really promising.',
    sender: 'You',
    timestamp: new Date(Date.now() - 90 * 60 * 1000),
    isOwn: true
  },
  {
    id: '3',  
    text: 'Great work on the technical architecture! The decentralized approach should definitely improve reliability.',
    sender: 'Sarah Chen',
    timestamp: new Date(Date.now() - 75 * 60 * 1000),
    isOwn: false
  },
  {
    id: '4',
    text: 'I\'ve been testing the new protocols in my local environment. Performance looks excellent so far!',
    sender: 'Mike Torres',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    isOwn: false
  },
  {
    id: '5',
    text: 'This is exactly what we need for scaling up. When do we plan to implement this?',
    sender: 'You',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    isOwn: true
  },
  {
    id: '6',
    text: 'Planning to roll out in phases starting next month. I\'ll create a timeline in the project section.',
    sender: 'Oliver Sylvester-Bradley',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    isOwn: false
  },
  {
    id: '7',
    text: 'Perfect! I can help with the testing and validation phase.',
    sender: 'Sarah Chen',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    isOwn: false
  },
  {
    id: '8',
    text: 'Count me in for the deployment phase. I have experience with similar architectures.',
    sender: 'Mike Torres',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    isOwn: false
  },
  {
    id: '9', 
    text: 'Awesome team collaboration! Let\'s schedule a sync meeting to discuss the details.',
    sender: 'You',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    isOwn: true
  }
];

export const getMockPosts = (groupId: string): ExtendedPost[] => [
  {
    id: '1',
    groupId: groupId,
    authorId: 'ruben-daniels',
    authorName: 'Ruben Daniels',
    authorAvatar: 'images/Ruben.jpg',
    content: 'Excited to share some insights from our recent community building research! The data shows that peer-to-peer learning increases engagement by 300%. Looking forward to implementing these findings in our next workshop series.',
    topic: 'Garden Planning',
    images: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
      'https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?w=400'
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    likes: 12,
    comments: 5,
  },
  {
    id: '2',
    groupId: groupId,
    authorId: 'oliver-sb',
    authorName: 'Oliver Sylvester-Bradley',
    authorAvatar: 'images/Oli.jpg',
    content: 'Just finished reviewing the latest networking protocols for our upcoming NAO infrastructure upgrade. The decentralized approach we\'re implementing should improve connection reliability by 40%. Technical details in the documents section.',
    topic: 'Tool Sharing',
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    likes: 8,
    comments: 3,
  },
  {
    id: '3',
    groupId: groupId,
    authorId: 'margeigh-novotny',
    authorName: 'Margeigh Novotny',
    authorAvatar: 'images/Margeigh.jpg',
    content: 'Leading a deep dive into sustainable technology frameworks for our next quarter. After extensive research into environmental innovation patterns, here are the key insights I\'ve compiled:\n\n1. Circular economy models show 40% better resource efficiency\n2. Renewable energy integration reduces operational costs by 60%\n3. Smart monitoring systems optimize performance\n4. Community engagement drives adoption rates\n5. Long-term impact measurement is essential\n\nI\'ve also been working with several cleantech startups on implementation strategies. They\'re offering pilot program partnerships that could significantly accelerate our sustainability goals.\n\nWhat are everyone\'s thoughts on this roadmap? I\'m excited to lead the sustainability working group if there\'s interest.',
    topic: 'Composting',
    isLong: true,
    images: ['https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400'],
    createdAt: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 120),
    likes: 15,
    comments: 8,
  }
];

export const getMockLinks = (groupId?: string) => {
  const mockLinks: GroupLink[] = [
    {
      id: '1',
      groupId: groupId ?? "1",
      title: 'Industry Best Practices Guide',
      url: 'https://example.com/guide',
      description: 'Comprehensive guide on industry best practices',
      sharedBy: 'user1',
      sharedByName: 'John Doe',
      sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      tags: ['guide', 'best-practices']
    }
  ];

  return mockLinks;
}