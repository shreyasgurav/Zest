'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
// Firestore imports removed
import { getAuth } from 'firebase/auth';
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
    // Shared access logic can be implemented via API if needed
    // For now, since we only use Postgres and standard API endpoints, 
    // we handle basic authorization via the backend.
    return { canView: false, role: 'unauthorized' as const };
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
      const response = await fetch(`/api/activities/${activityId}`);
      
      if (!response.ok) {
        console.error('Activity not found');
        setIsAuthorized(false);
        setUserRole('unauthorized');
        setLoading(false);
        return;
      }
      
      const { activity } = await response.json();
      const creatorUserId = activity.organizationId;
      
      if (creatorUserId === auth.currentUser.uid) {
        setIsAuthorized(true);
        setUserRole('owner');
      } else {
        setIsAuthorized(false);
        setUserRole('unauthorized');
      }
    } catch (error) {
      console.error('Error checking authorization:', error);
      setIsAuthorized(false);
      setUserRole('unauthorized');
    }
  };

  const fetchActivityData = async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}`);
      if (response.ok) {
        const { activity } = await response.json();
        setActivityData(activity);
      } else {
        setError('Activity not found');
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
      setError('Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}`);
      if (response.ok) {
        const { bookings } = await response.json();
        setAttendees(bookings);
      }
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
  };

  const handleEdit = () => {
    router.push(`/edit-activity/${activityId}`);
  };

  const handleDelete = async () => {
    if (!activityId) return;
    
    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert('Failed to delete activity. Please try again.');
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