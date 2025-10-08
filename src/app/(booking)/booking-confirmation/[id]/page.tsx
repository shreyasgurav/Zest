'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, Clock, MapPin, Ticket, CreditCard, User, Home, Copy } from 'lucide-react';
import { db } from '@/infrastructure/firebase';
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
  name: string;
  email: string;
  phone: string;
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
  const [copied, setCopied] = useState(false);

  const copyBookingId = async () => {
    const bookingId = eventBooking?.id || activityBooking?.id;
    if (!bookingId) return;

    try {
      await navigator.clipboard.writeText(bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy booking ID");
    }
  };

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
        const eventBookingDoc = await getDoc(doc(db(), "eventAttendees", params.id));
        
        if (eventBookingDoc.exists()) {
          // It's an event booking
          setBookingType('event');
          const bookingData: EventBookingData = {
            id: eventBookingDoc.id,
            ...eventBookingDoc.data()
          } as EventBookingData;
          setEventBooking(bookingData);
          
          // Fetch event details
          const eventDoc = await getDoc(doc(db(), "events", bookingData.eventId));
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
          const activityBookingDoc = await getDoc(doc(db(), "activityAttendees", params.id));
          
          if (activityBookingDoc.exists()) {
            setBookingType('activity');
            const bookingData: ActivityBookingData = {
              id: activityBookingDoc.id,
              ...activityBookingDoc.data()
            } as ActivityBookingData;
            setActivityBooking(bookingData);
            
            // Fetch activity details
            const activityDoc = await getDoc(doc(db(), "activities", bookingData.activityId));
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.successHeader}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading your booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.detailsCard}>
            <div className={styles.cardTitle}>Booking Error</div>
            <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '2rem' }}>{error}</p>
            <div className={styles.actions}>
              <Link href="/tickets" className={styles.homeButton}>
                <Ticket className={styles.homeIcon} />
                View My Tickets
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!eventBooking && !activityBooking) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.detailsCard}>
            <div className={styles.cardTitle}>Booking Not Found</div>
            <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '2rem' }}>
              We couldn't find your booking. Please try again or contact support.
            </p>
            <div className={styles.actions}>
              <Link href="/tickets" className={styles.homeButton}>
                <Ticket className={styles.homeIcon} />
                View My Tickets
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentBooking = eventBooking || activityBooking;
  const currentDetails = event || activity;
  const isEvent = bookingType === 'event';

  if (!currentBooking || !currentDetails) return null;

  // Format tickets display
  const formatTickets = () => {
    if (isEvent && eventBooking) {
      return Object.entries(eventBooking.tickets)
        .map(([type, quantity]) => `${type}: ${quantity}`)
        .join(', ');
    }
    return activityBooking?.tickets.toString() || '0';
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Success Header */}
        <div className={styles.successHeader}>
          <div className={styles.successIcon}>
            <CheckCircle className={styles.checkIcon} />
          </div>
          <h1 className={styles.title}>
            {isEvent ? 'Event' : 'Activity'} Booking Confirmed!
          </h1>
          <p className={styles.subtitle}>Thank you for your booking. Your booking ID is:</p>
          <div className={styles.bookingIdContainer}>
            <span className={styles.bookingId}>{currentBooking.id}</span>
            <button onClick={copyBookingId} className={styles.copyButton} title="Copy booking ID">
              <Copy className={styles.copyIcon} />
            </button>
          </div>
          {copied && <span className={styles.copiedText}>Copied!</span>}
        </div>

        {/* Details Card */}
        <div className={styles.detailsCard}>
          <h2 className={styles.cardTitle}>
            {isEvent ? 'Event' : 'Activity'} Details
          </h2>

          <div className={styles.detailsGrid}>
            {/* Name */}
            <div className={styles.detailItem}>
              <div className={styles.detailIcon}>
                <span className={styles.emoji}>{isEvent ? '🎪' : '🎯'}</span>
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>{isEvent ? 'Event' : 'Activity'}</span>
                <span className={styles.detailValue}>
                  {isEvent ? (event as EventData).title : (activity as ActivityData).name}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className={styles.detailItem}>
              <div className={styles.detailIcon}>
                <Calendar className={styles.iconSvg} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Date</span>
                <span className={styles.detailValue}>{formatDate(currentBooking.selectedDate)}</span>
              </div>
            </div>

            {/* Time */}
            <div className={styles.detailItem}>
              <div className={styles.detailIcon}>
                <Clock className={styles.iconSvg} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Time</span>
                <span className={styles.detailValue}>
                  {formatTime(currentBooking.selectedTimeSlot.start_time)} - {formatTime(currentBooking.selectedTimeSlot.end_time)}
                </span>
              </div>
            </div>

            {/* Venue/Location */}
            <div className={styles.detailItem}>
              <div className={styles.detailIcon}>
                <MapPin className={styles.iconSvg} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>{isEvent ? 'Venue' : 'Location'}</span>
                <span className={styles.detailValue}>
                  {isEvent ? (event as EventData).event_venue : (activity as ActivityData).location}
                </span>
              </div>
            </div>

            {/* Tickets */}
            <div className={styles.detailItem}>
              <div className={styles.detailIcon}>
                <Ticket className={styles.iconSvg} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Tickets</span>
                <span className={styles.detailValue}>{formatTickets()}</span>
              </div>
            </div>

            {/* Total Amount */}
            <div className={styles.detailItem}>
              <div className={styles.detailIcon}>
                <span className={styles.emoji}>💰</span>
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Total Amount</span>
                <span className={`${styles.detailValue} ${styles.amount}`}>
                  ₹{currentBooking.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment ID */}
            {currentBooking.paymentId && (
              <div className={styles.detailItem}>
                <div className={styles.detailIcon}>
                  <CreditCard className={styles.iconSvg} />
                </div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Payment ID</span>
                  <span className={styles.detailValue}>{currentBooking.paymentId}</span>
                </div>
              </div>
            )}

            {/* Payment Status */}
            {currentBooking.paymentStatus && (
              <div className={styles.detailItem}>
                <div className={styles.detailIcon}>
                  <CheckCircle className={styles.iconSvg} />
                </div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Payment Status</span>
                  <span className={`${styles.detailValue} ${styles.paidStatus}`}>
                    {currentBooking.paymentStatus === 'completed' ? 'Paid' : 'Failed'}
                  </span>
                </div>
              </div>
            )}

            {/* Attendee */}
            <div className={styles.detailItem}>
              <div className={styles.detailIcon}>
                <User className={styles.iconSvg} />
              </div>
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Attendee</span>
                <div className={styles.attendeeInfo}>
                  <span className={styles.detailValue}>{currentBooking.name}</span>
                  <span className={styles.phoneNumber}>{currentBooking.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href="/tickets" className={styles.homeButton}>
            <Ticket className={styles.homeIcon} />
            View My Tickets
          </Link>
        </div>

        {/* Footer Note */}
        <div className={styles.footerNote}>
          <p>Please save this confirmation for your records. You may need to show this at the venue.</p>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation; 