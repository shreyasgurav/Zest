'use client';

import { EventContentCollaborationService } from '../services/content-collaboration.service';
import { getAuth } from 'firebase/auth';
import { getFirestore, getDoc, doc } from 'firebase/firestore';

/**
 * Global debug utilities for collaboration system
 * Usage in browser console:
 * - window.debugCollab.checkUserInvites()
 * - window.debugCollab.testCollaborationFlow('eventId', 'username')
 * - window.debugCollab.debugAllCollaborations()
 */

class CollaborationDebugger {
  
  /**
   * Check current user's invites
   */
  static async checkUserInvites() {
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('❌ No user authenticated');
      return;
    }
    
    console.log('🔍 Checking invites for current user...');
    await EventContentCollaborationService.debugUserInvites(auth.currentUser.uid);
  }
  
  /**
   * Test full collaboration flow
   */
  static async testCollaborationFlow(eventId?: string, username?: string) {
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('❌ No user authenticated');
      return;
    }
    
    // Get current URL to extract eventId if not provided
    if (!eventId) {
      const urlParts = window.location.pathname.split('/');
      const dashboardIndex = urlParts.indexOf('event-dashboard');
      if (dashboardIndex !== -1 && urlParts[dashboardIndex + 1]) {
        eventId = urlParts[dashboardIndex + 1];
      }
    }
    
    if (!eventId) {
      console.log('❌ No eventId provided and cannot extract from URL');
      console.log('Usage: window.debugCollab.testCollaborationFlow("eventId", "username")');
      return;
    }
    
    if (!username) {
      console.log('❌ No username provided');
      console.log('Usage: window.debugCollab.testCollaborationFlow("eventId", "username")');
      return;
    }
    
    console.log(`🔍 Testing collaboration flow for event ${eventId} and username @${username}`);
    await EventContentCollaborationService.debugCollaborationFlow(
      eventId, 
      username, 
      auth.currentUser.uid
    );
  }
  
  /**
   * Debug all collaborations in database
   */
  static async debugAllCollaborations() {
    console.log('🔍 Fetching all collaborations in database...');
    await EventContentCollaborationService.debugGetAllCollaborations();
  }
  
  /**
   * Run comprehensive database diagnostics
   */
  static async runDatabaseDiagnostics() {
    console.log('🔍 Running comprehensive database diagnostics...');
    await EventContentCollaborationService.debugDatabaseDiagnostics();
  }
  
  /**
   * Simple test to send an invite
   */
  static async sendTestInvite(eventId?: string, username?: string, message = 'Test collaboration invite') {
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('❌ No user authenticated');
      return;
    }
    
    if (!eventId || !username) {
      console.log('❌ Missing parameters');
      console.log('Usage: window.debugCollab.sendTestInvite("eventId", "username", "optional message")');
      return;
    }
    
    console.log(`📨 Sending test invite to @${username} for event ${eventId}`);
    
    try {
      const result = await EventContentCollaborationService.sendCollaborationInvite(
        eventId,
        username,
        message,
        auth.currentUser.uid,
        '' // Auto-find sender page
      );
      
      console.log('📨 Invite result:', result);
    } catch (error) {
      console.error('❌ Invite failed:', error);
    }
  }
  
  /**
   * Check current page context
   */
  static getCurrentPageContext() {
    const path = window.location.pathname;
    console.log('🔍 Current page context:', {
      pathname: path,
      isEventDashboard: path.includes('event-dashboard'),
      isArtistPage: path.includes('/artist/'),
      isOrganisationPage: path.includes('/organisation/'),
      isVenuePage: path.includes('/venue/'),
      currentUser: getAuth().currentUser?.uid
    });
  }
  
  /**
   * Debug organization page invites specifically
   */
  static async debugOrganizationInvites(pageId: string) {
    console.log('🔍 Debugging organization page invites...');
    
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('❌ No user authenticated');
      return;
    }

    try {
      // 1. Check the page in database
      const db = getFirestore();
      const orgDoc = await getDoc(doc(db, 'Organisations', pageId));
      console.log('Organization page details:', {
        exists: orgDoc.exists(),
        data: orgDoc.exists() ? {
          name: orgDoc.data()?.name,
          username: orgDoc.data()?.username,
          ownerId: orgDoc.data()?.ownerId
        } : 'Not found',
        pageId,
        collection: 'Organisations'
      });

      // 2. Get all invites for current user
      const allInvites = await EventContentCollaborationService.getCollaborationInvites(auth.currentUser.uid);
      
      // 3. Log detailed invite information
      console.log('All invites for current user:', allInvites.map(invite => ({
        id: invite.id,
        eventTitle: invite.eventTitle,
        collaboratorPageId: invite.collaboratorPageId,
        collaboratorPageType: invite.collaboratorPageType,
        status: invite.status,
        isForThisPage: invite.collaboratorPageId === pageId && 
                      (invite.collaboratorPageType.toLowerCase() === 'organization' || 
                       invite.collaboratorPageType.toLowerCase() === 'organisation')
      })));

    } catch (error) {
      console.error('Error in debugOrganizationInvites:', error);
    }
  }
  
  /**
   * Quick help guide
   */
  static help() {
    console.log(`
🔧 COLLABORATION DEBUG COMMANDS:

📋 Check current user's invites:
   window.debugCollab.checkUserInvites()

🔍 Test collaboration flow:
   window.debugCollab.testCollaborationFlow("eventId", "username")

📨 Send test invite:
   window.debugCollab.sendTestInvite("eventId", "username", "message")

🗂️ Debug all collaborations:
   window.debugCollab.debugAllCollaborations()

🔍 Run database diagnostics:
   window.debugCollab.runDatabaseDiagnostics()

📍 Check current page context:
   window.debugCollab.getCurrentPageContext()

🏢 Debug organization page invites:
   window.debugCollab.debugOrganizationInvites("pageId")

ℹ️ Show this help:
   window.debugCollab.help()
`);
  }
}

// Make it globally available in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugCollab = CollaborationDebugger;
  console.log('🔧 Collaboration debugger loaded! Type window.debugCollab.help() for commands');
}

export default CollaborationDebugger; 