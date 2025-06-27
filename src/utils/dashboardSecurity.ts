import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DashboardPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageAttendees: boolean;
  canViewFinancials: boolean;
  canSendCommunications: boolean;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized';
}

export class DashboardSecurity {
  /**
   * Verifies if a user has access to an event dashboard and returns their permissions
   */
  static async verifyDashboardAccess(eventId: string, userId: string): Promise<DashboardPermissions> {
    try {
      // Fetch the event data
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      
      if (!eventDoc.exists()) {
        return this.getUnauthorizedPermissions();
      }

      const eventData = eventDoc.data();
      
      // Check if user is the event creator/owner
      if (eventData.organizationId === userId) {
        return this.getOwnerPermissions();
      }

      // Check if user is in the creator context
      if (eventData.creator && eventData.creator.userId === userId) {
        return this.getOwnerPermissions();
      }

      // For now, deny access to non-owners
      // In the future, you could add role-based access here
      return this.getUnauthorizedPermissions();

    } catch (error) {
      console.error('Error verifying dashboard access:', error);
      return this.getUnauthorizedPermissions();
    }
  }

  /**
   * Returns full permissions for event owners
   */
  private static getOwnerPermissions(): DashboardPermissions {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManageAttendees: true,
      canViewFinancials: true,
      canSendCommunications: true,
      role: 'owner'
    };
  }

  /**
   * Returns admin permissions (can do everything except delete)
   */
  private static getAdminPermissions(): DashboardPermissions {
    return {
      canView: true,
      canEdit: true,
      canDelete: false,
      canManageAttendees: true,
      canViewFinancials: true,
      canSendCommunications: true,
      role: 'admin'
    };
  }

  /**
   * Returns editor permissions (can edit and manage attendees but not financials)
   */
  private static getEditorPermissions(): DashboardPermissions {
    return {
      canView: true,
      canEdit: true,
      canDelete: false,
      canManageAttendees: true,
      canViewFinancials: false,
      canSendCommunications: false,
      role: 'editor'
    };
  }

  /**
   * Returns viewer permissions (read-only access)
   */
  private static getViewerPermissions(): DashboardPermissions {
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canManageAttendees: false,
      canViewFinancials: false,
      canSendCommunications: false,
      role: 'viewer'
    };
  }

  /**
   * Returns no permissions for unauthorized users
   */
  private static getUnauthorizedPermissions(): DashboardPermissions {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canManageAttendees: false,
      canViewFinancials: false,
      canSendCommunications: false,
      role: 'unauthorized'
    };
  }

  /**
   * Check if user can perform a specific action
   */
  static canPerformAction(permissions: DashboardPermissions, action: keyof DashboardPermissions): boolean {
    return permissions[action] === true;
  }
} 