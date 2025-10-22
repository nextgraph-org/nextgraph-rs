export interface GroupMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
}