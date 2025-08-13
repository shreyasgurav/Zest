'use client';

import { 
  collection, 
  doc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';
import { invalidateEventCache } from '@/shared/hooks/useEventData';

interface CleanupResult {
  success: boolean;
  cleaned: {
    collaborations: number;
    invitations: number;
    attendees: number;
    tickets: number;
    contentSharing: number;
    checkInAccess: number;
  };
  errors: string[];
}

export class EventCleanupService {
  
  /**
   * 🧹 MASTER CLEANUP: Delete event and ALL related data
   * This is the main function that should be called when deleting events
   */
  static async deleteEventCompletely(
    eventId: string, 
    userId: string
  ): Promise<CleanupResult> {
    console.log(`🧹 Starting complete event deletion: ${eventId}`);
    
    const result: CleanupResult = {
      success: false,
      cleaned: {
        collaborations: 0,
        invitations: 0,
        attendees: 0,
        tickets: 0,
        contentSharing: 0,
        checkInAccess: 0
      },
      errors: []
    };

    try {
      // 1. Verify user can delete this event
      const canDelete = await this.verifyDeletePermissions(eventId, userId);
      if (!canDelete) {
        result.errors.push('Insufficient permissions to delete this event');
        return result;
      }

      // 2. Cleanup all related data (in batches for efficiency)
      await this.cleanupEventContentCollaborations(eventId, result);
      await this.cleanupEventCollaborations(eventId, result);
      await this.cleanupEventInvitations(eventId, result);
      await this.cleanupEventAttendees(eventId, result);
      await this.cleanupEventTickets(eventId, result);
      await this.cleanupContentSharing(eventId, result);

      // 3. Delete the main event document
      await deleteDoc(doc(db(), 'events', eventId));
      console.log(`✅ Main event document deleted: ${eventId}`);

      // 4. Invalidate all caches
      invalidateEventCache(eventId);
      
      // 5. Clear any browser storage
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage).filter(key => key.includes(eventId));
        keys.forEach(key => localStorage.removeItem(key));
      }

      result.success = true;
      console.log(`🎉 Event deletion completed successfully:`, result.cleaned);

    } catch (error) {
      console.error('❌ Error during event deletion:', error);
      result.errors.push(`Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * 🧹 Clean up Event Content Collaborations (Instagram-style)
   */
  private static async cleanupEventContentCollaborations(
    eventId: string, 
    result: CleanupResult
  ): Promise<void> {
    try {
      console.log(`🧹 Cleaning event content collaborations for: ${eventId}`);
      
      const collaborationsQuery = query(
        collection(db(), 'eventContentCollaboration'),
        where('eventId', '==', eventId)
      );

      const snapshot = await getDocs(collaborationsQuery);
      console.log(`🔍 Found ${snapshot.size} content collaborations to delete`);

      if (snapshot.empty) return;

      // Use batch for efficiency (max 500 operations per batch)
      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db());
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }

      result.cleaned.collaborations = snapshot.size;
      console.log(`✅ Deleted ${snapshot.size} content collaborations`);

    } catch (error) {
      console.error('❌ Error cleaning content collaborations:', error);
      result.errors.push(`Content collaborations cleanup failed: ${error}`);
    }
  }

  /**
   * 🧹 Clean up Event Collaborations (Check-in access)
   */
  private static async cleanupEventCollaborations(
    eventId: string, 
    result: CleanupResult
  ): Promise<void> {
    try {
      console.log(`🧹 Cleaning event collaborations for: ${eventId}`);
      
      const collaborationsQuery = query(
        collection(db(), 'eventCollaboration'),
        where('eventId', '==', eventId)
      );

      const snapshot = await getDocs(collaborationsQuery);
      console.log(`🔍 Found ${snapshot.size} check-in collaborations to delete`);

      if (snapshot.empty) return;

      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db());
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }

      result.cleaned.checkInAccess = snapshot.size;
      console.log(`✅ Deleted ${snapshot.size} check-in collaborations`);

    } catch (error) {
      console.error('❌ Error cleaning collaborations:', error);
      result.errors.push(`Collaborations cleanup failed: ${error}`);
    }
  }

  /**
   * 🧹 Clean up Event Invitations
   */
  private static async cleanupEventInvitations(
    eventId: string, 
    result: CleanupResult
  ): Promise<void> {
    try {
      console.log(`🧹 Cleaning event invitations for: ${eventId}`);
      
      const invitationsQuery = query(
        collection(db(), 'eventInvitations'),
        where('eventId', '==', eventId)
      );

      const snapshot = await getDocs(invitationsQuery);
      console.log(`🔍 Found ${snapshot.size} invitations to delete`);

      if (snapshot.empty) return;

      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db());
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }

      result.cleaned.invitations = snapshot.size;
      console.log(`✅ Deleted ${snapshot.size} invitations`);

    } catch (error) {
      console.error('❌ Error cleaning invitations:', error);
      result.errors.push(`Invitations cleanup failed: ${error}`);
    }
  }

  /**
   * 🧹 Clean up Event Attendees
   */
  private static async cleanupEventAttendees(
    eventId: string, 
    result: CleanupResult
  ): Promise<void> {
    try {
      console.log(`🧹 Cleaning event attendees for: ${eventId}`);
      
      const attendeesQuery = query(
        collection(db(), 'eventAttendees'),
        where('eventId', '==', eventId)
      );

      const snapshot = await getDocs(attendeesQuery);
      console.log(`🔍 Found ${snapshot.size} attendees to delete`);

      if (snapshot.empty) return;

      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db());
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }

      result.cleaned.attendees = snapshot.size;
      console.log(`✅ Deleted ${snapshot.size} attendees`);

    } catch (error) {
      console.error('❌ Error cleaning attendees:', error);
      result.errors.push(`Attendees cleanup failed: ${error}`);
    }
  }

  /**
   * 🧹 Clean up Event Tickets
   */
  private static async cleanupEventTickets(
    eventId: string, 
    result: CleanupResult
  ): Promise<void> {
    try {
      console.log(`🧹 Cleaning event tickets for: ${eventId}`);
      
      const ticketsQuery = query(
        collection(db(), 'tickets'),
        where('eventId', '==', eventId)
      );

      const snapshot = await getDocs(ticketsQuery);
      console.log(`🔍 Found ${snapshot.size} tickets to delete`);

      if (snapshot.empty) return;

      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db());
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }

      result.cleaned.tickets = snapshot.size;
      console.log(`✅ Deleted ${snapshot.size} tickets`);

    } catch (error) {
      console.error('❌ Error cleaning tickets:', error);
      result.errors.push(`Tickets cleanup failed: ${error}`);
    }
  }

  /**
   * 🧹 Clean up Content Sharing
   */
  private static async cleanupContentSharing(
    eventId: string, 
    result: CleanupResult
  ): Promise<void> {
    try {
      console.log(`🧹 Cleaning content sharing for: ${eventId}`);
      
      const sharingQuery = query(
        collection(db(), 'contentSharing'),
        where('eventId', '==', eventId)
      );

      const snapshot = await getDocs(sharingQuery);
      console.log(`🔍 Found ${snapshot.size} content sharing records to delete`);

      if (snapshot.empty) return;

      const batchSize = 500;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db());
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        batchDocs.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }

      result.cleaned.contentSharing = snapshot.size;
      console.log(`✅ Deleted ${snapshot.size} content sharing records`);

    } catch (error) {
      console.error('❌ Error cleaning content sharing:', error);
      result.errors.push(`Content sharing cleanup failed: ${error}`);
    }
  }

  /**
   * 🔐 Verify user has permission to delete this event
   */
  private static async verifyDeletePermissions(
    eventId: string, 
    userId: string
  ): Promise<boolean> {
    try {
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (!eventDoc.exists()) return false;

      const eventData = eventDoc.data();
      
      // User must be event owner or creator
      return eventData.organizationId === userId || 
             eventData.creator?.userId === userId;

    } catch (error) {
      console.error('Error verifying delete permissions:', error);
      return false;
    }
  }

  /**
   * 🧹 ADMINISTRATIVE: Clean up orphaned data (run periodically)
   * This finds and removes orphaned collaborations/invitations where events no longer exist
   */
  static async cleanupOrphanedData(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    console.log('🧹 Starting orphaned data cleanup...');
    
    const result = { cleaned: 0, errors: [] as string[] };

    try {
      // Find all collaborations
      const collaborationsSnapshot = await getDocs(collection(db(), 'eventContentCollaboration'));
      
      console.log(`🔍 Checking ${collaborationsSnapshot.size} collaborations for orphaned data...`);

      for (const collabDoc of collaborationsSnapshot.docs) {
        const collaboration = collabDoc.data();
        const eventId = collaboration.eventId;

        // Check if event still exists
        const eventDoc = await getDoc(doc(db(), 'events', eventId));
        
        if (!eventDoc.exists()) {
          console.log(`🧹 Found orphaned collaboration for deleted event: ${eventId}`);
          
          // Delete the orphaned collaboration
          await deleteDoc(collabDoc.ref);
          
          // Invalidate cache
          invalidateEventCache(eventId);
          
          result.cleaned++;
        }
      }

      console.log(`✅ Orphaned data cleanup completed. Cleaned ${result.cleaned} records.`);

    } catch (error) {
      console.error('❌ Error during orphaned data cleanup:', error);
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * 🚨 EMERGENCY: Force cleanup specific event (for fixing data issues)
   */
  static async emergencyCleanup(eventId: string): Promise<CleanupResult> {
    console.log(`🚨 EMERGENCY: Force cleaning all data for event: ${eventId}`);
    
    const result: CleanupResult = {
      success: false,
      cleaned: {
        collaborations: 0,
        invitations: 0,
        attendees: 0,
        tickets: 0,
        contentSharing: 0,
        checkInAccess: 0
      },
      errors: []
    };

    // Run all cleanup operations without permission checks
    await this.cleanupEventContentCollaborations(eventId, result);
    await this.cleanupEventCollaborations(eventId, result);
    await this.cleanupEventInvitations(eventId, result);
    await this.cleanupEventAttendees(eventId, result);
    await this.cleanupEventTickets(eventId, result);
    await this.cleanupContentSharing(eventId, result);

    // Invalidate cache
    invalidateEventCache(eventId);

    result.success = true;
    return result;
  }
} 