'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/infrastructure/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ContentSharingSecurity } from '@/shared/utils/security/contentSharingSecurity';
import styles from './ActivityDashboard.module.css';
import { FaEdit, FaTrash } from 'react-icons/fa';

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  tickets: number;
  selectedDate: string;
  selectedTimeSlot: TimeSlot;
  createdAt: string;
}

interface ActivityData {
  id: string;
  name: string;
  activity_type: string;
  location: string;
  about_activity: string;
  activity_image: string;
  organizationId: string;
  hosting_organization: string;
  activity_category: string;
  activity_languages: string;
  activity_duration: string;
  activity_age_limit: string;
  price_per_slot: number;
  weekly_schedule: Array<{
    day: string;
    is_open: boolean;
    time_slots: Array<{
      start_time: string;
      end_time: string;
      capacity: number;
      available_capacity: number;
    }>;
  }>;
  closed_dates: string[];
}

const ActivityDashboard = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const activityId = params?.id;
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized'>('unauthorized');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Helper function to check creator's pages for shared access
  const checkCreatorPagesForSharedAccess = async (creatorUserId: string, userId: string) => {
    try {
      console.log('🔍 Looking for activity creator\'s pages:', creatorUserId);

      // Collections to check for pages owned by the creator
      const collectionsToCheck = [
        { name: 'Artists', type: 'artist' as const },
        { name: 'Organizations', type: 'organization' as const },
        { name: 'Venues', type: 'venue' as const }
      ];

      let highestRole: 'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized' = 'unauthorized';
      let hasAccess = false;

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
                hasAccess = true;
                
                // Keep the highest role found
                const roleHierarchy: Record<string, number> = { 'unauthorized': 0, 'viewer': 1, 'editor': 2, 'admin': 3, 'owner': 4 };
                if (roleHierarchy[permissions.role] > roleHierarchy[highestRole]) {
                  highestRole = permissions.role as 'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized';
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

      console.log('🏁 Final shared access result for activity:', { role: highestRole, canView: hasAccess });
      return { canView: hasAccess, role: highestRole };

    } catch (error) {
      console.error('❌ Error checking creator pages for shared access:', error);
      return { canView: false, role: 'unauthorized' };
    }
  };

  useEffect(() => {
    if (!activityId) {
      setError('No activity ID provided');
      setLoading(false);
      return;
    }
    
    checkAuthorization();
    fetchActivityData();
    fetchAttendees();
  }, [activityId]);

  const checkAuthorization = async () => {
    if (!auth.currentUser || !activityId) {
      setIsAuthorized(false);
      setUserRole('unauthorized');
      return;
    }

    try {
      const activityDoc = await getDoc(doc(db(), 'activities', activityId));
      if (activityDoc.exists()) {
        const activityData = activityDoc.data();
        
        // Check direct ownership first
        if (activityData.organizationId === auth.currentUser.uid) {
          console.log('✅ User owns the activity directly');
          setIsAuthorized(true);
          setUserRole('owner');
          return;
        }

        // Check for shared access permissions
        console.log('🔍 Checking shared access for activity:', { activityId, userId: auth.currentUser.uid, organizationId: activityData.organizationId });
        
        // Try to determine content type from organizationId format
        let contentType: 'artist' | 'organization' | 'venue' | null = null;
        let contentId = activityData.organizationId;

        if (contentId.startsWith('artist_')) {
          contentType = 'artist';
        } else if (contentId.startsWith('organization_')) {
          contentType = 'organization';
        } else if (contentId.startsWith('venue_')) {
          contentType = 'venue';
        }

        if (contentType) {
          console.log('🎯 Checking content access:', { contentType, contentId });
          
          const permissions = await ContentSharingSecurity.verifyContentAccess(
            contentType, 
            contentId, 
            auth.currentUser.uid
          );
          
          if (permissions.canView && permissions.role !== 'unauthorized') {
            console.log('✅ User has shared access:', { role: permissions.role, canEdit: permissions.canEdit });
            setIsAuthorized(true);
            setUserRole(permissions.role);
            return;
          }
        } else {
          // OrganizationId is a user ID, not a content ID
          // Check if the activity creator has any artist/organization/venue pages that the current user has access to
          console.log('🔍 OrganizationId is a user ID, checking creator\'s pages for shared access');
          
          try {
            const creatorUserId = activityData.organizationId;
            const hasSharedAccess = await checkCreatorPagesForSharedAccess(creatorUserId, auth.currentUser.uid);
            
            if (hasSharedAccess.canView) {
              console.log('✅ User has shared access via creator\'s pages:', { role: hasSharedAccess.role });
              setIsAuthorized(true);
              setUserRole(hasSharedAccess.role as 'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized');
              return;
            }
          } catch (sharedAccessError) {
            console.log('❌ Error checking shared access:', sharedAccessError);
          }
        }

        // No access found
        console.log('❌ No access found for activity');
        setIsAuthorized(false);
        setUserRole('unauthorized');
      } else {
        setIsAuthorized(false);
        setUserRole('unauthorized');
      }
    } catch (err) {
      console.error("Error checking authorization:", err);
      setIsAuthorized(false);
      setUserRole('unauthorized');
    }
  };

  const fetchActivityData = async () => {
    if (!activityId) return;
    
    try {
      const activityDoc = await getDoc(doc(db(), 'activities', activityId));
      if (activityDoc.exists()) {
        setActivityData({
          id: activityDoc.id,
          ...activityDoc.data()
        } as ActivityData);
      }
    } catch (err) {
      console.error("Error fetching activity data:", err);
    }
  };

  const fetchAttendees = async () => {
    if (!activityId) return;

    try {
      setLoading(true);
      console.log("Fetching attendees for activityId:", activityId);

      const attendeesRef = collection(db(), 'activityAttendees');
      const attendeesQuery = query(
        attendeesRef,
        where('activityId', '==', activityId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(attendeesQuery);

      if (snapshot.empty) {
        console.log("No attendees found for activityId:", activityId);
        setAttendees([]);
      } else {
        const attendeesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Attendee[];
        console.log("Attendees fetched:", attendeesList);
        setAttendees(attendeesList);
      }
    } catch (err) {
      console.error("Error fetching attendees:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/edit-activity/${activityId}`);
  };

  const handleDelete = async () => {
    if (!isAuthorized || !activityId) return;

    try {
      // Delete all attendees first
      const attendeesRef = collection(db(), 'activityAttendees');
      const attendeesQuery = query(attendeesRef, where('activityId', '==', activityId));
      const attendeesSnapshot = await getDocs(attendeesQuery);
      
      const deletePromises = attendeesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);

      // Delete all bookings
      const bookingsRef = collection(db(), 'activity_bookings');
      const bookingsQuery = query(bookingsRef, where('activityId', '==', activityId));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const deleteBookingPromises = bookingsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deleteBookingPromises);

      // Delete the activity
      await deleteDoc(doc(db(), 'activities', activityId));
      
      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error("Error deleting activity:", err);
      setError("Failed to delete activity. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className={styles.activityDashboard}>
        <div className={styles.loadingState}>Loading attendees...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.activityDashboard}>
        <div className={styles.errorState}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.activityDashboard}>
      <div className={styles.dashboardHeader}>
      <h1 className={styles.title}>{activityData?.name || 'Activity Dashboard'}</h1>
        {isAuthorized && (
          <div className={styles.actionButtons}>
            {/* Show edit button for editors and above */}
            {(userRole === 'owner' || userRole === 'admin' || userRole === 'editor') && (
            <button 
              onClick={handleEdit}
              className={styles.editButton}
              title="Edit Activity"
            >
              <FaEdit /> Edit Activity
            </button>
            )}
            {/* Show delete button only for owners and admins */}
            {(userRole === 'owner' || userRole === 'admin') && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className={styles.deleteButton}
              title="Delete Activity"
            >
              <FaTrash /> Delete Activity
            </button>
            )}
            {/* Show role indicator for shared access */}
            {userRole !== 'owner' && (
              <div className={styles.roleIndicator}>
                <span>👁️ Viewing as {userRole}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className={styles.deleteConfirmation}>
          <p>Are you sure you want to delete this activity? This action cannot be undone.</p>
          <div className={styles.confirmationButtons}>
            <button 
              onClick={handleDelete}
              className={styles.confirmDeleteButton}
            >
              Yes, Delete Activity
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className={styles.cancelDeleteButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className={styles.errorState}>{error}</div>
      )}
      
      {attendees.length === 0 ? (
        <div className={styles.emptyState}>No attendees found for this activity.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.tableHeader}>Name</th>
              <th className={styles.tableHeader}>Email</th>
              <th className={styles.tableHeader}>Phone</th>
              <th className={styles.tableHeader}>Tickets</th>
              <th className={styles.tableHeader}>Date</th>
              <th className={styles.tableHeader}>Time Slot</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((attendee) => (
              <tr key={attendee.id} className={styles.tableRow}>
                <td className={styles.tableCell}>{attendee.name}</td>
                <td className={`${styles.tableCell} ${styles.email}`}>{attendee.email}</td>
                <td className={`${styles.tableCell} ${styles.phoneNumber}`}>{attendee.phone}</td>
                <td className={styles.tableCell}>
                  <div className={styles.statusBadge}>
                    {attendee.tickets} tickets
                  </div>
                </td>
                <td className={styles.tableCell}>{attendee.selectedDate}</td>
                <td className={`${styles.tableCell} ${styles.timeSlot}`}>
                  {attendee.selectedTimeSlot.start_time} - {attendee.selectedTimeSlot.end_time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ActivityDashboard; 