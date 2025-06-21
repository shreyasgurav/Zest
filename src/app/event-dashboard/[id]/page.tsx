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
import styles from './EventDashboard.module.css';
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
  tickets: Record<string, number>;
  selectedDate: string;
  selectedTimeSlot: TimeSlot;
  createdAt: string;
}

interface EventData {
  id: string;
  title: string;
  event_image?: string;
  organizationId: string;
  event_type: string;
  time_slots: Array<{
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
  }>;
  tickets: Array<{
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
  event_venue: string;
  about_event: string;
  hosting_club: string;
  organization_username: string;
  event_category: string;
  event_languages: string;
  event_duration: string;
  event_age_limit: string;
}

const EventDashboard = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const eventId = params?.id;
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }
    
    checkAuthorization();
    fetchEventData();
    fetchAttendees();
  }, [eventId]);

  const checkAuthorization = async () => {
    if (!auth.currentUser || !eventId) {
      setIsAuthorized(false);
      return;
    }

    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        setIsAuthorized(eventData.organizationId === auth.currentUser.uid);
      }
    } catch (err) {
      console.error("Error checking authorization:", err);
      setIsAuthorized(false);
    }
  };

  const fetchEventData = async () => {
    if (!eventId) return;
    
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEventData({
          id: eventDoc.id,
          title: eventDoc.data().title || eventDoc.data().eventTitle,
          event_image: eventDoc.data().event_image,
          organizationId: eventDoc.data().organizationId,
          event_type: eventDoc.data().event_type,
          time_slots: eventDoc.data().time_slots,
          tickets: eventDoc.data().tickets,
          event_venue: eventDoc.data().event_venue,
          about_event: eventDoc.data().about_event,
          hosting_club: eventDoc.data().hosting_club,
          organization_username: eventDoc.data().organization_username,
          event_category: eventDoc.data().event_category,
          event_languages: eventDoc.data().event_languages,
          event_duration: eventDoc.data().event_duration,
          event_age_limit: eventDoc.data().event_age_limit,
        });
      }
    } catch (err) {
      console.error("Error fetching event data:", err);
    }
  };

  const fetchAttendees = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      console.log("Fetching attendees for eventId:", eventId);

      const attendeesRef = collection(db, 'eventAttendees');
      const attendeesQuery = query(
        attendeesRef,
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(attendeesQuery);

      if (snapshot.empty) {
        console.log("No attendees found for eventId:", eventId);
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
    router.push(`/edit-event/${eventId}`);
  };

  const handleDelete = async () => {
    if (!isAuthorized || !eventId) return;

    try {
      // Delete all attendees first
      const attendeesRef = collection(db, 'eventAttendees');
      const attendeesQuery = query(attendeesRef, where('eventId', '==', eventId));
      const attendeesSnapshot = await getDocs(attendeesQuery);
      
      const deletePromises = attendeesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);

      // Delete the event
      await deleteDoc(doc(db, 'events', eventId));
      
      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error("Error deleting event:", err);
      setError("Failed to delete event. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className={styles.eventDashboard}>
        <div className={styles.loadingState}>Loading attendees...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.eventDashboard}>
        <div className={styles.errorState}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.eventDashboard}>
      <div className={styles.dashboardHeader}>
      <h1 className={styles.title}>{eventData?.title || 'Event Dashboard'}</h1>
        {isAuthorized && (
          <div className={styles.actionButtons}>
            <button 
              onClick={handleEdit}
              className={styles.editButton}
              title="Edit Event"
            >
              <FaEdit /> Edit Event
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className={styles.deleteButton}
              title="Delete Event"
            >
              <FaTrash /> Delete Event
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className={styles.deleteConfirmation}>
          <p>Are you sure you want to delete this event? This action cannot be undone.</p>
          <div className={styles.confirmationButtons}>
            <button 
              onClick={handleDelete}
              className={styles.confirmDeleteButton}
            >
              Yes, Delete Event
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
        <div className={styles.emptyState}>No attendees found for this event.</div>
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
                  {Object.entries(attendee.tickets).map(([ticketType, count]) => (
                    <div key={ticketType} className={styles.statusBadge}>
                      {ticketType}: {count}
                    </div>
                  ))}
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

export default EventDashboard; 