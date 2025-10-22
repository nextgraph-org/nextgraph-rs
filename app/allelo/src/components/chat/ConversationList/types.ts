export interface ConversationProps {
  id: string,
  selected?: boolean,
  name: string,
  avatar?: string,
  isGroup: boolean,
  lastMessage: string,
  lastMessageTime: Date,
  unreadCount: number,
  isOnline?: boolean,
  lastActivity: string,
  members?: string[],
}

export interface ConversationListProps {
  conversations: ConversationProps[],
  selectConversation: (conversation: string) => void,
  selectedConversation: string
}