import { renderHook, act } from '@testing-library/react';
import { useGroupDetailStore } from './groupDetailStore';
import { dataService } from '@/services/dataService';

// Mock the dataService
jest.mock('@/services/dataService', () => ({
  dataService: {
    getGroup: jest.fn()
  }
}));

const mockDataService = dataService as jest.Mocked<typeof dataService>;

describe('useGroupDetailStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useGroupDetailStore());
    act(() => {
      result.current.resetState();
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      const state = result.current;

      expect(state.group).toBeNull();
      expect(state.posts).toEqual([]);
      expect(state.links).toEqual([]);
      expect(state.groupMessages).toEqual([]);
      expect(state.aiMessages).toEqual([]);
      expect(state.tabValue).toBe(0);
      expect(state.isLoading).toBe(true);
      expect(state.showAIAssistant).toBe(false);
      expect(state.showGroupTour).toBe(false);
      expect(state.showInviteForm).toBe(false);
      expect(state.currentInput).toBe('');
      expect(state.groupChatMessage).toBe('');
      expect(state.selectedPersonFilter).toBe('all');
      expect(state.selectedTopicFilter).toBe('all');
      expect(state.expandedPosts).toEqual(new Set());
      expect(state.fullscreenSection).toBeNull();
    });
  });

  describe('simple setters', () => {
    it('should update tabValue', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setTabValue(2);
      });
      
      expect(result.current.tabValue).toBe(2);
    });

    it('should update isLoading', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setIsLoading(false);
      });
      
      expect(result.current.isLoading).toBe(false);
    });

    it('should update showAIAssistant', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setShowAIAssistant(true);
      });
      
      expect(result.current.showAIAssistant).toBe(true);
    });

    it('should update currentInput', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setCurrentInput('test input');
      });
      
      expect(result.current.currentInput).toBe('test input');
    });

    it('should update fullscreenSection', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setFullscreenSection('network');
      });
      
      expect(result.current.fullscreenSection).toBe('network');
    });
  });

  describe('loadGroupData', () => {
    it('should load group data successfully', async () => {
      const mockGroup = {
        id: 'test-group',
        name: 'Test Group',
        memberCount: 5,
        memberIds: ['user1', 'user2'],
        createdBy: 'admin',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        isPrivate: false
      };
      
      mockDataService.getGroup.mockResolvedValueOnce(mockGroup);
      
      const { result } = renderHook(() => useGroupDetailStore());
      
      await act(async () => {
        await result.current.loadGroupData('test-group');
      });
      
      expect(mockDataService.getGroup).toHaveBeenCalledWith('test-group');
      expect(result.current.group).toEqual(mockGroup);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.groupMessages.length).toBeGreaterThan(0);
    });

    it('should handle load group data error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDataService.getGroup.mockRejectedValueOnce(new Error('Load failed'));
      
      const { result } = renderHook(() => useGroupDetailStore());
      
      await act(async () => {
        await result.current.loadGroupData('test-group');
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading group data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('togglePostExpansion', () => {
    it('should expand a post', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.togglePostExpansion('post-1');
      });
      
      expect(result.current.expandedPosts.has('post-1')).toBe(true);
    });

    it('should collapse an expanded post', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.togglePostExpansion('post-1');
        result.current.togglePostExpansion('post-1');
      });
      
      expect(result.current.expandedPosts.has('post-1')).toBe(false);
    });
  });

  describe('addAIMessage', () => {
    it('should add AI message with generated id and timestamp', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.addAIMessage({
          prompt: 'test prompt',
          response: 'test response'
        });
      });
      
      expect(result.current.aiMessages).toHaveLength(1);
      expect(result.current.aiMessages[0]).toMatchObject({
        prompt: 'test prompt',
        response: 'test response',
        id: expect.any(String),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('sendGroupMessage', () => {
    it('should send group message when message is not empty', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setGroupChatMessage('test message');
        result.current.sendGroupMessage();
      });
      
      expect(result.current.groupMessages).toHaveLength(1);
      expect(result.current.groupMessages[0]).toMatchObject({
        text: 'test message',
        sender: 'You',
        isOwn: true,
        id: expect.any(String),
        timestamp: expect.any(Date)
      });
      expect(result.current.groupChatMessage).toBe('');
    });

    it('should not send message when message is empty', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setGroupChatMessage('');
        result.current.sendGroupMessage();
      });
      
      expect(result.current.groupMessages).toHaveLength(0);
    });

    it('should not send message when message is only whitespace', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      act(() => {
        result.current.setGroupChatMessage('   ');
        result.current.sendGroupMessage();
      });
      
      expect(result.current.groupMessages).toHaveLength(0);
    });
  });

  describe('resetState', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useGroupDetailStore());
      
      // Modify some state
      act(() => {
        result.current.setTabValue(3);
        result.current.setCurrentInput('some input');
        result.current.setShowAIAssistant(true);
        result.current.addAIMessage({ prompt: 'test', response: 'response' });
      });
      
      // Reset state
      act(() => {
        result.current.resetState();
      });
      
      // Check that state is reset
      expect(result.current.tabValue).toBe(0);
      expect(result.current.currentInput).toBe('');
      expect(result.current.showAIAssistant).toBe(false);
      expect(result.current.aiMessages).toHaveLength(0);
    });
  });
});