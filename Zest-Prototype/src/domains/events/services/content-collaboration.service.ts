'use client';

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/infrastructure/firebase';

export interface EventContentCollaboration {
  id?: string;
  eventId: string;
  eventTitle: string;
  eventImage?: string;
  
  // Event creator (sender of invite)
  creatorPageType: 'artist' | 'organization' | 'venue';
  creatorPageId: string;
  creatorPageName: string;
  creatorPageUsername: string;
  creatorUserId: string;
  
  // Collaborator (receiver of invite)
  collaboratorPageType: 'artist' | 'organization' | 'venue';
  collaboratorPageId: string;
  collaboratorPageName: string;
  collaboratorPageUsername: string;
  collaboratorUserId?: string; // Set when accepted
  
  // Collaboration metadata
  invitedAt: string;
  respondedAt?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  message?: string;
  
  // Event visibility
  showOnCollaboratorProfile: boolean;
  collaborationType: 'content_collaboration'; // Future: could add other types
}

export interface EventCollaborationInvite {
  id?: string;
  eventId: string;
  eventTitle: string;
  eventImage?: string;
  invitedPageUsername: string;
  invitedPageType: 'artist' | 'organization' | 'venue';
  message?: string;
  invitedByUserId: string;
  invitedByPageName: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export class EventContentCollaborationService {
  
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
   * Find user's page across all page types
   */
  static async findUserPage(userId: string): Promise<{
    found: boolean;
    pageType?: 'artist' | 'organization' | 'venue';
    pageId?: string;
    pageName?: string;
    pageUsername?: string;
    error?: string;
  }> {
    try {
      // Search all page collections for pages owned by this user
      const [artistsQuery, organizationsQuery, venuesQuery] = await Promise.all([
        getDocs(query(collection(db(), 'Artists'), where('ownerId', '==', userId))),
        getDocs(query(collection(db(), 'Organisations'), where('ownerId', '==', userId))),
        getDocs(query(collection(db(), 'Venues'), where('ownerId', '==', userId)))
      ]);
      
      // Check Artists first
      if (!artistsQuery.empty) {
        const doc = artistsQuery.docs[0];
        const data = doc.data();
        return {
          found: true,
          pageType: 'artist',
          pageId: doc.id,
          pageName: data.name,
          pageUsername: data.username
        };
      }
      
      // Check Organizations
      if (!organizationsQuery.empty) {
        const doc = organizationsQuery.docs[0];
        const data = doc.data();
        return {
          found: true,
          pageType: 'organization',
          pageId: doc.id,
          pageName: data.name,
          pageUsername: data.username
        };
      }
      
      // Check Venues
      if (!venuesQuery.empty) {
        const doc = venuesQuery.docs[0];
        const data = doc.data();
        return {
          found: true,
          pageType: 'venue',
          pageId: doc.id,
          pageName: data.name,
          pageUsername: data.username
        };
      }
      
      return { found: false, error: 'No page found for this user' };
    } catch (error) {
      console.error('Error finding user page:', error);
      return { found: false, error: 'Failed to find user page' };
    }
  }

  /**
   * Send collaboration invite to another page
   */
  static async sendCollaborationInvite(
    eventId: string,
    collaboratorUsername: string,
    message: string,
    senderUserId: string,
    senderPageId: string // This parameter is now optional/ignored
  ): Promise<{ success: boolean; error?: string; inviteId?: string }> {
    try {
      console.log(`📨 Sending collaboration invite for event ${eventId} to @${collaboratorUsername}`);
      console.log(`🔍 Debug: senderUserId = ${senderUserId}`);
      
      // Check authentication
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log(`🔍 Authentication check:`, {
        isAuthenticated: !!currentUser,
        currentUserUid: currentUser?.uid,
        currentUserEmail: currentUser?.email,
        senderUserIdMatches: currentUser?.uid === senderUserId
      });
      
      if (!currentUser) {
        console.log(`❌ User not authenticated`);
        return { success: false, error: 'User not authenticated' };
      }
      
      if (currentUser.uid !== senderUserId) {
        console.log(`❌ User ID mismatch: ${currentUser.uid} vs ${senderUserId}`);
        return { success: false, error: 'User ID mismatch' };
      }
      
      // Get event data
      console.log(`🔍 Step 1: Getting event data for ${eventId}`);
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) {
        console.log(`❌ Event not found: ${eventId}`);
        return { success: false, error: 'Event not found' };
      }
      
      const eventData = eventDoc.data();
      console.log(`✅ Event found: ${eventData.title}`);
      console.log(`🔍 Event creator userId: ${eventData.creator?.userId}, organizationId: ${eventData.organizationId}`);
      
      // Verify sender has permission: either event owner OR has full management access (editor)
      const isEventOwner = eventData.creator?.userId === senderUserId || eventData.organizationId === senderUserId;
      let hasFullManagementAccess = false;

      if (!isEventOwner) {
        try {
          // Dynamically import to avoid circular deps
          const { EventCollaborationSecurity } = await import('@/domains/events/services/collaboration.service');
          hasFullManagementAccess = await EventCollaborationSecurity.verifyEventManagementAccess(eventId, senderUserId);
          console.log(`🔍 Full management access check:`, hasFullManagementAccess);
        } catch (secErr) {
          console.error('⚠️ Error checking full management access:', secErr);
        }
      }

      if (!isEventOwner && !hasFullManagementAccess) {
        console.log(`❌ Permission denied. Sender ${senderUserId} lacks required privileges`);
        return { success: false, error: 'You do not have permission to send collaboration invites for this event' };
      }
      
      console.log(`✅ Permission check passed`);
      
      // Find the collaborator page
      console.log(`🔍 Step 2: Finding collaborator page @${collaboratorUsername}`);
      const collaboratorPage = await this.findPageByUsername(collaboratorUsername);
      console.log(`🔍 Collaborator page result:`, collaboratorPage);
      
      if (!collaboratorPage.found) {
        console.log(`❌ Collaborator page not found: @${collaboratorUsername}`);
        return { success: false, error: 'Collaborator page not found' };
      }
      
      console.log(`✅ Collaborator page found: ${collaboratorPage.pageName} (${collaboratorPage.pageType})`);
      
      // Find the sender's page automatically
      console.log(`🔍 Step 3: Finding sender page for userId ${senderUserId}`);
      const senderPage = await this.findUserPage(senderUserId);
      console.log(`🔍 Sender page result:`, senderPage);
      
      if (!senderPage.found) {
        console.log(`❌ Sender page not found for userId: ${senderUserId}`);
        return { success: false, error: 'Sender page not found. Please create a page (Artist, Organization, or Venue) to send collaboration invites.' };
      }
      
      console.log(`✅ Sender page found: ${senderPage.pageName} (${senderPage.pageType})`);
      
      console.log(`🔍 Step 4: Checking for existing collaborations`);
      
      
      // Check for existing collaboration or pending invite
      const existingCollabQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('eventId', '==', eventId),
        where('collaboratorPageId', '==', collaboratorPage.pageId)
      );
      
      const existingSnap = await getDocs(existingCollabQuery);
      if (!existingSnap.empty) {
        const existingDocRef = existingSnap.docs[0].ref;
        const existing = existingSnap.docs[0].data();
        console.log(`⚠️ Found existing collaboration:`, existing);
        
        // 🔄 RESEND LOGIC: Always update (or reset) the existing invite instead of blocking
        console.log('🔄 Resending collaboration invite – updating existing document');
        await updateDoc(existingDocRef, {
          status: 'pending',
          invitedAt: new Date().toISOString(),
          respondedAt: null,
          message: message.trim(),
          updatedAt: serverTimestamp(),
          showOnCollaboratorProfile: true
        });
        
        return { success: true, inviteId: existingDocRef.id };
      }
      
      console.log(`✅ No existing collaboration found`);
      console.log(`🔍 Step 5: Creating collaboration record`);
      
      // 🚫 Prevent sending invite to your own page
      if (collaboratorPage.pageId === senderPage.pageId) {
        console.log('❌ Attempted to send invite to own page – operation blocked');
        return { success: false, error: 'You cannot send a collaboration invite to your own page' };
      }
      
      // Create collaboration record
      const collaboration: EventContentCollaboration = {
        eventId,
        eventTitle: eventData.title,
        eventImage: eventData.event_image,
        
        // Creator info
        creatorPageType: senderPage.pageType!,
        creatorPageId: senderPage.pageId!,
        creatorPageName: senderPage.pageName!,
        creatorPageUsername: senderPage.pageUsername!,
        creatorUserId: senderUserId,
        
        // Collaborator info
        collaboratorPageType: collaboratorPage.pageType!,
        collaboratorPageId: collaboratorPage.pageId!,
        collaboratorPageName: collaboratorPage.pageName!,
        collaboratorPageUsername: collaboratorUsername,
        collaboratorUserId: collaboratorPage.ownerId,
        
        // Metadata
        invitedAt: new Date().toISOString(),
        status: 'pending',
        message: message.trim(),
        showOnCollaboratorProfile: true,
        collaborationType: 'content_collaboration'
      };
      
      console.log(`🔍 Collaboration object:`, collaboration);
      console.log(`🔍 Step 6: Adding document to Firestore`);
      
      const docRef = await addDoc(collection(db(), 'eventContentCollaboration'), {
        ...collaboration,
        createdAt: serverTimestamp()
      });
      
      console.log(`✅ Collaboration invite sent successfully: ${docRef.id}`);
      return { success: true, inviteId: docRef.id };
      
    } catch (error) {
      console.error('❌ Error sending collaboration invite:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error name',
        code: (error as any)?.code || 'No error code'
      });
      return { success: false, error: `Failed to send collaboration invite: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
  
  /**
   * Respond to collaboration invite
   */
  static async respondToInvite(
    collaborationId: string,
    response: 'accepted' | 'declined',
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const collaborationDoc = await getDoc(doc(db(), 'eventContentCollaboration', collaborationId));
      if (!collaborationDoc.exists()) {
        return { success: false, error: 'Collaboration invite not found' };
      }
      
      const collaboration = collaborationDoc.data() as EventContentCollaboration;
      
      // Verify user owns the collaborator page
      if (collaboration.collaboratorUserId !== userId) {
        return { success: false, error: 'You can only respond to invites for your own pages' };
      }
      
      if (collaboration.status !== 'pending') {
        return { success: false, error: 'This invite has already been responded to' };
      }
      
      // Update collaboration status
      await updateDoc(doc(db(), 'eventContentCollaboration', collaborationId), {
        status: response,
        respondedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Collaboration invite ${response}: ${collaborationId}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error responding to collaboration invite:', error);
      return { success: false, error: 'Failed to respond to invite' };
    }
  }
  
  /**
   * Get collaboration invites for a user's pages
   */
  static async getCollaborationInvites(userId: string): Promise<EventContentCollaboration[]> {
    try {
      console.log('🔍 getCollaborationInvites: Starting query for userId:', userId);

      // --- Method 1: Direct collaboratorUserId match (fast path) ---
      const invitesQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('collaboratorUserId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(invitesQuery);
      let invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventContentCollaboration));

      console.log('📊 Direct collaboratorUserId query results:', invites.length);

      // --- Method 2: If nothing found, fallback to page-based lookup ---
      if (invites.length === 0) {
        console.log('ℹ️ No invites found via collaboratorUserId. Falling back to page-based lookup…');
        
        // 1) Find the user's pages across all collections
        const [artistsSnap, orgsSnap, venuesSnap] = await Promise.all([
          getDocs(query(collection(db(), 'Artists'), where('ownerId', '==', userId))),
          getDocs(query(collection(db(), 'Organisations'), where('ownerId', '==', userId))),
          getDocs(query(collection(db(), 'Venues'), where('ownerId', '==', userId)))
        ]);
        
        const userPages: { id: string; type: 'artist' | 'organization' | 'venue' }[] = [];
        artistsSnap.forEach(doc => userPages.push({ id: doc.id, type: 'artist' } as any));
        orgsSnap.forEach(doc => userPages.push({ id: doc.id, type: 'organization' } as any));
        venuesSnap.forEach(doc => userPages.push({ id: doc.id, type: 'venue' } as any));
        
        console.log('🔍 User pages found:', userPages);

        if (userPages.length > 0) {
          // Firestore allows up to 10 values in 'in' filter. Split into chunks just in case.
          const chunk = (arr: { id: string; type: 'artist' | 'organization' | 'venue' }[], size: number): { id: string; type: 'artist' | 'organization' | 'venue' }[][] => {
            if (arr.length <= size) return [arr];
            return [arr.slice(0, size), ...chunk(arr.slice(size), size)];
          };
          const pageChunks = chunk(userPages, 10);
          
          for (const pages of pageChunks) {
            const pageIds = pages.map(p => p.id);
            const pageTypesSet = new Set(pages.map(p => p.type));
            
            // Query by pageId (==) and status pending. We need to OR across types since Firestore can't do composite or. We'll just filter client-side.
            const invitesByPageQuery = query(
              collection(db(), 'eventContentCollaboration'),
              where('collaboratorPageId', 'in', pageIds),
              where('status', '==', 'pending')
            );
            const pageSnapshot = await getDocs(invitesByPageQuery);
            pageSnapshot.docs.forEach(doc => {
              const data = doc.data() as EventContentCollaboration;
              if (pageTypesSet.has(data.collaboratorPageType)) {
                invites.push({ id: doc.id, ...data });
              }
            });
          }
        }
      }

      // Log final result
      console.log('📋 getCollaborationInvites: Final invites:', invites);
      
      return invites;
      
    } catch (error) {
      console.error('❌ getCollaborationInvites: Error fetching collaboration invites:', error);
      return [];
    }
  }
  
  /**
   * Get collaborations for an event
   */
  static async getEventCollaborations(eventId: string): Promise<EventContentCollaboration[]> {
    try {
      const collaborationsQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('eventId', '==', eventId),
        where('status', '==', 'accepted')
      );
      
      const snapshot = await getDocs(collaborationsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventContentCollaboration));
      
    } catch (error) {
      console.error('❌ Error fetching event collaborations:', error);
      return [];
    }
  }
  
  /**
   * Get collaborated events for a page
   */
  static async getCollaboratedEvents(pageId: string, pageType: 'artist' | 'organization' | 'venue'): Promise<string[]> {
    try {
      console.log('🔍 getCollaboratedEvents: Starting query with:', {
        pageId,
        pageType,
        collection: 'eventContentCollaboration'
      });

      const collaborationsQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('collaboratorPageId', '==', pageId),
        where('collaboratorPageType', '==', pageType),
        where('status', '==', 'accepted'),
        where('showOnCollaboratorProfile', '==', true)
      );
      
      const snapshot = await getDocs(collaborationsQuery);
      
      console.log('📊 getCollaboratedEvents: Query results:', {
        totalDocs: snapshot.docs.length,
        docs: snapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
      });
      
      const eventIds = snapshot.docs.map(doc => doc.data().eventId);
      
      console.log('📋 getCollaboratedEvents: Extracted eventIds:', eventIds);
      
      return eventIds;
      
    } catch (error) {
      console.error('❌ getCollaboratedEvents: Error fetching collaborated events:', error);
      return [];
    }
  }
  
  /**
   * Remove collaboration (creator only)
   */
  static async removeCollaboration(
    collaborationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const collaborationDoc = await getDoc(doc(db(), 'eventContentCollaboration', collaborationId));
      if (!collaborationDoc.exists()) {
        return { success: false, error: 'Collaboration not found' };
      }
      
      const collaboration = collaborationDoc.data() as EventContentCollaboration;
      
      // Verify user is the event creator
      if (collaboration.creatorUserId !== userId) {
        return { success: false, error: 'Only the event creator can remove collaborations' };
      }
      
      // Update status to revoked
      await updateDoc(doc(db(), 'eventContentCollaboration', collaborationId), {
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Collaboration removed: ${collaborationId}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error removing collaboration:', error);
      return { success: false, error: 'Failed to remove collaboration' };
    }
  }
  
  /**
   * Helper method to get collection name from page type
   */
  private static getCollectionName(pageType: string): string {
    switch (pageType) {
      case 'artist': return 'Artists';
      case 'organization': return 'Organisations';
      case 'venue': return 'Venues';
      default: return 'Artists';
    }
  }
  
  /**
   * Validate collaboration permissions
   */
  static async canManageCollaborations(eventId: string, userId: string): Promise<boolean> {
    try {
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) return false;
      
      const eventData = eventDoc.data();
      
      // Check if user is event creator
      return eventData.creator?.userId === userId || eventData.organizationId === userId;
      
    } catch (error) {
      console.error('❌ Error checking collaboration permissions:', error);
      return false;
    }
  }

  /**
   * DEBUG: Get all collaboration records for debugging
   */
  static async debugGetAllCollaborations(): Promise<void> {
    try {
      console.log('🐛 DEBUG: Fetching ALL collaboration records...');
      
      const snapshot = await getDocs(collection(db(), 'eventContentCollaboration'));
      
      console.log('🐛 DEBUG: Total collaboration records in database:', snapshot.docs.length);
      
      if (snapshot.docs.length === 0) {
        console.log('🐛 DEBUG: No collaboration records found in database');
        return;
      }

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🐛 DEBUG: Record ${index + 1}:`, {
          id: doc.id,
          eventId: data.eventId,
          eventTitle: data.eventTitle,
          creatorPageType: data.creatorPageType,
          creatorPageId: data.creatorPageId,
          creatorPageName: data.creatorPageName,
          collaboratorPageType: data.collaboratorPageType,
          collaboratorPageId: data.collaboratorPageId,
          collaboratorPageName: data.collaboratorPageName,
          status: data.status,
          showOnCollaboratorProfile: data.showOnCollaboratorProfile,
          invitedAt: data.invitedAt,
          respondedAt: data.respondedAt
        });
      });
      
    } catch (error) {
      console.error('🐛 DEBUG: Error fetching all collaborations:', error);
    }
  }

  /**
   * ENHANCED DEBUG: Comprehensive collaboration flow debugging
   */
  static async debugCollaborationFlow(
    eventId: string, 
    collaboratorUsername: string, 
    senderUserId: string
  ): Promise<void> {
    console.log('🐛🐛🐛 STARTING COMPREHENSIVE COLLABORATION DEBUG 🐛🐛🐛');
    console.log('='.repeat(80));
    
    try {
      // Step 1: Check authentication
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log('🔍 STEP 1: Authentication Check');
      console.log('Current user:', {
        isAuthenticated: !!currentUser,
        uid: currentUser?.uid,
        email: currentUser?.email,
        matchesSender: currentUser?.uid === senderUserId
      });
      
      // Step 2: Check event
      console.log('\n🔍 STEP 2: Event Verification');
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) {
        console.log('❌ Event not found!');
        return;
      }
      const eventData = eventDoc.data();
      console.log('Event data:', {
        title: eventData.title,
        creatorUserId: eventData.creator?.userId,
        organizationId: eventData.organizationId,
        senderCanSendInvites: (eventData.creator?.userId === senderUserId || eventData.organizationId === senderUserId)
      });
      
      // Step 3: Find collaborator page
      console.log('\n🔍 STEP 3: Collaborator Page Search');
      console.log(`Searching for username: "${collaboratorUsername}"`);
      
      // Check each collection manually
      const [artistsQuery, organizationsQuery, venuesQuery] = await Promise.all([
        getDocs(query(collection(db(), 'Artists'), where('username', '==', collaboratorUsername.toLowerCase().trim()))),
        getDocs(query(collection(db(), 'Organisations'), where('username', '==', collaboratorUsername.toLowerCase().trim()))),
        getDocs(query(collection(db(), 'Venues'), where('username', '==', collaboratorUsername.toLowerCase().trim())))
      ]);
      
      console.log('Query results:', {
        artists: artistsQuery.size,
        organizations: organizationsQuery.size,
        venues: venuesQuery.size
      });
      
      // Show first few results from each collection for debugging
      if (!artistsQuery.empty) {
        const artistData = artistsQuery.docs[0].data();
        console.log('Found artist:', {
          id: artistsQuery.docs[0].id,
          name: artistData.name,
          username: artistData.username,
          ownerId: artistData.ownerId
        });
      }
      if (!organizationsQuery.empty) {
        const orgData = organizationsQuery.docs[0].data();
        console.log('Found organization:', {
          id: organizationsQuery.docs[0].id,
          name: orgData.name,
          username: orgData.username,
          ownerId: orgData.ownerId
        });
      }
      if (!venuesQuery.empty) {
        const venueData = venuesQuery.docs[0].data();
        console.log('Found venue:', {
          id: venuesQuery.docs[0].id,
          name: venueData.name,
          username: venueData.username,
          ownerId: venueData.ownerId
        });
      }
      
      // Step 4: Find sender page
      console.log('\n🔍 STEP 4: Sender Page Search');
      console.log(`Searching for sender userId: "${senderUserId}"`);
      
      const [senderArtistsQuery, senderOrgsQuery, senderVenuesQuery] = await Promise.all([
        getDocs(query(collection(db(), 'Artists'), where('ownerId', '==', senderUserId))),
        getDocs(query(collection(db(), 'Organisations'), where('ownerId', '==', senderUserId))),
        getDocs(query(collection(db(), 'Venues'), where('ownerId', '==', senderUserId)))
      ]);
      
      console.log('Sender page query results:', {
        artists: senderArtistsQuery.size,
        organizations: senderOrgsQuery.size,
        venues: senderVenuesQuery.size
      });
      
      // Step 5: Check existing collaborations
      console.log('\n🔍 STEP 5: Existing Collaborations Check');
      const allCollaborationsQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('eventId', '==', eventId)
      );
      const allCollabsSnapshot = await getDocs(allCollaborationsQuery);
      console.log(`Found ${allCollabsSnapshot.size} total collaborations for this event`);
      
      allCollabsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Collaboration ${index + 1}:`, {
          id: doc.id,
          collaboratorPageId: data.collaboratorPageId,
          collaboratorPageUsername: data.collaboratorPageUsername,
          collaboratorUserId: data.collaboratorUserId,
          status: data.status
        });
      });
      
      // Step 6: Check all invites for the collaborator user
      if (!artistsQuery.empty || !organizationsQuery.empty || !venuesQuery.empty) {
        const collaboratorPage = !artistsQuery.empty 
          ? { doc: artistsQuery.docs[0], type: 'artist' }
          : !organizationsQuery.empty 
          ? { doc: organizationsQuery.docs[0], type: 'organization' }
          : { doc: venuesQuery.docs[0], type: 'venue' };
          
        const collaboratorData = collaboratorPage.doc.data();
        const collaboratorOwnerId = collaboratorData.ownerId;
        
        console.log('\n🔍 STEP 6: Collaborator Invites Check');
        console.log(`Checking invites for collaborator ownerId: "${collaboratorOwnerId}"`);
        
        const invitesQuery = query(
          collection(db(), 'eventContentCollaboration'),
          where('collaboratorUserId', '==', collaboratorOwnerId),
          where('status', '==', 'pending')
        );
        
        const invitesSnapshot = await getDocs(invitesQuery);
        console.log(`Found ${invitesSnapshot.size} pending invites for this user`);
        
        invitesSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`Invite ${index + 1}:`, {
            id: doc.id,
            eventTitle: data.eventTitle,
            eventId: data.eventId,
            collaboratorPageUsername: data.collaboratorPageUsername,
            status: data.status,
            invitedAt: data.invitedAt
          });
        });
      }
      
      console.log('\n🐛🐛🐛 DEBUG COMPLETE 🐛🐛🐛');
      console.log('='.repeat(80));
      
    } catch (error) {
      console.error('🐛 DEBUG ERROR:', error);
    }
  }

  /**
   * ENHANCED DEBUG: Quick user invite check
   */
  static async debugUserInvites(userId: string): Promise<void> {
    console.log('🔍 DEBUG: Checking invites for userId:', userId);
    
    try {
      // Check invites directly
      const invitesQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('collaboratorUserId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(invitesQuery);
      console.log(`Found ${snapshot.size} pending invites`);
      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Invite ${index + 1}:`, {
          id: doc.id,
          eventTitle: data.eventTitle,
          collaboratorPageUsername: data.collaboratorPageUsername,
          status: data.status
        });
      });
      
      // Also check user's pages
      console.log('\n🔍 Checking user pages...');
      const [artistsQuery, organizationsQuery, venuesQuery] = await Promise.all([
        getDocs(query(collection(db(), 'Artists'), where('ownerId', '==', userId))),
        getDocs(query(collection(db(), 'Organisations'), where('ownerId', '==', userId))),
        getDocs(query(collection(db(), 'Venues'), where('ownerId', '==', userId)))
      ]);
      
      console.log('User pages:', {
        artists: artistsQuery.size,
        organizations: organizationsQuery.size,
        venues: venuesQuery.size
      });
      
    } catch (error) {
      console.error('DEBUG ERROR:', error);
    }
  }

  /**
   * ENHANCED DEBUG: Database diagnostics
   */
  static async debugDatabaseDiagnostics(): Promise<void> {
    console.log('🔍 RUNNING DATABASE DIAGNOSTICS...');
    console.log('='.repeat(60));
    
    try {
      // Test 1: Check if eventContentCollaboration collection exists and is accessible
      console.log('\n📊 TEST 1: Collection Accessibility');
      const allCollabsQuery = collection(db(), 'eventContentCollaboration');
      const allCollabsSnapshot = await getDocs(allCollabsQuery);
      console.log(`✅ Collection accessible. Total documents: ${allCollabsSnapshot.size}`);
      
      // Test 2: Check recent collaborations
      console.log('\n📊 TEST 2: Recent Collaborations');
      const recentCollabs = allCollabsSnapshot.docs.slice(0, 5).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Recent collaborations:', recentCollabs);
      
      // Test 3: Check for pending invites across all users
      console.log('\n📊 TEST 3: All Pending Invites');
      const pendingQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      console.log(`Found ${pendingSnapshot.size} total pending invites`);
      
      pendingSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Pending invite ${index + 1}:`, {
          id: doc.id,
          eventTitle: data.eventTitle,
          collaboratorPageUsername: data.collaboratorPageUsername,
          collaboratorUserId: data.collaboratorUserId?.substring(0, 8) + '...',
          invitedAt: data.invitedAt
        });
      });
      
      // Test 4: Check page collections
      console.log('\n📊 TEST 4: Page Collections Check');
      const [artistsSnap, orgsSnap, venuesSnap] = await Promise.all([
        getDocs(collection(db(), 'Artists')),
        getDocs(collection(db(), 'Organisations')),
        getDocs(collection(db(), 'Venues'))
      ]);
      
      console.log('Page collections:', {
        Artists: artistsSnap.size,
        Organisations: orgsSnap.size,
        Venues: venuesSnap.size
      });
      
      // Test 5: Query performance test
      console.log('\n📊 TEST 5: Query Performance Test');
      const startTime = Date.now();
      
      // Simulate the exact query used by getCollaborationInvites
      const testUserId = 'test-user-id';
      const testQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('collaboratorUserId', '==', testUserId),
        where('status', '==', 'pending')
      );
      
      await getDocs(testQuery);
      const queryTime = Date.now() - startTime;
      console.log(`Query completed in ${queryTime}ms`);
      
      console.log('\n✅ DATABASE DIAGNOSTICS COMPLETE');
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error('❌ DATABASE DIAGNOSTICS ERROR:', error);
      console.error('Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code || 'No error code',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    }
  }
} 