import { create } from 'zustand';
import type { Group, GroupPost, GroupLink } from '@/types/group';
import { dataService } from '@/services/dataService';

interface GroupMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
}

interface AIMessage {
  id: string;
  prompt: string;
  response: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface GroupDetailState {
  // Data
  group: Group | null;
  posts: GroupPost[];
  links: GroupLink[];
  groupMessages: GroupMessage[];
  aiMessages: AIMessage[];
  
  // UI State
  tabValue: number;
  isLoading: boolean;
  showAIAssistant: boolean;
  showGroupTour: boolean;
  showInviteForm: boolean;
  isTyping: boolean;
  currentInput: string;
  groupChatMessage: string;
  
  // Filter State
  selectedPersonFilter: string;
  selectedTopicFilter: string;
  expandedPosts: Set<string>;
  fullscreenSection: 'activity' | 'network' | 'map' | null;
  
  // User State
  userFirstName?: string;
  selectedContactNuri?: string;
  initialPrompt?: string;
  
  // Actions
  setGroup: (group: Group | null) => void;
  setPosts: (posts: GroupPost[]) => void;
  setLinks: (links: GroupLink[]) => void;
  setTabValue: (value: number) => void;
  setIsLoading: (loading: boolean) => void;
  setShowAIAssistant: (show: boolean) => void;
  setShowGroupTour: (show: boolean) => void;
  setShowInviteForm: (show: boolean) => void;
  setCurrentInput: (input: string) => void;
  setGroupChatMessage: (message: string) => void;
  setSelectedPersonFilter: (filter: string) => void;
  setSelectedTopicFilter: (filter: string) => void;
  setExpandedPosts: (posts: Set<string>) => void;
  setFullscreenSection: (section: 'activity' | 'network' | 'map' | null) => void;
  setUserFirstName: (name?: string) => void;
  setSelectedContactNuri: (nuri?: string) => void;
  setInitialPrompt: (prompt?: string) => void;
  
  // Complex Actions
  loadGroupData: (groupId: string) => Promise<void>;
  togglePostExpansion: (postId: string) => void;
  addAIMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  setAITyping: (typing: boolean) => void;
  sendGroupMessage: () => void;
  resetState: () => void;
}

const initialState = {
  group: null,
  posts: [],
  links: [],
  groupMessages: [],
  aiMessages: [],
  tabValue: 0,
  isLoading: true,
  showAIAssistant: false,
  showGroupTour: false,
  showInviteForm: false,
  isTyping: false,
  currentInput: '',
  groupChatMessage: '',
  selectedPersonFilter: 'all',
  selectedTopicFilter: 'all',
  expandedPosts: new Set<string>(),
  fullscreenSection: null as 'activity' | 'network' | 'map' | null,
  userFirstName: undefined,
  selectedContactNuri: undefined,
  initialPrompt: undefined,
};

export const useGroupDetailStore = create<GroupDetailState>((set, get) => ({
  ...initialState,
  
  // Simple setters
  setGroup: (group) => set({ group }),
  setPosts: (posts) => set({ posts }),
  setLinks: (links) => set({ links }),
  setTabValue: (tabValue) => set({ tabValue }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setShowAIAssistant: (showAIAssistant) => set({ showAIAssistant }),
  setShowGroupTour: (showGroupTour) => set({ showGroupTour }),
  setShowInviteForm: (showInviteForm) => set({ showInviteForm }),
  setCurrentInput: (currentInput) => set({ currentInput }),
  setGroupChatMessage: (groupChatMessage) => set({ groupChatMessage }),
  setSelectedPersonFilter: (selectedPersonFilter) => set({ selectedPersonFilter }),
  setSelectedTopicFilter: (selectedTopicFilter) => set({ selectedTopicFilter }),
  setExpandedPosts: (expandedPosts) => set({ expandedPosts }),
  setFullscreenSection: (fullscreenSection) => set({ fullscreenSection }),
  setUserFirstName: (userFirstName) => set({ userFirstName }),
  setSelectedContactNuri: (selectedContactNuri) => set({ selectedContactNuri }),
  setInitialPrompt: (initialPrompt) => set({ initialPrompt }),
  
  // Complex actions
  loadGroupData: async (groupId: string) => {
    set({ isLoading: true });
    try {
      const groupData = await dataService.getGroup(groupId);
      set({ group: groupData || null });
      
      // Generate mock messages
      const messages: GroupMessage[] = [
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
        // Add more mock messages as needed
      ];
      
      set({ groupMessages: messages });
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  togglePostExpansion: (postId: string) => {
    const { expandedPosts } = get();
    const newExpandedPosts = new Set(expandedPosts);
    if (newExpandedPosts.has(postId)) {
      newExpandedPosts.delete(postId);
    } else {
      newExpandedPosts.add(postId);
    }
    set({ expandedPosts: newExpandedPosts });
  },
  
  addAIMessage: (message) => {
    const { aiMessages } = get();
    const newMessage: AIMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set({ aiMessages: [...aiMessages, newMessage] });
  },
  
  setAITyping: (isTyping) => set({ isTyping }),
  
  sendGroupMessage: () => {
    const { groupChatMessage, groupMessages } = get();
    if (!groupChatMessage.trim()) return;
    
    const newMessage: GroupMessage = {
      id: Date.now().toString(),
      text: groupChatMessage,
      sender: 'You',
      timestamp: new Date(),
      isOwn: true,
    };
    
    set({
      groupMessages: [...groupMessages, newMessage],
      groupChatMessage: '',
    });
  },
  
  resetState: () => set(initialState),
}));