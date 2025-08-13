import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/infrastructure/firebase';
import { DashboardSecurity, DashboardPermissions } from '@/shared/utils/security/dashboardSecurity';

export interface SessionPermissions {
  canView: boolean;
  canCheckIn: boolean;
  canManageAttendees: boolean;
  canViewFinancials: boolean;
  canEditSession: boolean;
  canViewReports: boolean;
  role: 'session_owner' | 'session_manager' | 'check_in_staff' | 'viewer' | 'unauthorized';
}

export interface SessionManagerAssignment {
  id?: string;
  eventId: string;
  sessionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  permissions: SessionPermissions;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
  notes?: string;
}

export interface SessionSecurityEvent {
  type: 'session_access' | 'check_in_action' | 'session_delegation' | 'permission_change';
  userId: string;
  eventId: string;
  sessionId: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  timestamp: any;
  details?: any;
}

export class SessionSecurity {
  
  /**
   * Verify if a user has access to a specific session
   */
  static async verifySessionAccess(
    eventId: string, 
    sessionId: string, 
    userId: string
  ): Promise<SessionPermissions> {
    const currentUser = auth().currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return this.unauthorizedPermissions();
    }

    try {
      // First, check if user has event-level access (event owner gets full access)
      const eventPermissions = await DashboardSecurity.verifyDashboardAccess(eventId, userId);
      
      if (eventPermissions.role === 'owner') {
        // Event owner has full access to all sessions
        return {
          canView: true,
          canCheckIn: true,
          canManageAttendees: true,
          canViewFinancials: true,
          canEditSession: true,
          canViewReports: true,
          role: 'session_owner'
        };
      }

      // Check for session-specific permissions
      const sessionPermissions = await this.getSessionPermissions(eventId, sessionId, userId);
      
      if (sessionPermissions) {
        await this.logSessionSecurityEvent({
          type: 'session_access',
          userId,
          eventId,
          sessionId,
          action: 'access_granted',
          result: 'success',
          details: { role: sessionPermissions.role, method: 'session_permissions' }
        });
        
        return sessionPermissions;
      }

      // No permissions found
      await this.logSessionSecurityEvent({
        type: 'session_access',
        userId,
        eventId,
        sessionId,
        action: 'access_denied',
        result: 'blocked',
        details: { reason: 'no_permissions' }
      });

      return this.unauthorizedPermissions();

    } catch (error) {
      console.error('Error verifying session access:', error);
      return this.unauthorizedPermissions();
    }
  }

  /**
   * Get session-specific permissions for a user
   */
  private static async getSessionPermissions(
    eventId: string,
    sessionId: string,
    userId: string
  ): Promise<SessionPermissions | null> {
    try {
      const assignmentsQuery = query(
        collection(db(), 'sessionPermissions'),
        where('eventId', '==', eventId),
        where('sessionId', '==', sessionId),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(assignmentsQuery);
      
      if (snapshot.empty) {
        return null;
      }

      // Get the most recent assignment
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SessionManagerAssignment[];

      const latestAssignment = assignments.sort((a, b) => 
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
      )[0];

      // Check if assignment has expired
      if (latestAssignment.expiresAt) {
        const expiryDate = new Date(latestAssignment.expiresAt);
        if (expiryDate < new Date()) {
          // Assignment has expired
          await this.deactivateAssignment(latestAssignment.id!);
          return null;
        }
      }

      return latestAssignment.permissions;
    } catch (error) {
      console.error('Error getting session permissions:', error);
      return null;
    }
  }

  /**
   * Assign session management permissions to a user
   */
  static async assignSessionManager(
    eventId: string,
    sessionId: string,
    targetUserId: string,
    targetUserEmail: string,
    targetUserName: string,
    permissions: SessionPermissions,
    assignedByUserId: string,
    expiresIn?: number, // Hours
    notes?: string
  ): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
    try {
      // Verify the assigner has permission to delegate
      const assignerPermissions = await this.verifySessionAccess(eventId, sessionId, assignedByUserId);
      
      if (!assignerPermissions.canEditSession && assignerPermissions.role !== 'session_owner') {
        return { success: false, error: 'You do not have permission to assign session managers' };
      }

      // Prevent assigning higher permissions than assigner has
      if (!this.canAssignPermissions(assignerPermissions, permissions)) {
        return { success: false, error: 'Cannot assign permissions higher than your own' };
      }

      const assignment: SessionManagerAssignment = {
        eventId,
        sessionId,
        userId: targetUserId,
        userEmail: targetUserEmail,
        userName: targetUserName,
        permissions,
        assignedBy: assignedByUserId,
        assignedAt: new Date().toISOString(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString() : undefined,
        isActive: true,
        notes
      };

      // Check if user already has permissions for this session
      const existingQuery = query(
        collection(db(), 'sessionPermissions'),
        where('eventId', '==', eventId),
        where('sessionId', '==', sessionId),
        where('userId', '==', targetUserId),
        where('isActive', '==', true)
      );

      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        // Update existing assignment
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(existingDoc.ref, {
          permissions,
          assignedBy: assignedByUserId,
          assignedAt: assignment.assignedAt,
          expiresAt: assignment.expiresAt,
          notes,
          updatedAt: serverTimestamp()
        });

        await this.logSessionSecurityEvent({
          type: 'permission_change',
          userId: targetUserId,
          eventId,
          sessionId,
          action: 'permissions_updated',
          result: 'success',
          details: { updatedBy: assignedByUserId, newRole: permissions.role }
        });

        return { success: true, assignmentId: existingDoc.id };
      } else {
        // Create new assignment
        const docRef = await addDoc(collection(db(), 'sessionPermissions'), {
          ...assignment,
          createdAt: serverTimestamp()
        });

        await this.logSessionSecurityEvent({
          type: 'session_delegation',
          userId: targetUserId,
          eventId,
          sessionId,
          action: 'manager_assigned',
          result: 'success',
          details: { assignedBy: assignedByUserId, role: permissions.role }
        });

        return { success: true, assignmentId: docRef.id };
      }
    } catch (error) {
      console.error('Error assigning session manager:', error);
      return { success: false, error: 'Failed to assign session manager' };
    }
  }

  /**
   * Remove session management permissions
   */
  static async removeSessionManager(
    eventId: string,
    sessionId: string,
    targetUserId: string,
    removedByUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the remover has permission
      const removerPermissions = await this.verifySessionAccess(eventId, sessionId, removedByUserId);
      
      if (!removerPermissions.canEditSession && removerPermissions.role !== 'session_owner') {
        return { success: false, error: 'You do not have permission to remove session managers' };
      }

      // Find and deactivate the assignment
      const assignmentsQuery = query(
        collection(db(), 'sessionPermissions'),
        where('eventId', '==', eventId),
        where('sessionId', '==', sessionId),
        where('userId', '==', targetUserId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(assignmentsQuery);
      
      if (snapshot.empty) {
        return { success: false, error: 'No active assignment found' };
      }

      // Deactivate all active assignments for this user/session
      const batch = writeBatch(db());
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          removedBy: removedByUserId,
          removedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();

      await this.logSessionSecurityEvent({
        type: 'permission_change',
        userId: targetUserId,
        eventId,
        sessionId,
        action: 'manager_removed',
        result: 'success',
        details: { removedBy: removedByUserId }
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing session manager:', error);
      return { success: false, error: 'Failed to remove session manager' };
    }
  }

  /**
   * Get all session managers for an event
   */
  static async getEventSessionManagers(eventId: string): Promise<SessionManagerAssignment[]> {
    try {
      const assignmentsQuery = query(
        collection(db(), 'sessionPermissions'),
        where('eventId', '==', eventId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(assignmentsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SessionManagerAssignment[];
    } catch (error) {
      console.error('Error getting session managers:', error);
      return [];
    }
  }

  /**
   * Get sessions that a user can manage
   */
  static async getUserManagedSessions(userId: string): Promise<SessionManagerAssignment[]> {
    try {
      const assignmentsQuery = query(
        collection(db(), 'sessionPermissions'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(assignmentsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SessionManagerAssignment[];
    } catch (error) {
      console.error('Error getting user managed sessions:', error);
      return [];
    }
  }

  /**
   * Predefined permission templates
   */
  static getPermissionTemplates() {
    return {
      checkInStaff: {
        canView: true,
        canCheckIn: true,
        canManageAttendees: false,
        canViewFinancials: false,
        canEditSession: false,
        canViewReports: false,
        role: 'check_in_staff' as const
      },
      sessionManager: {
        canView: true,
        canCheckIn: true,
        canManageAttendees: true,
        canViewFinancials: true,
        canEditSession: false,
        canViewReports: true,
        role: 'session_manager' as const
      },
      fullSessionAccess: {
        canView: true,
        canCheckIn: true,
        canManageAttendees: true,
        canViewFinancials: true,
        canEditSession: true,
        canViewReports: true,
        role: 'session_manager' as const
      },
      viewerOnly: {
        canView: true,
        canCheckIn: false,
        canManageAttendees: false,
        canViewFinancials: false,
        canEditSession: false,
        canViewReports: false,
        role: 'viewer' as const
      }
    };
  }

  // Helper methods
  private static unauthorizedPermissions(): SessionPermissions {
    return {
      canView: false,
      canCheckIn: false,
      canManageAttendees: false,
      canViewFinancials: false,
      canEditSession: false,
      canViewReports: false,
      role: 'unauthorized'
    };
  }

  private static canAssignPermissions(
    assignerPermissions: SessionPermissions, 
    targetPermissions: SessionPermissions
  ): boolean {
    // Session owners can assign any permissions
    if (assignerPermissions.role === 'session_owner') {
      return true;
    }

    // Others can only assign permissions they have themselves
    return (
      (!targetPermissions.canEditSession || assignerPermissions.canEditSession) &&
      (!targetPermissions.canViewFinancials || assignerPermissions.canViewFinancials) &&
      (!targetPermissions.canManageAttendees || assignerPermissions.canManageAttendees)
    );
  }

  private static async deactivateAssignment(assignmentId: string): Promise<void> {
    try {
      await updateDoc(doc(db(), 'sessionPermissions', assignmentId), {
        isActive: false,
        expiredAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deactivating assignment:', error);
    }
  }

  private static async logSessionSecurityEvent(event: Omit<SessionSecurityEvent, 'timestamp'>): Promise<void> {
    try {
      await addDoc(collection(db(), 'sessionSecurityEvents'), {
        ...event,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.log('Session security event logged locally:', { ...event, timestamp: new Date().toISOString() });
    }
  }
} 