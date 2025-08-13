'use client';

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  writeBatch, 
  query, 
  where, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';
import { getUserOwnedPages } from '@/domains/authentication/services/auth.service';

export interface EventPermissions {
  canView: boolean;
  canCheckIn: boolean;
  canManageAttendees: boolean;
  canViewFinancials: boolean;
  canEditEvent: boolean;
  canViewReports: boolean;
  canSendCommunications: boolean;
  role: 'event_owner' | 'full_manager' | 'checkin_staff' | 'viewer' | 'unauthorized';
}

export interface EventCollaborationAssignment {
  id?: string;
  eventId: string;
  eventTitle: string;
  sessionId: string;
  sessionName: string;
  
  // Collaborator info (either page or user)
  collaboratorType: 'page' | 'user';
  
  // For page collaborators
  pageType?: 'artist' | 'organization' | 'venue';
  pageId?: string;
  pageName?: string;
  pageUsername?: string;
  pageOwnerId?: string; // The actual user who owns the page
  
  // For user collaborators  
  userPhone?: string;
  userId?: string;
  userName?: string;
  
  // Permissions
  permissions: EventPermissions;
  accessLevel: 'full_management' | 'checkin_only';
  
  // Assignment metadata
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;
  expiresAt?: string; // Optional - only present when there's an expiry date
  isActive: boolean;
  status: 'active' | 'pending' | 'declined' | 'expired';
  notes: string;
  invitationMessage: string;
  
  // Event visibility
  showOnEventPage: boolean; // Whether to show this collaborator on the public event page
}

export interface EventInvitation {
  id?: string;
  eventId: string;
  eventTitle: string;
  sessionId: string;
  sessionName: string;
  
  // Invitation target (either page or user)
  collaboratorType: 'page' | 'user';
  
  // For page invitations
  pageType?: 'artist' | 'organization' | 'venue';
  pageUsername?: string; // The username to lookup the page
  pageId?: string; // Set after finding the page
  pageName?: string; // Set after finding the page
  
  // For user invitations
  invitedPhone?: string;
  invitedUserId?: string; // Set when user accepts
  
  // Invitation metadata
  invitedByUserId: string;
  invitedByName: string;
  accessLevel: 'full_management' | 'checkin_only';
  permissions: EventPermissions;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;
  showOnEventPage: boolean;
}

export class EventCollaborationSecurity {
  
  /**
   * Enhanced input validation with multiple layers of security
   */
  static validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'Username is required' };
    }
    
    const trimmed = username.trim();
    
    if (trimmed.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }
    
    if (trimmed.length > 30) {
      return { isValid: false, error: 'Username must be less than 30 characters' };
    }
    
    // More restrictive regex for usernames
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(trimmed)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' };
    }
    
    // Security: Check for suspicious patterns
    const suspiciousPatterns = [
      /admin/i, /root/i, /system/i, /api/i, /null/i, /undefined/i,
      /script/i, /javascript/i, /eval/i, /alert/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(trimmed))) {
      return { isValid: false, error: 'Username contains restricted words' };
    }
    
    return { isValid: true };
  }
  
  static validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    if (!cleanPhone.startsWith('+')) {
      return { isValid: false, error: 'Phone number must start with country code (+)' };
    }
    
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return { isValid: false, error: 'Phone number must be 10-15 digits including country code' };
    }
    
    // International phone number regex
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
    
    return { isValid: true };
  }
  
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .substring(0, 500); // Limit length
  }
  
  static validateMessage(message: string): { isValid: boolean; error?: string } {
    if (!message) return { isValid: true }; // Message is optional
    
    if (message.length > 500) {
      return { isValid: false, error: 'Message must be less than 500 characters' };
    }
    
    // Check for suspicious content
    const suspiciousPatterns = [
      /<script/i, /javascript:/i, /on\w+\s*=/i, /eval\(/i, /alert\(/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(message))) {
      return { isValid: false, error: 'Message contains potentially harmful content' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Rate limiting for event collaboration invitations
   */
  private static invitationCounts = new Map<string, { count: number; resetTime: number }>();
  
  static checkInvitationRateLimit(userId: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const dailyMs = 24 * hourMs;
    
    // Clean up old entries - Fix TypeScript iterator issue
    const entriesToDelete: string[] = [];
    this.invitationCounts.forEach((data, key) => {
      if (now > data.resetTime) {
        entriesToDelete.push(key);
      }
    });
    entriesToDelete.forEach(key => this.invitationCounts.delete(key));
    
    // Check hourly limit (15 invitations per hour)
    const hourlyKey = `${userId}_hourly`;
    const hourlyData = this.invitationCounts.get(hourlyKey);
    
    if (hourlyData && hourlyData.count >= 15) {
      return { 
        allowed: false, 
        error: 'Rate limit exceeded. You can send up to 15 invitations per hour.' 
      };
    }
    
    // Check daily limit (100 invitations per day)
    const dailyKey = `${userId}_daily`;
    const dailyData = this.invitationCounts.get(dailyKey);
    
    if (dailyData && dailyData.count >= 100) {
      return { 
        allowed: false, 
        error: 'Daily limit exceeded. You can send up to 100 invitations per day.' 
      };
    }
    
    // Update counters
    this.invitationCounts.set(hourlyKey, {
      count: (hourlyData?.count || 0) + 1,
      resetTime: hourlyData?.resetTime || (now + hourMs)
    });
    
    this.invitationCounts.set(dailyKey, {
      count: (dailyData?.count || 0) + 1,
      resetTime: dailyData?.resetTime || (now + dailyMs)
    });
    
    return { allowed: true };
  }
  
  /**
   * Resource limits to prevent abuse
   */
  static async checkResourceLimits(eventId: string, inviterId: string): Promise<{ allowed: boolean; error?: string }> {
    try {
      // Check maximum collaborators per event (50)
      const collaboratorsQuery = query(
        collection(db(), 'eventCollaboration'),
        where('eventId', '==', eventId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(collaboratorsQuery);
      
      if (snapshot.size >= 50) {
        return { 
          allowed: false, 
          error: 'Maximum collaborators limit reached (50 per event)' 
        };
      }
      
      // Check maximum events shared by user (500)
      const userEventsQuery = query(
        collection(db(), 'eventCollaboration'),
        where('assignedBy', '==', inviterId),
        where('isActive', '==', true)
      );
      
      const userSnapshot = await getDocs(userEventsQuery);
      
      if (userSnapshot.size >= 500) {
        return { 
          allowed: false, 
          error: 'You have reached the maximum limit of shared events (500)' 
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Error checking resource limits:', error);
      return { allowed: false, error: 'Failed to verify resource limits' };
    }
  }
  
  /**
   * Permission templates for different access levels
   */
  static getPermissionTemplates() {
    return {
      full_management: {
        canView: true,
        canCheckIn: true,
        canManageAttendees: true,
        canViewFinancials: true,
        canEditEvent: true,
        canViewReports: true,
        canSendCommunications: true,
        role: 'full_manager' as const
      },
      checkin_only: {
        canView: true,
        canCheckIn: true,
        canManageAttendees: false,
        canViewFinancials: false,
        canEditEvent: false,
        canViewReports: false,
        canSendCommunications: false,
        role: 'checkin_staff' as const
      }
    };
  }
  
  /**
   * Find page by username across all page types
   */
  static async findPageByUsername(username: string): Promise<{
    found: boolean;
    pageType?: 'artist' | 'organization' | 'venue';
    pageId?: string;
    pageName?: string;
    ownerId?: string;
    error?: string;
  }> {
    try {
      const normalizedUsername = username.toLowerCase().trim();
      
      // Search all page collections
      const [artistsQuery, organizationsQuery, venuesQuery] = await Promise.all([
        getDocs(query(collection(db(), 'Artists'), where('username', '==', normalizedUsername))),
        getDocs(query(collection(db(), 'Organisations'), where('username', '==', normalizedUsername))),
        getDocs(query(collection(db(), 'Venues'), where('username', '==', normalizedUsername)))
      ]);
      
      if (!artistsQuery.empty) {
        const doc = artistsQuery.docs[0];
        const data = doc.data();
        return {
          found: true,
          pageType: 'artist',
          pageId: doc.id,
          pageName: data.name,
          ownerId: data.ownerId
        };
      }
      
      if (!organizationsQuery.empty) {
        const doc = organizationsQuery.docs[0];
        const data = doc.data();
        return {
          found: true,
          pageType: 'organization',
          pageId: doc.id,
          pageName: data.name,
          ownerId: data.ownerId
        };
      }
      
      if (!venuesQuery.empty) {
        const doc = venuesQuery.docs[0];
        const data = doc.data();
        return {
          found: true,
          pageType: 'venue',
          pageId: doc.id,
          pageName: data.name,
          ownerId: data.ownerId
        };
      }
      
      return { found: false, error: 'Page not found with this username' };
    } catch (error) {
      console.error('Error finding page by username:', error);
      return { found: false, error: 'Failed to search for page' };
    }
  }
  
  /**
   * Find user by phone number
   */
  static async findUserByPhone(phone: string): Promise<{ uid: string; name: string } | null> {
    try {
      console.log(`🔍 Searching for user with phone: "${phone}"`);
      
      // 🚨 DEBUG: Let's also search for a broader range of phone formats
      const phoneVariations = [
        phone, // Original
        phone.replace(/\s/g, ''), // Remove spaces
        phone.replace(/[^\d+]/g, ''), // Keep only digits and +
      ];
      
      // Add common Indian variations
      if (phone.startsWith('+91')) {
        phoneVariations.push(phone.substring(3)); // Without +91
        phoneVariations.push('91' + phone.substring(3)); // With 91 prefix
      }
      
      console.log(`🔍 Searching phone variations:`, phoneVariations);
      
      // 🚨 FIX: Search for both possible phone field names
      // Users might have phone stored as 'phone' or 'phoneNumber'
      const usersQueryByPhone = query(
        collection(db(), 'Users'),
        where('phone', '==', phone)
      );
      
      const usersQueryByPhoneNumber = query(
        collection(db(), 'Users'),
        where('phoneNumber', '==', phone)
      );
      
      console.log(`🔍 Executing parallel queries for phone fields...`);
      const [phoneSnapshot, phoneNumberSnapshot] = await Promise.all([
        getDocs(usersQueryByPhone),
        getDocs(usersQueryByPhoneNumber)
      ]);
      
      let userData = null;
      let userId = null;
      let foundField = null;
      
      if (!phoneSnapshot.empty) {
        console.log(`✅ Found user by 'phone' field`);
        userData = phoneSnapshot.docs[0].data();
        userId = phoneSnapshot.docs[0].id;
        foundField = 'phone';
      } else if (!phoneNumberSnapshot.empty) {
        console.log(`✅ Found user by 'phoneNumber' field`);
        userData = phoneNumberSnapshot.docs[0].data();
        userId = phoneNumberSnapshot.docs[0].id;
        foundField = 'phoneNumber';
      } else {
        console.log(`❌ No user found with exact phone: ${phone}`);
        
        // 🚨 DEBUG: Let's check what phone numbers actually exist in the database
        console.log(`🔍 Checking what phone numbers exist for debugging...`);
        const allUsersQuery = query(collection(db(), 'Users'));
        const allUsersSnapshot = await getDocs(allUsersQuery);
        
        console.log(`🔍 Found ${allUsersSnapshot.size} total users in database`);
        allUsersSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          if (index < 5) { // Only show first 5 for debugging
            console.log(`🔍 User ${index + 1}:`, {
              id: doc.id,
              phone: data.phone,
              phoneNumber: data.phoneNumber,
              name: data.name
            });
          }
        });
        
        return null;
      }
      
      const result = {
        uid: userId,
        name: userData.name || userData.displayName || 'Unknown User'
      };
      
      console.log(`✅ User found via '${foundField}' field:`, result);
      console.log(`🔍 User's stored phone data:`, {
        phone: userData.phone,
        phoneNumber: userData.phoneNumber
      });
      
      return result;
      
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  }
  
  /**
   * Verify if user has OWNER-level access to event (for granting access to others)
   */
  static async verifyEventOwnershipAccess(eventId: string, userId: string): Promise<boolean> {
    try {
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) return false;
      
      const eventData = eventDoc.data();
      
      // Check if user is direct event owner
      if (eventData.organizationId === userId) return true;
      if (eventData.creator && eventData.creator.userId === userId) return true;
      
      // Check if user is OWNER of the page that created this event
      if (eventData.creator && eventData.creator.contentType && eventData.creator.contentId) {
        const { contentType, contentId } = eventData.creator;
        
              // Import ContentSharingSecurity locally to avoid circular dependency
      const { ContentSharingSecurity } = await import('@/shared/utils/security/contentSharingSecurity');
        const permissions = await ContentSharingSecurity.verifyContentAccess(contentType, contentId, userId);
        
        // Only owners of the creating page can grant access
        return permissions.role === 'owner';
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying event ownership access:', error);
      return false;
    }
  }

  /**
   * Verify if user can manage event collaboration
   */
  static async verifyEventManagementAccess(eventId: string, userId: string): Promise<boolean> {
    try {
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) return false;
      
      const eventData = eventDoc.data();
      
      // Check if user is event owner
      if (eventData.organizationId === userId) return true;
      if (eventData.creator && eventData.creator.userId === userId) return true;
      
      // Check if user has full management access through collaboration
      const collaborationQuery = query(
        collection(db(), 'eventCollaboration'),
        where('eventId', '==', eventId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(collaborationQuery);
      
      for (const docSnap of snapshot.docs) {
        const assignment = docSnap.data() as EventCollaborationAssignment;
        
        // Check if expired
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          continue;
        }
        
        // Check if this assignment gives the user management access
        if (assignment.collaboratorType === 'page' && assignment.pageOwnerId === userId) {
          return assignment.accessLevel === 'full_management';
        } else if (assignment.collaboratorType === 'user' && assignment.userId === userId) {
          return assignment.accessLevel === 'full_management';
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying event management access:', error);
      return false;
    }
  }
  
  /**
   * Share session with page or user
   */
  static async shareSession(
    eventId: string,
    sessionId: string,
    sessionName: string,
    collaboratorType: 'page' | 'user',
    collaboratorIdentifier: string, // username for pages, phone for users
    accessLevel: 'full_management' | 'checkin_only',
    inviterId: string,
    inviterName: string,
    expiresInHours?: number,
    message?: string,
    showOnEventPage: boolean = false
  ): Promise<{ success: boolean; assignmentId?: string; invitationId?: string; error?: string }> {
    try {
      // 🚨 ENHANCED: Verify inviter has OWNER-level management access (not just management access)
      const hasAccess = await this.verifyEventOwnershipAccess(eventId, inviterId);
      if (!hasAccess) {
        return { success: false, error: 'Only event owners can grant check-in access to others' };
      }
      
      // Rate limiting
      const rateLimitCheck = this.checkInvitationRateLimit(inviterId);
      if (!rateLimitCheck.allowed) {
        return { success: false, error: rateLimitCheck.error };
      }
      
      // Resource limits
      const resourceCheck = await this.checkResourceLimits(eventId, inviterId);
      if (!resourceCheck.allowed) {
        return { success: false, error: resourceCheck.error };
      }
      
      // Get event data
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) {
        return { success: false, error: 'Event not found' };
      }
      
      const eventData = eventDoc.data();
      const eventTitle = eventData.title || 'Untitled Event';
      const sanitizedMessage = this.sanitizeInput(message || '');
      
      const permissions = this.getPermissionTemplates()[accessLevel];
      
      if (collaboratorType === 'page') {
        // Validate username
        const usernameValidation = this.validateUsername(collaboratorIdentifier);
        if (!usernameValidation.isValid) {
          return { success: false, error: usernameValidation.error };
        }
        
        // Find page
        const pageResult = await this.findPageByUsername(collaboratorIdentifier);
        if (!pageResult.found) {
          return { success: false, error: pageResult.error };
        }
        
        // Check for existing assignments and invitations for this page
        const existingAssignmentQuery = query(
          collection(db(), 'eventCollaboration'),
          where('eventId', '==', eventId),
          where('pageId', '==', pageResult.pageId),
          where('isActive', '==', true)
        );
        
        const existingInvitationQuery = query(
          collection(db(), 'eventInvitations'),
          where('eventId', '==', eventId),
          where('pageId', '==', pageResult.pageId),
          where('status', '==', 'pending')
        );
        
        const [existingSnapshot, invitationSnapshot] = await Promise.all([
          getDocs(existingAssignmentQuery),
          getDocs(existingInvitationQuery)
        ]);
        
        if (!existingSnapshot.empty) {
          return { success: false, error: 'This page already has access to the event' };
        }
        
        if (!invitationSnapshot.empty) {
          console.log('🔍 Found existing invitation. Debug info:');
          const existingInvitation = invitationSnapshot.docs[0].data();
          console.log('🔍 Existing invitation:', {
            phone: existingInvitation.invitedPhone,
            status: existingInvitation.status,
            createdAt: existingInvitation.createdAt,
            eventTitle: existingInvitation.eventTitle
          });
          
          // 🚨 DEBUG: Let's still run the user search to see why it failed
          console.log('🔍 Running user search debug even though invitation exists...');
          const debugUserSearch = await this.findUserByPhone(collaboratorIdentifier);
          console.log('🔍 Debug user search result:', debugUserSearch);
          
          return { success: false, error: 'This page already has a pending invitation for this event' };
        }
        
        // Create invitation for page
        const invitation: EventInvitation = {
          eventId,
          eventTitle,
          sessionId,
          sessionName,
          collaboratorType: 'page',
          pageType: pageResult.pageType,
          pageUsername: collaboratorIdentifier,
          pageId: pageResult.pageId,
          pageName: pageResult.pageName,
          invitedByUserId: inviterId,
          invitedByName: inviterName,
          accessLevel,
          permissions,
          message: sanitizedMessage,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          showOnEventPage
        };
        
        const docRef = await addDoc(collection(db(), 'eventInvitations'), {
          ...invitation,
          createdAt: serverTimestamp()
        });
        
        await this.logSecurityEvent({
          type: 'event_collaboration',
          userId: inviterId,
          eventId,
          action: 'page_invitation_sent',
          result: 'success',
          details: { 
            pageId: pageResult.pageId, 
            pageType: pageResult.pageType,
            accessLevel,
            showOnEventPage
          }
        });
        
        return { success: true, invitationId: docRef.id };
        
      } else {
        // 🚨 FIX: Direct assignment for user collaborators - no invitation needed
        const phoneValidation = this.validatePhoneNumber(collaboratorIdentifier);
        if (!phoneValidation.isValid) {
          return { success: false, error: phoneValidation.error };
        }
        
        const sanitizedPhone = phoneValidation.isValid ? collaboratorIdentifier.replace(/[^\d+]/g, '') : '';
        
        // Only allow checkin_only access for user collaborators (security measure)
        if (accessLevel !== 'checkin_only') {
          return { success: false, error: 'User collaborators can only have check-in access' };
        }
        
        // Check if user is already registered
        console.log(`🔍 Looking for existing user with phone: ${sanitizedPhone}`);
        const existingUser = await this.findUserByPhone(sanitizedPhone);
        console.log(`🔍 findUserByPhone result:`, existingUser);
        
        if (existingUser) {
          console.log('✅ User found, creating direct assignment for check-in access');
          
          // Check for existing assignments for this user
          const existingAssignmentQuery = query(
            collection(db(), 'eventCollaboration'),
            where('eventId', '==', eventId),
            where('userId', '==', existingUser.uid),
            where('isActive', '==', true)
          );
          
          const existingSnapshot = await getDocs(existingAssignmentQuery);
          
          if (!existingSnapshot.empty) {
            return { success: false, error: 'This user already has access to the event' };
          }
          
          // 🚨 FIX: Create direct assignment - no invitation needed!
          const assignment: EventCollaborationAssignment = {
            eventId,
            eventTitle,
            sessionId,
            sessionName,
            collaboratorType: 'user',
            userPhone: sanitizedPhone,
            userId: existingUser.uid,
            userName: existingUser.name,
            permissions,
            accessLevel,
            assignedBy: inviterId,
            assignedByName: inviterName,
            assignedAt: new Date().toISOString(),
            isActive: true,
            status: 'active',
            notes: `Direct check-in access granted to registered user`,
            invitationMessage: sanitizedMessage,
            showOnEventPage
          };

          // Only add expiresAt if there's an expiry time (Firestore doesn't accept undefined)
          if (expiresInHours) {
            assignment.expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
          }
          
          const docRef = await addDoc(collection(db(), 'eventCollaboration'), {
            ...assignment,
            createdAt: serverTimestamp()
          });
          
          await this.logSecurityEvent({
            type: 'event_collaboration',
            userId: inviterId,
            eventId,
            action: 'user_direct_access_granted',
            result: 'success',
            details: { 
              targetUserId: existingUser.uid, 
              accessLevel,
              showOnEventPage,
              method: 'direct_assignment'
            }
          });
          
          console.log('✅ Direct check-in access granted successfully');
          return { success: true, assignmentId: docRef.id };
          
        } else {
          console.log('ℹ️ User not found, creating invitation for unregistered user');
          
          // Check for existing invitations for this phone
          const existingInvitationQuery = query(
            collection(db(), 'eventInvitations'),
            where('eventId', '==', eventId),
            where('invitedPhone', '==', sanitizedPhone),
            where('status', '==', 'pending')
          );
          
          const invitationSnapshot = await getDocs(existingInvitationQuery);
          
          if (!invitationSnapshot.empty) {
            console.log('🔍 Found existing invitation. Debug info:');
            const existingInvitation = invitationSnapshot.docs[0].data();
            console.log('🔍 Existing invitation:', {
              phone: existingInvitation.invitedPhone,
              status: existingInvitation.status,
              createdAt: existingInvitation.createdAt,
              eventTitle: existingInvitation.eventTitle
            });
            
            // 🚨 DEBUG: Let's still run the user search to see why it failed
            console.log('🔍 Running user search debug even though invitation exists...');
            const debugUserSearch = await this.findUserByPhone(collaboratorIdentifier);
            console.log('🔍 Debug user search result:', debugUserSearch);
            
            return { success: false, error: 'This user already has a pending invitation for this event' };
          }
          
          // Create invitation for unregistered user (they'll get direct access when they register)
          const invitation: EventInvitation = {
            eventId,
            eventTitle,
            sessionId,
            sessionName,
            collaboratorType: 'user',
            invitedPhone: sanitizedPhone,
            invitedByUserId: inviterId,
            invitedByName: inviterName,
            accessLevel,
            permissions,
            message: sanitizedMessage,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days for user invitations
            showOnEventPage
          };
          
          const docRef = await addDoc(collection(db(), 'eventInvitations'), {
            ...invitation,
            createdAt: serverTimestamp()
          });
          
          await this.logSecurityEvent({
            type: 'event_collaboration',
            userId: inviterId,
            eventId,
            action: 'user_invitation_sent',
            result: 'success',
            details: { 
              invitedPhone: sanitizedPhone, 
              accessLevel,
              showOnEventPage
            }
          });
          
          console.log('✅ Invitation created for unregistered user');
          return { success: true, invitationId: docRef.id };
        }
      }
    } catch (error) {
      console.error('Error sharing event:', error);
      return { success: false, error: 'Failed to share event' };
    }
  }
  
  /**
   * Remove session collaboration
   */
  static async removeSessionAccess(
    eventId: string,
    sessionId: string,
    assignmentId: string,
    removedByUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const hasAccess = await this.verifyEventManagementAccess(eventId, removedByUserId);
      if (!hasAccess) {
        return { success: false, error: 'You do not have permission to remove access' };
      }
      
      const assignmentDoc = await getDoc(doc(db(), 'eventCollaboration', assignmentId));
      if (!assignmentDoc.exists()) {
        return { success: false, error: 'Assignment not found' };
      }
      
      await updateDoc(doc(db(), 'eventCollaboration', assignmentId), {
        isActive: false,
        status: 'expired',
        removedAt: serverTimestamp(),
        removedBy: removedByUserId
      });
      
      await this.logSecurityEvent({
        type: 'event_collaboration',
        userId: removedByUserId,
        eventId,
        action: 'access_removed',
        result: 'success',
        details: { assignmentId }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error removing event access:', error);
      return { success: false, error: 'Failed to remove access' };
    }
  }
  
  /**
   * Get session collaborators
   */
  static async getSessionCollaborators(eventId: string, sessionId?: string): Promise<EventCollaborationAssignment[]> {
    try {
      let collaboratorsQuery;
      if (sessionId) {
        collaboratorsQuery = query(
          collection(db(), 'eventCollaboration'),
          where('eventId', '==', eventId),
          where('sessionId', '==', sessionId),
          where('isActive', '==', true)
        );
      } else {
        collaboratorsQuery = query(
          collection(db(), 'eventCollaboration'),
          where('eventId', '==', eventId),
          where('isActive', '==', true)
        );
      }
      
      const snapshot = await getDocs(collaboratorsQuery);
      
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventCollaborationAssignment));
      
      // Deduplicate and filter expired
      const collaboratorMap = new Map<string, EventCollaborationAssignment>();
      
      for (const assignment of assignments) {
        // Skip expired assignments
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          continue;
        }
        
        const key = assignment.collaboratorType === 'page' 
          ? `page_${assignment.pageId}` 
          : `user_${assignment.userId}`;
        
        const existing = collaboratorMap.get(key);
        if (!existing || new Date(assignment.assignedAt) > new Date(existing.assignedAt)) {
          collaboratorMap.set(key, assignment);
        }
      }
      
      return Array.from(collaboratorMap.values());
    } catch (error) {
      console.error('Error fetching event collaborators:', error);
      return [];
    }
  }
  
  /**
   * Get events shared with user
   */
  static async getUserSharedEvents(userId: string): Promise<{
    managedEvents: Array<{ eventId: string; eventTitle: string; role: string; accessLevel: string }>;
    checkinEvents: Array<{ eventId: string; eventTitle: string; role: string; accessLevel: string }>;
  }> {
    try {
      console.log(`🔍 getUserSharedEvents called for userId: ${userId.substring(0, 8)}...`);
      
      // 🚨 CRITICAL FIX: Add proper user filtering to prevent downloading ALL collaborations
      const sharedQuery = query(
        collection(db(), 'eventCollaboration'),
        where('isActive', '==', true),
        where('userId', '==', userId) // Direct user collaborations
      );
      
      // Also need to check page-based collaborations where user owns the page
      const pageBasedQuery = query(
        collection(db(), 'eventCollaboration'),
        where('isActive', '==', true),
        where('pageOwnerId', '==', userId) // Page collaborations where user owns the page
      );
      
      console.log('🔍 Executing Firestore queries...');
      const [userSnapshot, pageSnapshot] = await Promise.all([
        getDocs(sharedQuery),
        getDocs(pageBasedQuery)
      ]);
      
      console.log(`🔍 Query results: ${userSnapshot.size} user collaborations, ${pageSnapshot.size} page collaborations`);
      
      const managedEvents = [];
      const checkinEvents = [];
      
      // Process direct user collaborations
      for (const docSnap of userSnapshot.docs) {
        const assignment = docSnap.data() as EventCollaborationAssignment;
        
        console.log(`🔍 Processing user collaboration: ${assignment.eventTitle} (${assignment.accessLevel})`);
        
        // Check if expired
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          console.log(`⏰ Assignment expired: ${assignment.eventTitle} (expired at ${assignment.expiresAt})`);
          // Mark as expired in database
          await updateDoc(docSnap.ref, {
            isActive: false,
            status: 'expired'
          });
          continue;
        }
        
        const eventInfo = {
          eventId: assignment.eventId,
          eventTitle: assignment.eventTitle,
          role: assignment.permissions.role,
          accessLevel: assignment.accessLevel
        };
        
        if (assignment.accessLevel === 'full_management') {
          managedEvents.push(eventInfo);
          console.log(`✅ Added to managed events: ${assignment.eventTitle}`);
        } else {
          checkinEvents.push(eventInfo);
          console.log(`✅ Added to checkin events: ${assignment.eventTitle}`);
        }
      }
      
      // Process page-based collaborations
      for (const docSnap of pageSnapshot.docs) {
        const assignment = docSnap.data() as EventCollaborationAssignment;
        
        console.log(`🔍 Processing page collaboration: ${assignment.eventTitle} (${assignment.accessLevel}) via page ${assignment.pageName}`);
        
        // Check if expired
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          console.log(`⏰ Page assignment expired: ${assignment.eventTitle} (expired at ${assignment.expiresAt})`);
          // Mark as expired in database
          await updateDoc(docSnap.ref, {
            isActive: false,
            status: 'expired'
          });
          continue;
        }
        
        const eventInfo = {
          eventId: assignment.eventId,
          eventTitle: assignment.eventTitle,
          role: assignment.permissions.role,
          accessLevel: assignment.accessLevel
        };
        
        if (assignment.accessLevel === 'full_management') {
          managedEvents.push(eventInfo);
          console.log(`✅ Added page event to managed events: ${assignment.eventTitle}`);
        } else {
          checkinEvents.push(eventInfo);
          console.log(`✅ Added page event to checkin events: ${assignment.eventTitle}`);
        }
      }
      
      // Remove duplicates (in case user has both direct and page access to same event)
      const uniqueManaged = Array.from(
        new Map(managedEvents.map(event => [event.eventId, event])).values()
      );
      const uniqueCheckin = Array.from(
        new Map(checkinEvents.map(event => [event.eventId, event])).values()
      );
      
      console.log(`🔍 Final results: ${uniqueManaged.length} managed events, ${uniqueCheckin.length} checkin events`);
      
      return { managedEvents: uniqueManaged, checkinEvents: uniqueCheckin };
    } catch (error) {
      console.error('❌ Error fetching user shared events:', error);
      return { managedEvents: [], checkinEvents: [] };
    }
  }
  
  /**
   * Accept event invitation
   */
  static async acceptEventInvitation(
    invitationId: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invitationDoc = await getDoc(doc(db(), 'eventInvitations', invitationId));
      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found' };
      }
      
      const invitation = invitationDoc.data() as EventInvitation;
      
      if (invitation.status !== 'pending' || new Date(invitation.expiresAt) < new Date()) {
        return { success: false, error: 'Invitation has expired or already been responded to' };
      }
      
      const assignment: EventCollaborationAssignment = {
        eventId: invitation.eventId,
        eventTitle: invitation.eventTitle,
        sessionId: invitation.sessionId,
        sessionName: invitation.sessionName,
        collaboratorType: invitation.collaboratorType,
        userPhone: invitation.invitedPhone,
        userId,
        userName,
        permissions: invitation.permissions,
        accessLevel: invitation.accessLevel,
        assignedBy: invitation.invitedByUserId,
        assignedByName: invitation.invitedByName,
        assignedAt: new Date().toISOString(),
        isActive: true,
        status: 'active',
        notes: `Accepted invitation: ${invitation.message}`,
        invitationMessage: invitation.message,
        showOnEventPage: invitation.showOnEventPage
      };
      
      const batch = writeBatch(db());
      
      // Update invitation status
      batch.update(doc(db(), 'eventInvitations', invitationId), {
        status: 'accepted',
        respondedAt: serverTimestamp(),
        invitedUserId: userId
      });
      
      // Create collaboration assignment
      const assignmentRef = doc(collection(db(), 'eventCollaboration'));
      batch.set(assignmentRef, {
        ...assignment,
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      
      await this.logSecurityEvent({
        type: 'event_collaboration',
        userId,
        eventId: invitation.eventId,
        action: 'invitation_accepted',
        result: 'success',
        details: { invitationId, accessLevel: invitation.accessLevel }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }
  
  /**
   * Verify event access for user
   */
  static async verifyEventAccess(eventId: string, userId: string): Promise<EventPermissions> {
    try {
      console.log(`🔍 verifyEventAccess: Checking access for user ${userId.substring(0, 8)}... to event ${eventId}`);
      
      // Get event data
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) {
        console.log(`❌ verifyEventAccess: Event ${eventId} not found`);
        return this.unauthorizedPermissions();
      }
      
      const eventData = eventDoc.data();
      console.log(`📅 verifyEventAccess: Event found - ${eventData.title}`);
      
      // Check if user is event owner
      if (eventData.organizationId === userId || 
          (eventData.creator && eventData.creator.userId === userId)) {
        console.log(`✅ verifyEventAccess: User is event owner`);
        return {
          canView: true,
          canCheckIn: true,
          canManageAttendees: true,
          canViewFinancials: true,
          canEditEvent: true,
          canViewReports: true,
          canSendCommunications: true,
          role: 'event_owner'
        };
      }
      
      // Check collaboration permissions
      console.log(`🔍 verifyEventAccess: Checking collaboration permissions...`);
      const collaborationQuery = query(
        collection(db(), 'eventCollaboration'),
        where('eventId', '==', eventId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(collaborationQuery);
      console.log(`🔍 verifyEventAccess: Found ${snapshot.size} collaboration records`);
      
      for (const docSnap of snapshot.docs) {
        const assignment = docSnap.data() as EventCollaborationAssignment;
        console.log(`🔍 verifyEventAccess: Checking assignment:`, {
          collaboratorType: assignment.collaboratorType,
          userId: assignment.userId?.substring(0, 8),
          pageOwnerId: assignment.pageOwnerId?.substring(0, 8),
          accessLevel: assignment.accessLevel,
          isActive: assignment.isActive,
          expiresAt: assignment.expiresAt
        });
        
        // Check if expired
        if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
          console.log(`⏰ verifyEventAccess: Assignment expired at ${assignment.expiresAt}`);
          continue;
        }
        
        // Check if this assignment gives the user access
        if (assignment.collaboratorType === 'page' && assignment.pageOwnerId === userId) {
          console.log(`✅ verifyEventAccess: Found page-based access for user`);
          return assignment.permissions;
        } else if (assignment.collaboratorType === 'user' && assignment.userId === userId) {
          console.log(`✅ verifyEventAccess: Found direct user access`);
          return assignment.permissions;
        }
      }
      
      console.log(`❌ verifyEventAccess: No collaboration access found for user ${userId.substring(0, 8)}...`);
      return this.unauthorizedPermissions();
    } catch (error) {
      console.error('❌ verifyEventAccess: Error verifying event access:', error);
      return this.unauthorizedPermissions();
    }
  }
  
  /**
   * Get pending invitations for user phone
   */
  static async getUserPendingInvitations(userPhone: string): Promise<EventInvitation[]> {
    try {
      const invitationsQuery = query(
        collection(db(), 'eventInvitations'),
        where('invitedPhone', '==', userPhone),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventInvitation));
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }
  
  /**
   * Security logging
   */
  private static async logSecurityEvent(event: any): Promise<void> {
    try {
      await addDoc(collection(db(), 'securityEvents'), {
        ...event,
        timestamp: serverTimestamp(),
        source: 'event_collaboration_security'
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
  
  private static unauthorizedPermissions(): EventPermissions {
    return {
      canView: false,
      canCheckIn: false,
      canManageAttendees: false,
      canViewFinancials: false,
      canEditEvent: false,
      canViewReports: false,
      canSendCommunications: false,
      role: 'unauthorized'
    };
  }
} 