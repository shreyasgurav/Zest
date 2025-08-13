import { db } from '@/infrastructure/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ContentSharingSecurity } from './contentSharingSecurity';

export interface DashboardPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageAttendees: boolean;
  canViewFinancials: boolean;
  canSendCommunications: boolean;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized';
}

export interface DashboardSecurityEvent {
  type: 'access_attempt' | 'unauthorized_access' | 'data_export' | 'attendee_action' | 'financial_access';
  userId: string;
  eventId: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  ipAddress?: string;
  userAgent?: string;
  timestamp: any;
  details?: any;
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class DashboardSecurity {
  private static async logSecurityEvent(event: Omit<DashboardSecurityEvent, 'timestamp'>): Promise<void> {
    try {
      // Try to log security event, but don't fail if permissions are missing
      await addDoc(collection(db(), 'securityEvents'), {
        ...event,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      // Silently log to console instead of failing the entire operation
      console.log('Security event logged locally:', { ...event, timestamp: new Date().toISOString() });
    }
  }

  // Rate limiting
  static checkRateLimit(userId: string, action: string, maxRequests = 100, windowMs = 900000): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  // Simplified authorization check (without complex logging that causes permissions issues)
  static async verifyDashboardAccess(eventId: string, userId: string): Promise<DashboardPermissions> {
    const auth = getAuth();
    
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      this.logSecurityEvent({
        type: 'unauthorized_access',
        userId: userId || 'anonymous',
        eventId,
        action: 'dashboard_access',
        result: 'blocked',
        details: { reason: 'Invalid user session' }
      });
      
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

    try {
      // Get event data
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) {
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

      const eventData = eventDoc.data();
      
      // Check primary ownership
      if (eventData.organizationId === userId) {
        this.logSecurityEvent({
          type: 'access_attempt',
          userId,
          eventId,
          action: 'dashboard_access',
          result: 'success',
          details: { role: 'owner' }
        });
        
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

      // Check creator permissions (new events with creator field)
      if (eventData.creator && eventData.creator.userId === userId) {
        this.logSecurityEvent({
          type: 'access_attempt',
          userId,
          eventId,
          action: 'dashboard_access',
          result: 'success',
          details: { role: 'owner', method: 'creator_field' }
        });
        
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

      // NEW: Check for shared access permissions
      // If the event was created by an artist/organization/venue that the user has editor access to
      const sharedAccessPermissions = await this.checkSharedAccess(eventData, userId);
      if (sharedAccessPermissions.canView) {
        this.logSecurityEvent({
          type: 'access_attempt',
          userId,
          eventId,
          action: 'dashboard_access',
          result: 'success',
          details: { role: sharedAccessPermissions.role, method: 'shared_access' }
        });
        
        return sharedAccessPermissions;
      }

      // Access denied
      this.logSecurityEvent({
        type: 'unauthorized_access',
        userId,
        eventId,
        action: 'dashboard_access',
        result: 'blocked',
        details: { reason: 'No permissions found' }
      });
      
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageAttendees: false,
        canViewFinancials: false,
        canSendCommunications: false,
        role: 'unauthorized'
      };

    } catch (error) {
      console.error('Error verifying dashboard access:', error);
      
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
  }

  // Input sanitization
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .substring(0, 1000); // Limit length
  }

  // Validate search parameters
  static validateSearchParams(params: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (params.searchTerm && typeof params.searchTerm !== 'string') {
      errors.push('Invalid search term format');
    }
    
    if (params.searchTerm && params.searchTerm.length > 100) {
      errors.push('Search term too long');
    }
    
    if (params.filterStatus && !['all', 'confirmed', 'pending', 'cancelled'].includes(params.filterStatus)) {
      errors.push('Invalid filter status');
    }
    
    if (params.sortBy && !['name', 'email', 'createdAt', 'status'].includes(params.sortBy)) {
      errors.push('Invalid sort field');
    }
    
    if (params.sortOrder && !['asc', 'desc'].includes(params.sortOrder)) {
      errors.push('Invalid sort order');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Log financial access
  static async logFinancialAccess(userId: string, eventId: string, action: string): Promise<void> {
    await this.logSecurityEvent({
      type: 'financial_access',
      userId,
      eventId,
      action,
      result: 'success'
    });
  }

  // Log data export
  static async logDataExport(userId: string, eventId: string, exportType: string, recordCount: number): Promise<void> {
    await this.logSecurityEvent({
      type: 'data_export',
      userId,
      eventId,
      action: 'export_data',
      result: 'success',
      details: { exportType, recordCount }
    });
  }

  // Check if user has suspicious activity
  static async checkSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const suspiciousQuery = query(
        collection(db(), 'securityEvents'),
        where('userId', '==', userId),
        where('timestamp', '>=', oneHourAgo),
        where('result', '==', 'blocked')
      );
      
      const suspiciousDocs = await getDocs(suspiciousQuery);
      
      // If more than 10 blocked attempts in the last hour, mark as suspicious
      return suspiciousDocs.size > 10;
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return false;
    }
  }

  // Check shared access permissions for event dashboards
  static async checkSharedAccess(eventData: any, userId: string): Promise<DashboardPermissions> {
    try {
      console.log('🔍 Checking shared access for event:', { eventId: eventData.id, userId, organizationId: eventData.organizationId });

      // Check if the event has creator information with content type
      if (eventData.creator && eventData.creator.contentType && eventData.creator.contentId) {
        const { contentType, contentId } = eventData.creator;
        console.log('🎨 Event created by:', { contentType, contentId });

        // Check if user has shared access to the content that created this event
        const permissions = await ContentSharingSecurity.verifyContentAccess(contentType, contentId, userId);
        
        if (permissions.canView && permissions.role !== 'unauthorized') {
          console.log('✅ User has shared access:', { role: permissions.role, canEdit: permissions.canEdit });
          
          // Map content sharing permissions to dashboard permissions
          return this.mapContentPermissionsToDashboard(permissions);
        }
      }

      // Fallback: Check if organizationId is an artist/organization/venue page the user has access to
      if (eventData.organizationId) {
        console.log('🔍 Checking organizationId as content:', eventData.organizationId);
        
        // Try to determine content type from organizationId format
        // organizationId might be in format: artist_[id], organization_[id], venue_[id]
        const contentInfo = this.parseContentId(eventData.organizationId);
        
        if (contentInfo) {
          console.log('🎯 Parsed content info:', contentInfo);
          
          const permissions = await ContentSharingSecurity.verifyContentAccess(
            contentInfo.type, 
            contentInfo.id, 
            userId
          );
          
          if (permissions.canView && permissions.role !== 'unauthorized') {
            console.log('✅ User has shared access via organizationId:', { role: permissions.role });
            return this.mapContentPermissionsToDashboard(permissions);
          }
        } else {
          // OrganizationId is a user ID, not a content ID
          // Check if the event creator has any artist/organization/venue pages that the current user has access to
          console.log('🔍 OrganizationId is a user ID, checking creator\'s pages for shared access');
          
          const creatorUserId = eventData.organizationId;
          const sharedPermissions = await this.checkCreatorPagesForSharedAccess(creatorUserId, userId);
          
          if (sharedPermissions.canView) {
            console.log('✅ User has shared access via creator\'s pages:', { role: sharedPermissions.role });
            return sharedPermissions;
          }
        }
      }

      console.log('❌ No shared access found');
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageAttendees: false,
        canViewFinancials: false,
        canSendCommunications: false,
        role: 'unauthorized'
      };

    } catch (error) {
      console.error('Error checking shared access:', error);
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
  }

  // Parse content ID from organizationId field
  private static parseContentId(organizationId: string): { type: 'artist' | 'organization' | 'venue'; id: string } | null {
    if (!organizationId || typeof organizationId !== 'string') return null;

    // Check for content ID patterns: artist_[uid]_[timestamp], organization_[uid]_[timestamp], venue_[uid]_[timestamp]
    if (organizationId.startsWith('artist_')) {
      return { type: 'artist', id: organizationId };
    }
    
    if (organizationId.startsWith('organization_')) {
      return { type: 'organization', id: organizationId };
    }
    
    if (organizationId.startsWith('venue_')) {
      return { type: 'venue', id: organizationId };
    }

    return null;
  }

  // Check if user has shared access to any pages owned by the event creator
  private static async checkCreatorPagesForSharedAccess(creatorUserId: string, userId: string): Promise<DashboardPermissions> {
    try {
      console.log('🔍 Looking for pages owned by creator:', creatorUserId);

      // Collections to check for pages owned by the creator
      const collectionsToCheck = [
        { name: 'Artists', type: 'artist' as const },
        { name: 'Organizations', type: 'organization' as const },
        { name: 'Venues', type: 'venue' as const }
      ];

      let highestPermissions: DashboardPermissions = {
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageAttendees: false,
        canViewFinancials: false,
        canSendCommunications: false,
        role: 'unauthorized'
      };

      for (const collectionInfo of collectionsToCheck) {
        try {
          console.log(`🔍 Checking ${collectionInfo.name} collection for creator's pages`);
          
          // Query for pages owned by the creator
          const pagesQuery = query(
            collection(db(), collectionInfo.name),
            where('ownerId', '==', creatorUserId)
          );

          const pagesSnapshot = await getDocs(pagesQuery);
          console.log(`📄 Found ${pagesSnapshot.size} ${collectionInfo.type} pages owned by creator`);

          for (const pageDoc of pagesSnapshot.docs) {
            const pageId = pageDoc.id;
            console.log(`🎯 Checking shared access to ${collectionInfo.type} page: ${pageId}`);

            try {
              // Check if current user has shared access to this page
              const permissions = await ContentSharingSecurity.verifyContentAccess(
                collectionInfo.type,
                pageId,
                userId
              );

              if (permissions.canView && permissions.role !== 'unauthorized') {
                console.log(`✅ Found shared access to ${collectionInfo.type} page ${pageId}:`, { role: permissions.role });
                
                // Map content permissions to dashboard permissions
                const dashboardPermissions = this.mapContentPermissionsToDashboard(permissions);
                
                // Keep the highest level of permissions found
                if (this.isHigherPermission(dashboardPermissions, highestPermissions)) {
                  highestPermissions = dashboardPermissions;
                  console.log(`⬆️ Updated highest permissions:`, { role: dashboardPermissions.role });
                }
              }
            } catch (pageError) {
              console.log(`❌ Error checking access to ${collectionInfo.type} page ${pageId}:`, pageError);
            }
          }
        } catch (collectionError) {
          console.log(`❌ Error checking ${collectionInfo.name} collection:`, collectionError);
        }
      }

      console.log('🏁 Final shared access result:', { role: highestPermissions.role, canView: highestPermissions.canView });
      return highestPermissions;

    } catch (error) {
      console.error('❌ Error checking creator pages for shared access:', error);
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
  }

  // Helper to determine if one permission level is higher than another
  private static isHigherPermission(permission1: DashboardPermissions, permission2: DashboardPermissions): boolean {
    const roleHierarchy = { 'unauthorized': 0, 'viewer': 1, 'editor': 2, 'admin': 3, 'owner': 4 };
    return roleHierarchy[permission1.role] > roleHierarchy[permission2.role];
  }

  // Map content sharing permissions to dashboard permissions
  private static mapContentPermissionsToDashboard(contentPermissions: any): DashboardPermissions {
    // Editor access to content = Full dashboard access except deletion
    if (contentPermissions.canEdit && contentPermissions.role === 'editor') {
      return {
        canView: true,
        canEdit: true,
        canDelete: false, // Editors can't delete events
        canManageAttendees: true,
        canViewFinancials: true,
        canSendCommunications: true,
        role: 'editor'
      };
    }

    // Admin access to content = Almost full dashboard access
    if (contentPermissions.canManage && contentPermissions.role === 'admin') {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canManageAttendees: true,
        canViewFinancials: true,
        canSendCommunications: true,
        role: 'admin'
      };
    }

    // Owner access to content = Full dashboard access
    if (contentPermissions.role === 'owner') {
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

    // Viewer access = Read-only dashboard access
    if (contentPermissions.canView && contentPermissions.role === 'viewer') {
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

    // Default: No access
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
} 