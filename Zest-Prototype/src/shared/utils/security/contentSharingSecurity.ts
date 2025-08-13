import { db } from '@/infrastructure/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Security Constants
const SECURITY_LIMITS = {
  maxSharesPerContent: 100,
  maxSharesPerUser: 1000,
  maxInvitationsPerHour: 10,
  maxInvitationsPerDay: 50,
  maxMessageLength: 500,
  maxPhoneLength: 20,
  // Add new security limits
  maxConcurrentSessions: 5,
  accessTokenExpiry: 3600, // 1 hour in seconds
  maxFailedAttempts: 5,
  lockoutDuration: 900, // 15 minutes in seconds
  minPasswordLength: 8
};

// Rate limiting storage
const invitationRateLimit = new Map<string, { count: number; lastReset: number; dailyCount: number; dailyReset: number }>();

// Add session tracking
const activeSessions = new Map<string, Set<string>>();
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export interface ContentPermissions {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  canInviteOthers: boolean;
  canViewAnalytics: boolean;
  canDelete: boolean;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized';
}

export interface ContentShareAssignment {
  id?: string;
  contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity';
  contentId: string;
  userId: string;
  userPhone: string;
  userName: string;
  permissions: ContentPermissions;
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
  status: 'active' | 'pending' | 'declined' | 'expired';
  notes: string; // Always string, empty string if no notes
  invitationMessage: string; // Always string, empty string if no message
}

export interface ContentInvitation {
  id?: string;
  contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity';
  contentId: string;
  contentName: string;
  invitedPhone: string;
  invitedUserId?: string;
  invitedByUserId: string;
  invitedByName: string;
  permissions: ContentPermissions;
  message: string; // Always string, empty string if no message
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;
}

export class ContentSharingSecurity {
  
  /**
   * Enhanced phone number validation with international format support
   */
  static validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Check length limits
    if (cleaned.length > SECURITY_LIMITS.maxPhoneLength) {
      return { isValid: false, error: 'Phone number too long' };
    }

    // Must start with + and have 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    if (!phoneRegex.test(cleaned)) {
      return { isValid: false, error: 'Invalid phone number format. Use +[country code][number]' };
    }

    return { isValid: true };
  }

  /**
   * Input sanitization for messages and text inputs
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/[<>'"]/g, '') // Remove HTML/XML chars
      .replace(/javascript:/gi, '') // Remove javascript: urls
      .replace(/data:/gi, '') // Remove data: urls
      .substring(0, SECURITY_LIMITS.maxMessageLength); // Limit length
  }

  /**
   * Validate invitation message for suspicious content
   */
  static validateMessage(message: string): { isValid: boolean; error?: string } {
    if (!message || message.trim() === '') return { isValid: true }; // Empty message is okay

    const sanitized = this.sanitizeInput(message);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /vbscript:/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\(/i,
      /document\./i,
      /window\./i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(sanitized))) {
      return { isValid: false, error: 'Message contains suspicious content' };
    }

    return { isValid: true };
  }

  /**
   * Check rate limits for invitations
   */
  static checkInvitationRateLimit(userId: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    
    const userLimits = invitationRateLimit.get(userId) || {
      count: 0,
      lastReset: now,
      dailyCount: 0,
      dailyReset: now
    };

    // Reset hourly counter if needed
    if (now - userLimits.lastReset > hourMs) {
      userLimits.count = 0;
      userLimits.lastReset = now;
    }

    // Reset daily counter if needed
    if (now - userLimits.dailyReset > dayMs) {
      userLimits.dailyCount = 0;
      userLimits.dailyReset = now;
    }

    // Check limits
    if (userLimits.count >= SECURITY_LIMITS.maxInvitationsPerHour) {
      return { allowed: false, error: 'Too many invitations sent this hour. Please wait.' };
    }

    if (userLimits.dailyCount >= SECURITY_LIMITS.maxInvitationsPerDay) {
      return { allowed: false, error: 'Daily invitation limit reached. Please try again tomorrow.' };
    }

    // Increment counters
    userLimits.count++;
    userLimits.dailyCount++;
    invitationRateLimit.set(userId, userLimits);

    return { allowed: true };
  }

  /**
   * Check resource limits (max shares per user/content)
   */
  static async checkResourceLimits(userId: string, contentId: string): Promise<{ allowed: boolean; error?: string }> {
    try {
      const [userShares, contentShares] = await Promise.all([
        getDocs(query(
          collection(db(), 'contentSharing'),
          where('assignedBy', '==', userId),
          where('isActive', '==', true)
        )),
        getDocs(query(
          collection(db(), 'contentSharing'),
          where('contentId', '==', contentId),
          where('isActive', '==', true)
        ))
      ]);

      if (userShares.size >= SECURITY_LIMITS.maxSharesPerUser) {
        return { allowed: false, error: 'Maximum shares per user exceeded' };
      }

      if (contentShares.size >= SECURITY_LIMITS.maxSharesPerContent) {
        return { allowed: false, error: 'Maximum shares for this content exceeded' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking resource limits:', error);
      return { allowed: false, error: 'Unable to verify resource limits' };
    }
  }

  /**
   * Enhanced permission validation
   */
  static validatePermissionChange(
    currentPermissions: ContentPermissions,
    newPermissions: ContentPermissions
  ): { isValid: boolean; error?: string } {
    // Only owners can grant admin permissions
    if (newPermissions.role === 'admin' && currentPermissions.role !== 'owner') {
      return { isValid: false, error: 'Only owners can grant admin permissions' };
    }

    // Only admins and owners can manage permissions
    if (!currentPermissions.canManage && currentPermissions.role !== 'owner') {
      return { isValid: false, error: 'Insufficient permissions to manage access' };
    }

    // Prevent role escalation beyond current user's level
    const roleHierarchy: Record<string, number> = { viewer: 1, editor: 2, admin: 3, owner: 4, unauthorized: 0 };
    const currentLevel = roleHierarchy[currentPermissions.role] || 0;
    const newLevel = roleHierarchy[newPermissions.role] || 0;

    if (newLevel > currentLevel) {
      return { isValid: false, error: 'Cannot grant permissions higher than your own' };
    }

    return { isValid: true };
  }

  /**
   * Log security events for monitoring
   */
  static async logSecurityEvent(event: {
    type: 'access_granted' | 'access_denied' | 'permission_change' | 'suspicious_activity' | 'session_limit_exceeded' | 'account_lockout';
    userId: string;
    contentType: string;
    contentId: string;
    details: any;
  }): Promise<void> {
    try {
      await addDoc(collection(db(), 'securityLogs'), {
        ...event,
        timestamp: serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Verify if a user has access to specific content
   */
  static async verifyContentAccess(
    contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity',
    contentId: string,
    userId: string
  ): Promise<ContentPermissions> {
    // Add brute force protection
    if (!(await this.validateAccessAttempt(userId))) {
      await this.logSecurityEvent({
        type: 'access_denied',
        userId,
        contentType,
        contentId,
        details: { reason: 'Account temporarily locked due to too many failed attempts' }
      });
      return this.unauthorizedPermissions();
    }

    const currentUser = getAuth().currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      this.recordFailedAttempt(userId);
      return this.unauthorizedPermissions();
    }

    try {
      // First check if user is the owner
      const isOwner = await this.checkContentOwnership(contentType, contentId, userId);
      if (isOwner) {
        return this.ownerPermissions();
      }

      // Check for shared access permissions
      const sharedPermissions = await this.getSharedPermissions(contentType, contentId, userId);
      if (sharedPermissions) {
        return sharedPermissions;
      }

      this.recordFailedAttempt(userId);
      return this.unauthorizedPermissions();

    } catch (error) {
      console.error('Error verifying content access:', error);
      this.recordFailedAttempt(userId);
      return this.unauthorizedPermissions();
    }
  }

  /**
   * Share content with another user
   */
  static async shareContent(
    contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity',
    contentId: string,
    targetUserPhone: string,
    targetUserName: string,
    permissions: ContentPermissions,
    sharedByUserId: string,
    sharedByName: string,
    expiresInHours?: number,
    message?: string
  ): Promise<{ success: boolean; assignmentId?: string; invitationId?: string; error?: string }> {
    try {
      // 1. Validate phone number
      const phoneValidation = this.validatePhoneNumber(targetUserPhone);
      if (!phoneValidation.isValid) {
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          userId: sharedByUserId,
          contentType,
          contentId,
          details: { reason: 'Invalid phone number', phone: targetUserPhone }
        });
        return { success: false, error: phoneValidation.error };
      }

      // 2. Validate message content
      if (message) {
        const messageValidation = this.validateMessage(message);
        if (!messageValidation.isValid) {
          await this.logSecurityEvent({
            type: 'suspicious_activity',
            userId: sharedByUserId,
            contentType,
            contentId,
            details: { reason: 'Suspicious message content', message }
          });
          return { success: false, error: messageValidation.error };
        }
      }

      // 3. Check rate limits
      const rateLimitCheck = this.checkInvitationRateLimit(sharedByUserId);
      if (!rateLimitCheck.allowed) {
        return { success: false, error: rateLimitCheck.error };
      }

      // 4. Check resource limits
      const resourceCheck = await this.checkResourceLimits(sharedByUserId, contentId);
      if (!resourceCheck.allowed) {
        return { success: false, error: resourceCheck.error };
      }

      // 5. Verify the sharer has permission to share - ONLY OWNERS CAN SHARE
      const sharerPermissions = await this.verifyContentAccess(contentType, contentId, sharedByUserId);
      
      // 🚨 ENHANCED: Only page owners can grant access to others
      if (sharerPermissions.role !== 'owner') {
        await this.logSecurityEvent({
          type: 'access_denied',
          userId: sharedByUserId,
          contentType,
          contentId,
          details: { 
            reason: 'Only page owners can grant access to others', 
            userRole: sharerPermissions.role,
            requiredRole: 'owner'
          }
        });
        return { 
          success: false, 
          error: 'Only page owners can grant access to others. You have ' + sharerPermissions.role + ' access.' 
        };
      }

      // 6. Validate permission level
      const permissionValidation = this.validatePermissionChange(sharerPermissions, permissions);
      if (!permissionValidation.isValid) {
        return { success: false, error: permissionValidation.error };
      }

      // 7. Sanitize inputs
      const sanitizedMessage = message ? this.sanitizeInput(message) : '';
      const sanitizedTargetName = this.sanitizeInput(targetUserName);
      const sanitizedPhone = targetUserPhone.replace(/[^\d+]/g, ''); // Clean phone number

      // 8. Check if target user exists
      const targetUser = await this.findUserByPhone(sanitizedPhone);
      const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString() : undefined;

      if (targetUser) {
        // User exists, create direct assignment
        const assignment: ContentShareAssignment = {
          contentType,
          contentId,
          userId: targetUser.uid,
          userPhone: sanitizedPhone,
          userName: sanitizedTargetName || targetUser.name || 'Editor',
          permissions,
          assignedBy: sharedByUserId,
          assignedByName: sharedByName,
          assignedAt: new Date().toISOString(),
          expiresAt,
          isActive: true,
          status: 'active',
          notes: sanitizedMessage,
          invitationMessage: sanitizedMessage
        };

        // Check if user already has access
        const existingQuery = query(
          collection(db(), 'contentSharing'),
          where('contentType', '==', contentType),
          where('contentId', '==', contentId),
          where('userId', '==', targetUser.uid),
          where('isActive', '==', true)
        );

        const existingSnapshot = await getDocs(existingQuery);
        
        if (!existingSnapshot.empty) {
          // Update existing assignment
          const existingDoc = existingSnapshot.docs[0];
          await updateDoc(existingDoc.ref, {
            permissions,
            assignedBy: sharedByUserId,
            assignedByName: sharedByName,
            assignedAt: assignment.assignedAt,
            expiresAt,
            notes: sanitizedMessage,
            updatedAt: serverTimestamp()
          });

          await this.logSecurityEvent({
            type: 'permission_change',
            userId: sharedByUserId,
            contentType,
            contentId,
            details: { targetUserId: targetUser.uid, newRole: permissions.role, action: 'updated' }
          });

          return { success: true, assignmentId: existingDoc.id };
        } else {
          // Create new assignment
          const docRef = await addDoc(collection(db(), 'contentSharing'), {
            ...assignment,
            createdAt: serverTimestamp()
          });

          await this.logSecurityEvent({
            type: 'access_granted',
            userId: sharedByUserId,
            contentType,
            contentId,
            details: { targetUserId: targetUser.uid, role: permissions.role, action: 'created' }
          });

          return { success: true, assignmentId: docRef.id };
        }
      } else {
        // User doesn't exist, create invitation
        const contentName = await this.getContentName(contentType, contentId);
        
        const invitation: ContentInvitation = {
          contentType,
          contentId,
          contentName,
          invitedPhone: sanitizedPhone,
          invitedByUserId: sharedByUserId,
          invitedByName: sharedByName,
          permissions,
          message: sanitizedMessage,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };

        const docRef = await addDoc(collection(db(), 'contentInvitations'), {
          ...invitation,
          createdAt: serverTimestamp()
        });

        await this.logSecurityEvent({
          type: 'access_granted',
          userId: sharedByUserId,
          contentType,
          contentId,
          details: { invitedPhone: sanitizedPhone, role: permissions.role, action: 'invitation_created' }
        });

        return { success: true, invitationId: docRef.id };
      }
    } catch (error) {
      console.error('Error sharing content:', error);
      return { success: false, error: 'Failed to share content' };
    }
  }

  /**
   * Remove shared access
   */
  static async removeSharedAccess(
    contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity',
    contentId: string,
    targetUserId: string,
    removedByUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify remover has permission
      const removerPermissions = await this.verifyContentAccess(contentType, contentId, removedByUserId);
      
      if (!removerPermissions.canManage && removerPermissions.role !== 'owner') {
        return { success: false, error: 'You do not have permission to remove access' };
      }

      // Find and remove the assignment
      const assignmentQuery = query(
        collection(db(), 'contentSharing'),
        where('contentType', '==', contentType),
        where('contentId', '==', contentId),
        where('userId', '==', targetUserId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(assignmentQuery);
      
      if (snapshot.empty) {
        return { success: false, error: 'No shared access found for this user' };
      }

      const batch = writeBatch(db());
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          removedAt: serverTimestamp(),
          removedBy: removedByUserId
        });
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error('Error removing shared access:', error);
      return { success: false, error: 'Failed to remove shared access' };
    }
  }

  /**
   * Get all users who have access to content
   */
  static async getContentCollaborators(
    contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity',
    contentId: string
  ): Promise<ContentShareAssignment[]> {
    try {
      const collaboratorsQuery = query(
        collection(db(), 'contentSharing'),
        where('contentType', '==', contentType),
        where('contentId', '==', contentId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(collaboratorsQuery);
      
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ContentShareAssignment));

      // Deduplicate by userId - keep only the most recent assignment for each user
      const userAssignmentMap = new Map<string, ContentShareAssignment>();
      
      for (const assignment of assignments) {
        // Skip expired assignments
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          continue;
        }
        
        const existingAssignment = userAssignmentMap.get(assignment.userId);
        
        if (!existingAssignment || 
            new Date(assignment.assignedAt) > new Date(existingAssignment.assignedAt)) {
          userAssignmentMap.set(assignment.userId, assignment);
        }
      }
      
      return Array.from(userAssignmentMap.values());
    } catch (error) {
      console.error('Error fetching content collaborators:', error);
      return [];
    }
  }

  /**
   * Get shared content for a user (content they have access to but don't own)
   */
  static async getUserSharedContent(userId: string): Promise<{
    artists: Array<{ uid: string; name: string; role: string }>;
    organizations: Array<{ uid: string; name: string; role: string }>;
    venues: Array<{ uid: string; name: string; role: string }>;
    events: Array<{ uid: string; name: string; role: string }>;
    activities: Array<{ uid: string; name: string; role: string }>;
  }> {
    try {
      const sharedQuery = query(
        collection(db(), 'contentSharing'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(sharedQuery);
      
      const sharedContent = {
        artists: [] as Array<{ uid: string; name: string; role: string }>,
        organizations: [] as Array<{ uid: string; name: string; role: string }>,
        venues: [] as Array<{ uid: string; name: string; role: string }>,
        events: [] as Array<{ uid: string; name: string; role: string }>,
        activities: [] as Array<{ uid: string; name: string; role: string }>
      };

      // Use Set to track already processed content to prevent duplicates
      const processedContent = new Set<string>();

      for (const docSnap of snapshot.docs) {
        const assignment = docSnap.data() as ContentShareAssignment;
        
        // Check if assignment has expired
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          continue;
        }

        // Create unique key for deduplication
        const contentKey = `${assignment.contentType}-${assignment.contentId}`;
        
        // Skip if already processed to prevent duplicates
        if (processedContent.has(contentKey)) {
          continue;
        }
        
        processedContent.add(contentKey);

        // Get the content name
        const contentName = await this.getContentName(assignment.contentType, assignment.contentId);
        
        const sharedItem = {
          uid: assignment.contentId,
          name: contentName,
          role: assignment.permissions.role
        };

        switch (assignment.contentType) {
          case 'artist':
            sharedContent.artists.push(sharedItem);
            break;
          case 'organization':
            sharedContent.organizations.push(sharedItem);
            break;
          case 'venue':
            sharedContent.venues.push(sharedItem);
            break;
          case 'event':
            sharedContent.events.push(sharedItem);
            break;
          case 'activity':
            sharedContent.activities.push(sharedItem);
            break;
        }
      }

      return sharedContent;
    } catch (error) {
      console.error('Error fetching shared content:', error);
      return {
        artists: [],
        organizations: [],
        venues: [],
        events: [],
        activities: []
      };
    }
  }

  /**
   * Get pending invitations for a user
   */
  static async getUserPendingInvitations(userPhone: string): Promise<ContentInvitation[]> {
    try {
      const invitationsQuery = query(
        collection(db(), 'contentInvitations'),
        where('invitedPhone', '==', userPhone),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(invitationsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ContentInvitation));
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }

  /**
   * Accept an invitation
   */
  static async acceptInvitation(
    invitationId: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invitationDoc = await getDoc(doc(db(), 'contentInvitations', invitationId));
      
      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found' };
      }

      const invitation = invitationDoc.data() as ContentInvitation;
      
      // Check if invitation is still valid
      if (invitation.status !== 'pending' || new Date(invitation.expiresAt) < new Date()) {
        return { success: false, error: 'Invitation has expired or already been responded to' };
      }

      // Create content sharing assignment
      const assignment: ContentShareAssignment = {
        contentType: invitation.contentType,
        contentId: invitation.contentId,
        userId,
        userPhone: invitation.invitedPhone,
        userName,
        permissions: invitation.permissions,
        assignedBy: invitation.invitedByUserId,
        assignedByName: invitation.invitedByName,
        assignedAt: new Date().toISOString(),
        isActive: true,
        status: 'active',
        notes: `Accepted invitation: ${invitation.message || ''}`,
        invitationMessage: invitation.message || ''
      };

      // Use batch to update invitation and create assignment
      const batch = writeBatch(db());
      
      // Update invitation status
      batch.update(doc(db(), 'contentInvitations', invitationId), {
        status: 'accepted',
        respondedAt: serverTimestamp(),
        invitedUserId: userId
      });

      // Create sharing assignment
      const assignmentRef = doc(collection(db(), 'contentSharing'));
      batch.set(assignmentRef, {
        ...assignment,
        createdAt: serverTimestamp()
      });

      await batch.commit();

      await this.logContentSecurityEvent({
        type: 'invitation_response',
        userId,
        contentType: invitation.contentType,
        contentId: invitation.contentId,
        action: 'invitation_accepted',
        result: 'success',
        details: { invitationId, role: invitation.permissions.role }
      });

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  /**
   * Decline an invitation
   */
  static async declineInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db(), 'contentInvitations', invitationId), {
        status: 'declined',
        respondedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error declining invitation:', error);
      return { success: false, error: 'Failed to decline invitation' };
    }
  }

  /**
   * Permission templates for different roles
   */
  static getPermissionTemplates() {
    return {
      viewer: {
        canView: true,
        canEdit: false,
        canManage: false,
        canInviteOthers: false,
        canViewAnalytics: false,
        canDelete: false,
        role: 'viewer' as const
      },
      editor: {
        canView: true,
        canEdit: true,
        canManage: false,
        canInviteOthers: false,
        canViewAnalytics: true,
        canDelete: false,
        role: 'editor' as const
      },
      admin: {
        canView: true,
        canEdit: true,
        canManage: true,
        canInviteOthers: true,
        canViewAnalytics: true,
        canDelete: false,
        role: 'admin' as const
      }
    };
  }

  // Private helper methods
  private static async checkContentOwnership(
    contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity',
    contentId: string,
    userId: string
  ): Promise<boolean> {
    try {
      let collectionName = '';
      let ownerField = 'ownerId';

      switch (contentType) {
        case 'artist':
          collectionName = 'Artists';
          break;
        case 'organization':
          collectionName = 'Organisations';
          break;
        case 'venue':
          collectionName = 'Venues';
          break;
        case 'event':
          collectionName = 'events';
          ownerField = 'organizationId';
          break;
        case 'activity':
          collectionName = 'activities';
          ownerField = 'organizationId';
          break;
      }

      const contentDoc = await getDoc(doc(db(), collectionName, contentId));
      if (!contentDoc.exists()) return false;

      const contentData = contentDoc.data();
      
      // For events, check both organizationId and creator.userId
      if (contentType === 'event') {
        return contentData.organizationId === userId || 
               (contentData.creator && contentData.creator.userId === userId);
      }

      return contentData[ownerField] === userId;
    } catch (error) {
      console.error('Error checking content ownership:', error);
      return false;
    }
  }

  private static async getSharedPermissions(
    contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity',
    contentId: string,
    userId: string
  ): Promise<ContentPermissions | null> {
    try {
      const sharingQuery = query(
        collection(db(), 'contentSharing'),
        where('contentType', '==', contentType),
        where('contentId', '==', contentId),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(sharingQuery);
      
      if (snapshot.empty) return null;

      const assignment = snapshot.docs[0].data() as ContentShareAssignment;
      
      // Check if assignment has expired
      if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
        // Mark as expired
        await updateDoc(snapshot.docs[0].ref, {
          isActive: false,
          status: 'expired'
        });
        return null;
      }

      return assignment.permissions;
    } catch (error) {
      console.error('Error getting shared permissions:', error);
      return null;
    }
  }

  private static async findUserByPhone(phone: string): Promise<{ uid: string; name: string } | null> {
    try {
      const usersQuery = query(
        collection(db(), 'Users'),
        where('phoneNumber', '==', phone)
      );

      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) return null;

      const userData = snapshot.docs[0].data();
      return {
        uid: snapshot.docs[0].id,
        name: userData.name || userData.displayName || 'Unknown User'
      };
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  }

  private static async getContentName(
    contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity',
    contentId: string
  ): Promise<string> {
    try {
      let collectionName = '';
      let nameField = 'name';

      switch (contentType) {
        case 'artist':
          collectionName = 'Artists';
          break;
        case 'organization':
          collectionName = 'Organisations';
          break;
        case 'venue':
          collectionName = 'Venues';
          break;
        case 'event':
          collectionName = 'events';
          nameField = 'title';
          break;
        case 'activity':
          collectionName = 'activities';
          nameField = 'title';
          break;
      }

      const contentDoc = await getDoc(doc(db(), collectionName, contentId));
      
      if (contentDoc.exists()) {
        const data = contentDoc.data();
        return data[nameField] || `${contentType} ${contentId}`;
      }

      return `${contentType} ${contentId}`;
    } catch (error) {
      console.error('Error getting content name:', error);
      return `${contentType} ${contentId}`;
    }
  }

  private static async logContentSecurityEvent(event: any): Promise<void> {
    try {
      await addDoc(collection(db(), 'securityEvents'), {
        ...event,
        timestamp: serverTimestamp(),
        source: 'content_sharing_security'
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  private static ownerPermissions(): ContentPermissions {
    return {
      canView: true,
      canEdit: true,
      canManage: true,
      canInviteOthers: true,
      canViewAnalytics: true,
      canDelete: true,
      role: 'owner'
    };
  }

  private static unauthorizedPermissions(): ContentPermissions {
    return {
      canView: false,
      canEdit: false,
      canManage: false,
      canInviteOthers: false,
      canViewAnalytics: false,
      canDelete: false,
      role: 'unauthorized'
    };
  }

  /**
   * Track and limit concurrent sessions
   */
  static async trackSession(userId: string, sessionId: string): Promise<boolean> {
    if (!activeSessions.has(userId)) {
      activeSessions.set(userId, new Set());
    }
    
    const userSessions = activeSessions.get(userId)!;
    
    if (userSessions.size >= SECURITY_LIMITS.maxConcurrentSessions) {
      await this.logSecurityEvent({
        type: 'session_limit_exceeded',
        userId,
        contentType: 'system',
        contentId: 'global',
        details: { sessionId, activeCount: userSessions.size }
      });
      return false;
    }
    
    userSessions.add(sessionId);
    return true;
  }

  /**
   * Enhanced permission validation with brute force protection
   */
  static async validateAccessAttempt(userId: string): Promise<boolean> {
    if (!failedAttempts.has(userId)) {
      failedAttempts.set(userId, { count: 0, lastAttempt: Date.now() });
      return true;
    }

    const attempts = failedAttempts.get(userId)!;
    const now = Date.now();

    // Reset if lockout duration has passed
    if (now - attempts.lastAttempt > SECURITY_LIMITS.lockoutDuration * 1000) {
      failedAttempts.set(userId, { count: 0, lastAttempt: now });
      return true;
    }

    if (attempts.count >= SECURITY_LIMITS.maxFailedAttempts) {
      await this.logSecurityEvent({
        type: 'account_lockout',
        userId,
        contentType: 'system',
        contentId: 'global',
        details: { failedAttempts: attempts.count }
      });
      return false;
    }

    return true;
  }

  /**
   * Record failed access attempt
   */
  static recordFailedAttempt(userId: string): void {
    const attempts = failedAttempts.get(userId) || { count: 0, lastAttempt: Date.now() };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    failedAttempts.set(userId, attempts);
  }
} 