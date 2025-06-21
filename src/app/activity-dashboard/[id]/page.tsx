'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

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
      return;
    }

    try {
      const activityDoc = await getDoc(doc(db, 'activities', activityId));
      if (activityDoc.exists()) {
        const activityData = activityDoc.data();
        setIsAuthorized(activityData.organizationId === auth.currentUser.uid);
      }
    } catch (err) {
      console.error("Error checking authorization:", err);
      setIsAuthorized(false);
    }
  };

  const fetchActivityData = async () => {
    if (!activityId) return;
    
    try {
      const activityDoc = await getDoc(doc(db, 'activities', activityId));
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

      const attendeesRef = collection(db, 'activityAttendees');
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
      const attendeesRef = collection(db, 'activityAttendees');
      const attendeesQuery = query(attendeesRef, where('activityId', '==', activityId));
      const attendeesSnapshot = await getDocs(attendeesQuery);
      
      const deletePromises = attendeesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);

      // Delete all bookings
      const bookingsRef = collection(db, 'activity_bookings');
      const bookingsQuery = query(bookingsRef, where('activityId', '==', activityId));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      const deleteBookingPromises = bookingsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deleteBookingPromises);

      // Delete the activity
      await deleteDoc(doc(db, 'activities', activityId));
      
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
            <button 
              onClick={handleEdit}
              className={styles.editButton}
              title="Edit Activity"
            >
              <FaEdit /> Edit Activity
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className={styles.deleteButton}
              title="Delete Activity"
            >
              <FaTrash /> Delete Activity
            </button>
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