export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
}

export interface MessagesProps {
  messages: Message[];
  currentMessage: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  chatName?: string;
  isGroup?: boolean;
  isOnline?: boolean;
  onBack?: () => void;
  members?: string[];
  lastActivity?: string;
  avatar?: string;
  showBackButton?: boolean;
  compensationHeight?: number;
}