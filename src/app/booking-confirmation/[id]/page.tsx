'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import styles from './BookingConfirmation.module.css';

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface EventBookingData {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  selectedDate: string;
  selectedTimeSlot: TimeSlot;
  tickets: Record<string, number>;
  totalAmount: number;
  createdAt: any;
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  orderId?: string;
}

interface ActivityBookingData {
  id: string;
  activityId: string;
  userId: string;
  selectedDate: string;
  selectedTimeSlot: TimeSlot;
  tickets: number;
  totalAmount: number;
  createdAt: any;
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  orderId?: string;
}

interface EventData {
  id: string;
  title: string;
  event_venue: string;
}

interface ActivityData {
  id: string;
  name: string;
  location: string;
}

const BookingConfirmation = () => {
  const params = useParams<{ id: string }>();
  const auth = getAuth();
  const [eventBooking, setEventBooking] = useState<EventBookingData | null>(null);
  const [activityBooking, setActivityBooking] = useState<ActivityBookingData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<'event' | 'activity' | null>(null);

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!auth.currentUser) {
        setError("Please login to view your booking");
        setLoading(false);
        return;
      }

      if (!params?.id) {
        setError("Booking ID not found");
        setLoading(false);
        return;
      }

      try {
        // First check if it's an event booking by booking ID
        const eventBookingDoc = await getDoc(doc(db, "eventAttendees", params.id));
        
        if (eventBookingDoc.exists()) {
          // It's an event booking
          setBookingType('event');
          const bookingData: EventBookingData = {
            id: eventBookingDoc.id,
            ...eventBookingDoc.data()
          } as EventBookingData;
          setEventBooking(bookingData);
          
          // Fetch event details
          const eventDoc = await getDoc(doc(db, "events", bookingData.eventId));
          if (eventDoc.exists()) {
            const eventData: EventData = {
              id: eventDoc.id,
              title: eventDoc.data().title || eventDoc.data().eventTitle || '',
              event_venue: eventDoc.data().event_venue || eventDoc.data().eventVenue || ''
            };
            setEvent(eventData);
          }
        } else {
          // Check if it's an activity booking
          const activityBookingDoc = await getDoc(doc(db, "activity_bookings", params.id));
          
          if (activityBookingDoc.exists()) {
            setBookingType('activity');
            const bookingData: ActivityBookingData = {
              id: activityBookingDoc.id,
              ...activityBookingDoc.data()
            } as ActivityBookingData;
            setActivityBooking(bookingData);
            
            // Fetch activity details
            const activityDoc = await getDoc(doc(db, "activities", bookingData.activityId));
            if (activityDoc.exists()) {
              const activityData: ActivityData = {
                id: activityDoc.id,
                name: activityDoc.data().name || '',
                location: activityDoc.data().location || ''
              };
              setActivity(activityData);
            }
          } else {
            setError("Booking not found");
          }
        }
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError("Error fetching booking details");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [params?.id, auth.currentUser]);

  if (loading) {
    return (
      <div className={styles.bookingConfirmation}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.bookingConfirmation}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>✕</div>
          <h2 className={styles.errorTitle}>Booking Error</h2>
          <p className={styles.errorMessage}>{error}</p>
          <Link href="/" className={`${styles.actionButton} ${styles.primary}`}>Return Home</Link>
        </div>
      </div>
    );
  }

  if (!eventBooking && !activityBooking) {
    return (
      <div className={styles.bookingConfirmation}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>✕</div>
          <h2 className={styles.errorTitle}>Booking Not Found</h2>
          <p className={styles.errorMessage}>We couldn't find your booking. Please try again or contact support.</p>
          <Link href="/" className={`${styles.actionButton} ${styles.primary}`}>Return Home</Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000/01/01 ${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Event booking confirmation
  if (bookingType === 'event' && eventBooking && event) {
    return (
      <div className={styles.bookingConfirmation}>
        <div className={styles.confirmationCard}>
          <div className={styles.successHeader}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.successTitle}>Event Booking Confirmed!</h1>
            <p>Thank you for your booking. Your booking ID is: <span className={styles.bookingId}>{eventBooking.id}</span></p>
          </div>

          <div className={styles.bookingDetails}>
            <h2 className={styles.detailsTitle}>Event Details</h2>
            
            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>🎪</span>
              <span className={styles.detailLabel}>Event</span>
              <span className={styles.detailValue}>{event.title}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>📅</span>
              <span className={styles.detailLabel}>Date</span>
              <span className={styles.detailValue}>{formatDate(eventBooking.selectedDate)}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>🕒</span>
              <span className={styles.detailLabel}>Time</span>
              <span className={styles.detailValue}>
                {formatTime(eventBooking.selectedTimeSlot.start_time)} - {formatTime(eventBooking.selectedTimeSlot.end_time)}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>📍</span>
              <span className={styles.detailLabel}>Venue</span>
              <span className={styles.detailValue}>{event.event_venue}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>🎟</span>
              <span className={styles.detailLabel}>Tickets</span>
              <div className={`${styles.ticketsList} ${styles.detailValue}`}>
                {Object.entries(eventBooking.tickets).map(([type, quantity]) => (
                  <div key={type}>{type}: {quantity}</div>
                ))}
              </div>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>💰</span>
              <span className={styles.detailLabel}>Total Amount</span>
              <span className={styles.detailValue}>₹{eventBooking.totalAmount}</span>
            </div>

            {eventBooking.paymentId && (
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>💳</span>
                <span className={styles.detailLabel}>Payment ID</span>
                <span className={styles.detailValue}>{eventBooking.paymentId}</span>
              </div>
            )}

            {eventBooking.paymentStatus && (
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>✅</span>
                <span className={styles.detailLabel}>Payment Status</span>
                <span className={styles.detailValue} style={{ 
                  color: eventBooking.paymentStatus === 'completed' ? '#10b981' : '#ef4444' 
                }}>
                  {eventBooking.paymentStatus === 'completed' ? 'Paid' : 'Failed'}
                </span>
              </div>
            )}

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>👤</span>
              <span className={styles.detailLabel}>Attendee</span>
              <div className={styles.detailValue}>
                <div>{eventBooking.name}</div>
                <div>{eventBooking.email}</div>
                <div>{eventBooking.phone}</div>
              </div>
            </div>
          </div>

          <div className={styles.confirmationActions}>
            <Link href="/" className={`${styles.actionButton} ${styles.primary}`}>
              <span className={styles.buttonIcon}>🏠</span>
              Back to Home
            </Link>
            <Link href={`/event-profile/${eventBooking.eventId}`} className={`${styles.actionButton} ${styles.secondary}`}>
              <span className={styles.buttonIcon}>📋</span>
              View Event Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Activity booking confirmation
  if (bookingType === 'activity' && activityBooking && activity) {
    return (
      <div className={styles.bookingConfirmation}>
        <div className={styles.confirmationCard}>
          <div className={styles.successHeader}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.successTitle}>Activity Booking Confirmed!</h1>
            <p>Thank you for your booking. Your booking ID is: <span className={styles.bookingId}>{activityBooking.id}</span></p>
          </div>

          <div className={styles.bookingDetails}>
            <h2 className={styles.detailsTitle}>Activity Details</h2>
            
            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>🎯</span>
              <span className={styles.detailLabel}>Activity</span>
              <span className={styles.detailValue}>{activity.name}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>📅</span>
              <span className={styles.detailLabel}>Date</span>
              <span className={styles.detailValue}>{formatDate(activityBooking.selectedDate)}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>🕒</span>
              <span className={styles.detailLabel}>Time</span>
              <span className={styles.detailValue}>
                {formatTime(activityBooking.selectedTimeSlot.start_time)} - {formatTime(activityBooking.selectedTimeSlot.end_time)}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>📍</span>
              <span className={styles.detailLabel}>Location</span>
              <span className={styles.detailValue}>{activity.location}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>🎟</span>
              <span className={styles.detailLabel}>Tickets</span>
              <span className={styles.detailValue}>{activityBooking.tickets}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailIcon}>💰</span>
              <span className={styles.detailLabel}>Total Amount</span>
              <span className={styles.detailValue}>₹{activityBooking.totalAmount}</span>
            </div>

            {activityBooking.paymentId && (
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>💳</span>
                <span className={styles.detailLabel}>Payment ID</span>
                <span className={styles.detailValue}>{activityBooking.paymentId}</span>
              </div>
            )}

            {activityBooking.paymentStatus && (
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>✅</span>
                <span className={styles.detailLabel}>Payment Status</span>
                <span className={styles.detailValue} style={{ 
                  color: activityBooking.paymentStatus === 'completed' ? '#10b981' : '#ef4444' 
                }}>
                  {activityBooking.paymentStatus === 'completed' ? 'Paid' : 'Failed'}
                </span>
              </div>
            )}
          </div>

          <div className={styles.confirmationActions}>
            <Link href="/" className={`${styles.actionButton} ${styles.primary}`}>
              <span className={styles.buttonIcon}>🏠</span>
              Back to Home
            </Link>
            <Link href={`/activity-profile/${activityBooking.activityId}`} className={`${styles.actionButton} ${styles.secondary}`}>
              <span className={styles.buttonIcon}>📋</span>
              View Activity Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BookingConfirmation; 