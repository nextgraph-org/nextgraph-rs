import type { 
  Notification, 
  NotificationSummary, 
  Vouch, 
  Praise
} from '@/types/notification';
import { dataService } from './dataService';
import {mockNotifications, mockPraises, mockVouches} from "@/mocks/notifications";

export class NotificationService {
  private notifications: Notification[] = [...mockNotifications];
  private vouches: Vouch[] = [...mockVouches];
  private praises: Praise[] = [...mockPraises];

  // Get all notifications for a user
  async getNotifications(userId: string): Promise<Notification[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.notifications.filter(n => n.targetUserId === userId);
  }

  // Get notification summary
  async getNotificationSummary(userId: string): Promise<NotificationSummary> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const userNotifications = this.notifications.filter(n => n.targetUserId === userId);
    
    const summary: NotificationSummary = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.isRead).length,
      pending: userNotifications.filter(n => n.status === 'pending' && n.isActionable).length,
      byType: {
        vouch: userNotifications.filter(n => n.type === 'vouch').length,
        praise: userNotifications.filter(n => n.type === 'praise').length,
        connection: userNotifications.filter(n => n.type === 'connection').length,
        group_invite: userNotifications.filter(n => n.type === 'group_invite').length,
        message: userNotifications.filter(n => n.type === 'message').length,
        system: userNotifications.filter(n => n.type === 'system').length,
      },
    };

    return summary;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      notification.updatedAt = new Date();
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.notifications
      .filter(n => n.targetUserId === userId && !n.isRead)
      .forEach(notification => {
        notification.isRead = true;
        notification.updatedAt = new Date();
      });
  }

  // Accept a vouch
  async acceptVouch(notificationId: string, rCardIds?: string[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'accepted';
      notification.isActionable = false; // No longer actionable after acceptance
      notification.isRead = true; // Mark as read when accepted
      if (rCardIds && rCardIds.length > 0) {
        notification.metadata = { ...notification.metadata, rCardIds };
      }
      notification.updatedAt = new Date();
    }
  }

  // Reject a vouch
  async rejectVouch(notificationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'rejected';
      notification.isActionable = false;
      notification.isRead = true; // Mark as read when rejected
      notification.updatedAt = new Date();
    }
  }

  // Accept praise
  async acceptPraise(notificationId: string, rCardIds?: string[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'accepted';
      notification.isActionable = false; // No longer actionable after acceptance
      notification.isRead = true; // Mark as read when accepted
      if (rCardIds && rCardIds.length > 0) {
        notification.metadata = { ...notification.metadata, rCardIds };
      }
      notification.updatedAt = new Date();
    }
  }

  // Reject praise
  async rejectPraise(notificationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = 'rejected';
      notification.isActionable = false;
      notification.isRead = true; // Mark as read when rejected
      notification.updatedAt = new Date();
    }
  }

  // Assign to rCard
  async assignToRCard(notificationId: string, rCardId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.metadata) {
      notification.metadata.rCardId = rCardId;
      notification.status = 'completed';
      notification.isActionable = false;
      notification.isRead = true;
      notification.updatedAt = new Date();
    }
  }

  // Get vouch details
  async getVouch(vouchId: string): Promise<Vouch | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.vouches.find(v => v.id === vouchId) || null;
  }

  // Get praise details
  async getPraise(praiseId: string): Promise<Praise | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.praises.find(p => p.id === praiseId) || null;
  }

  // Accept connection request
  async acceptConnection(notificationId: string, selectedRCardId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.type === 'connection' && notification.metadata?.contactId) {
      await dataService.acceptConnectionRequest(notificationId, selectedRCardId);
      
      // Update the contact's status to 'member' after accepting connection
      dataService.updateContactStatus(notification.metadata.contactId, 'member');
      
      notification.status = 'accepted';
      notification.isActionable = false;
      notification.isRead = true; // Mark as read when accepted
      notification.metadata.selectedRCardId = selectedRCardId;
      notification.updatedAt = new Date();
    }
  }

  // Reject connection request
  async rejectConnection(notificationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.type === 'connection' && notification.metadata?.contactId) {
      await dataService.rejectConnectionRequest(notificationId, notification.metadata.contactId);
      notification.status = 'rejected';
      notification.isActionable = false;
      notification.isRead = true; // Mark as read when rejected
      notification.updatedAt = new Date();
    }
  }

  // Get rejected vouches/praises for a specific contact
  async getRejectedNotificationsByContact(contactId: string): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.notifications.filter(n => 
      (n.fromUserId === contactId || n.metadata?.contactId === contactId) &&
      n.status === 'rejected' &&
      (n.type === 'vouch' || n.type === 'praise')
    );
  }

  // Get accepted vouches/praises from a specific contact
  async getAcceptedNotificationsByContact(contactId: string): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.notifications.filter(n => 
      (n.fromUserId === contactId || n.metadata?.contactId === contactId) &&
      n.status === 'accepted' &&
      (n.type === 'vouch' || n.type === 'praise')
    );
  }

  // Reverse rejection and accept a vouch/praise
  async reverseRejectionAndAccept(notificationId: string, rCardIds?: string[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.status === 'rejected') {
      notification.status = 'accepted';
      notification.isActionable = false;
      notification.isRead = true;
      if (rCardIds && rCardIds.length > 0) {
        notification.metadata = { ...notification.metadata, rCardIds };
      }
      notification.updatedAt = new Date();
    }
  }

  // Create a new notification (for backend integration)
  async createNotification(notificationData: {
    userId: string;
    type: 'group_invite' | 'vouch' | 'praise' | 'connection' | 'message' | 'system';
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const notification: Notification = {
            id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            fromUserId: typeof notificationData.metadata?.inviterId === 'string' ? notificationData.metadata.inviterId : 'system',
            fromUserName: typeof notificationData.metadata?.inviterName === 'string' ? notificationData.metadata.inviterName : 'System',
            fromUserAvatar: undefined,
            targetUserId: notificationData.userId,
            isRead: false,
            isActionable: notificationData.type === 'group_invite',
            status: notificationData.type === 'group_invite' ? 'pending' : 'completed',
            metadata: notificationData.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Add to notifications array (simulating backend storage)
          this.notifications.push(notification);

          // In a real app, this would send to the backend API
          console.log('📱 Group invitation notification created:', {
            id: notification.id,
            recipient: notificationData.userId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            actionUrl: notificationData.actionUrl,
            metadata: notificationData.metadata
          });

          resolve();
        } catch (error) {
          console.error('Failed to create notification:', error);
          reject(error);
        }
      }, 100); // Small delay to simulate API call
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();