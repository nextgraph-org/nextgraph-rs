import type {
  Notification,
  Vouch,
  Praise
} from '@/types/notification';

export const mockNotifications: Notification[] = [
  {
    id: 'conn-1',
    type: 'connection',
    title: 'New Connection Request',
    message: 'Emily Watson would like to connect with you',
    fromUserId: 'user-emily',
    fromUserName: 'Emily Watson',
    fromUserAvatar: undefined,
    targetUserId: 'current-user',
    isRead: false,
    isActionable: true,
    status: 'pending',
    metadata: {
      contactId: 'contact-emily',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'conn-2',
    type: 'connection',
    title: 'New Connection Request',
    message: 'David Park would like to connect with you',
    fromUserId: 'user-david',
    fromUserName: 'David Park',
    fromUserAvatar: undefined,
    targetUserId: 'current-user',
    isRead: false,
    isActionable: true,
    status: 'pending',
    metadata: {
      contactId: 'contact-david',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: '1',
    type: 'vouch',
    title: 'New Skill Vouch',
    message: 'Alex Lion Yes! vouched for your React Development skills',
    fromUserId: 'contact:1',
    fromUserName: 'Alex Lion Yes!',
    fromUserAvatar: 'images/Alex.jpg',
    targetUserId: 'current-user',
    isRead: false,
    isActionable: true,
    status: 'pending',
    metadata: {
      vouchId: 'vouch-1',
      contactId: 'contact:1',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '2',
    type: 'praise',
    title: 'New Praise',
    message: 'Ariana Bahrami praised your leadership skills',
    fromUserId: 'contact:2',
    fromUserName: 'Ariana Bahrami',
    fromUserAvatar: undefined,
    targetUserId: 'current-user',
    isRead: false,
    isActionable: true,
    status: 'pending',
    metadata: {
      praiseId: 'praise-1',
      contactId: 'contact:2',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: '3',
    type: 'vouch',
    title: 'Skill Vouch Accepted',
    message: 'Alex Lion Yes! vouched for your TypeScript skills',
    fromUserId: 'contact:1',
    fromUserName: 'Alex Lion Yes!',
    fromUserAvatar: 'images/Alex.jpg',
    targetUserId: 'current-user',
    isRead: true,
    isActionable: false,
    status: 'accepted',
    metadata: {
      vouchId: 'vouch-2',
      rCardIds: ['rcard-business', 'rcard-community'],
      contactId: 'contact:1',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // Updated 12 hours ago
  },
  {
    id: '4',
    type: 'praise',
    title: 'Teamwork Praise Accepted',
    message: 'Ariana Bahrami praised your teamwork skills',
    fromUserId: 'contact:2',
    fromUserName: 'Ariana Bahrami',
    fromUserAvatar: undefined,
    targetUserId: 'current-user',
    isRead: true,
    isActionable: false,
    status: 'accepted',
    metadata: {
      praiseId: 'praise-2',
      contactId: 'contact:2',
      rCardIds: ['rcard-friends', 'rcard-business'],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // Updated 4 hours ago
  },
  // Add some rejected notifications for testing
  {
    id: '5',
    type: 'vouch',
    title: 'Skill Vouch Rejected',
    message: 'Day Waterbury vouched for your Node.js skills',
    fromUserId: 'contact:7',
    fromUserName: 'Day Waterbury',
    fromUserAvatar: undefined,
    targetUserId: 'current-user',
    isRead: true,
    isActionable: false,
    status: 'rejected',
    metadata: {
      vouchId: 'vouch-3',
      contactId: 'contact:7',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // Rejected 2 hours ago
  },
  {
    id: '6',
    type: 'praise',
    title: 'Praise Rejected',
    message: 'Kevin Triplett praised your problem-solving skills',
    fromUserId: 'contact:12',
    fromUserName: 'Kevin Triplett',
    fromUserAvatar: undefined,
    targetUserId: 'current-user',
    isRead: true,
    isActionable: false,
    status: 'rejected',
    metadata: {
      praiseId: 'praise-3',
      contactId: 'contact:12',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1), // Rejected 1 hour ago
  },
  {
    id: '7',
    type: 'vouch',
    title: 'Skill Vouch Accepted',
    message: 'Alex Lion Yes! vouched for your Project Management skills',
    fromUserId: 'contact:1',
    fromUserName: 'Alex Lion Yes!',
    fromUserAvatar: 'images/Alex.jpg',
    targetUserId: 'current-user',
    isRead: true,
    isActionable: false,
    status: 'accepted',
    metadata: {
      vouchId: 'vouch-4',
      rCardIds: ['rcard-business'],
      contactId: 'contact:1',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 36), // Updated 1.5 days ago
  },
];

export const mockVouches: Vouch[] = [
  {
    id: 'vouch-1',
    fromUserId: 'contact:1',
    fromUserName: 'Alex Lion Yes!',
    fromUserAvatar: 'images/Alex.jpg',
    toUserId: 'current-user',
    skill: 'React Development',
    description: 'Excellent component architecture and state management. Always writes clean, maintainable code.',
    level: 'advanced',
    endorsementText: 'I worked with this person on multiple React projects and they consistently delivered high-quality solutions.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 'vouch-2',
    fromUserId: 'contact:1',
    fromUserName: 'Alex Lion Yes!',
    fromUserAvatar: 'images/Alex.jpg',
    toUserId: 'current-user',
    skill: 'TypeScript',
    description: 'Strong type safety practices and excellent knowledge of advanced TypeScript features.',
    level: 'expert',
    endorsementText: 'One of the best TypeScript developers I have worked with.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

export const mockPraises: Praise[] = [
  {
    id: 'praise-1',
    fromUserId: 'contact:2',
    fromUserName: 'Ariana Bahrami',
    fromUserAvatar: undefined,
    toUserId: 'current-user',
    category: 'leadership',
    title: 'Outstanding Project Leadership',
    description: 'Led the Q3 project launch with exceptional coordination and communication. Kept the team motivated and on track.',
    tags: ['project-management', 'team-leadership', 'communication'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 'praise-2',
    fromUserId: 'contact:2',
    fromUserName: 'Ariana Bahrami',
    fromUserAvatar: undefined,
    toUserId: 'current-user',
    category: 'teamwork',
    title: 'Collaborative Team Player',
    description: 'Always willing to help teammates and shares knowledge freely. Made the mobile app redesign a huge success.',
    tags: ['collaboration', 'mobile-development', 'mentoring'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
];