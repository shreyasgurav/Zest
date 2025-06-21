'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, FaLanguage, FaChevronLeft, FaChevronRight, FaCreditCard } from 'react-icons/fa';
import styles from './ActivityBookingFlow.module.css';
import { initiateRazorpayPayment, BookingData } from '@/utils/razorpay';
import dynamic from 'next/dynamic';
import type { CalendarProps } from 'react-calendar';
const Calendar = dynamic(() => import('react-calendar'), { ssr: false });
import 'react-calendar/dist/Calendar.css';

interface TimeSlot {
  start_time: string;
  end_time: string;
  capacity: number;
  available_capacity: number;
}

interface DaySchedule {
  day: string;
  is_open: boolean;
  time_slots: TimeSlot[];
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
  weekly_schedule: DaySchedule[];
  closed_dates: string[];
}

function ActivityBookingFlow() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!params?.id) return;

      try {
        const activityDoc = doc(db, "activities", params.id);
        const activitySnapshot = await getDoc(activityDoc);
        
        if (activitySnapshot.exists()) {
          const data = activitySnapshot.data();
          setActivity({
            id: activitySnapshot.id,
            ...data
          } as ActivityData);
        } else {
          setError("Activity not found");
        }
      } catch (err) {
        console.error("Error fetching activity:", err);
        setError("Error loading activity");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [params?.id]);

  useEffect(() => {
    if (activity) {
      // Generate available dates for the next 30 days
      const dates: string[] = [];
      const today = new Date();
      const closedDates = new Set(activity.closed_dates);
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Check if the day is open in weekly schedule and not in closed dates
        const daySchedule = activity.weekly_schedule.find(schedule => schedule.day === dayOfWeek);
        if (daySchedule?.is_open && !closedDates.has(dateString)) {
          dates.push(dateString);
        }
      }
      
      setAvailableDates(dates);
    }
  }, [activity]);

  useEffect(() => {
    if (activity && selectedDate) {
      const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
      const daySchedule = activity.weekly_schedule.find(schedule => schedule.day === dayOfWeek);
      
      if (daySchedule?.is_open) {
        setAvailableTimeSlots(daySchedule.time_slots.filter(slot => slot.available_capacity > 0));
      } else {
        setAvailableTimeSlots([]);
      }
    }
  }, [activity, selectedDate]);

  // Map availableDates to Date objects for calendar
  const availableDateObjects = availableDates.map(dateStr => new Date(dateStr));

  // Calendar tile disabling logic
  const isDateAvailable = (date: Date) => {
    return availableDates.includes(date.toISOString().split('T')[0]);
  };

  // When a date is picked on the calendar
  const handleCalendarChange: CalendarProps['onChange'] = (date) => {
    if (date instanceof Date) {
      setCalendarDate(date);
      setSelectedDate(date.toISOString().split('T')[0]);
      setSelectedTimeSlot(null);
    }
  };

  const handleTicketQuantityChange = (quantity: number) => {
    if (selectedTimeSlot && quantity > 0 && quantity <= selectedTimeSlot.available_capacity) {
      setTicketQuantity(quantity);
    }
  };

  const getAvailabilityBadge = (slot: TimeSlot) => {
    const percentage = (slot.available_capacity / slot.capacity) * 100;
    if (percentage > 50) return { text: 'Available', class: 'available' };
    if (percentage > 0) return { text: 'Limited', class: 'limited' };
    return { text: 'Full', class: 'full' };
  };

  const handleBooking = async () => {
    if (!activity || !selectedDate || !selectedTimeSlot) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      // Get user profile data
      const userDoc = await getDoc(doc(db, "Users", user.uid));
      const userData = userDoc.data();

      const bookingData: BookingData = {
        activityId: activity.id,
        userId: user.uid,
        name: userData?.name || user.displayName || 'Anonymous',
        email: userData?.email || user.email || '',
        phone: userData?.phone || '',
        selectedDate,
        selectedTimeSlot,
        tickets: ticketQuantity,
        totalAmount: activity.price_per_slot * ticketQuantity,
      };

      // Initiate Razorpay payment
      await initiateRazorpayPayment(
        {
          amount: activity.price_per_slot * ticketQuantity,
          currency: 'INR',
          receipt: `activity_${activity.id}_${Date.now()}`,
          notes: {
            activityId: activity.id,
            userId: user.uid,
          },
        },
        bookingData,
        'activity',
        (bookingId: string) => {
          // Payment successful, navigate to confirmation page
          router.push(`/booking-confirmation/${bookingId}`);
        },
        (error: string) => {
          // Payment failed or cancelled
          console.error('Payment failed:', error);
          setLoading(false);
          // Redirect to payment failed page with error details
          router.push(`/payment-failed?activityId=${activity.id}&error=${encodeURIComponent(error)}`);
        }
      );

    } catch (err) {
      console.error("Error initiating booking:", err);
      setError("Error initiating booking. Please try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.bookingFlow}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className={styles.bookingFlow}>
        <div className={styles.error}>{error || "Activity not found"}</div>
      </div>
    );
  }

  return (
    <div className={styles.bookingFlow}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.activityName}>{activity.name}</h1>
          <p className={styles.location}>
            <FaMapMarkerAlt /> {activity.location}
          </p>
        </div>

        <h2 className={styles.sectionTitle}>Select Date & Time</h2>

        <div className={styles.calendarContainer}>
          <div className={styles.calendarWrapper}>
            <Calendar
              onChange={handleCalendarChange}
              value={calendarDate}
              tileDisabled={({ date }: { date: Date }) => !isDateAvailable(date)}
              minDate={new Date()}
              maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              className={styles.zestCalendar}
              tileClassName={({ date, view }) => {
                if (view === 'month') {
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  const isSelected = calendarDate && date.toDateString() === calendarDate.toDateString();
                  const isAvailable = isDateAvailable(date);
                  
                  let classes = [];
                  if (isToday) classes.push(styles.today);
                  if (isSelected) classes.push(styles.selected);
                  if (!isAvailable) classes.push(styles.disabled);
                  
                  return classes.join(' ');
                }
                return '';
              }}
            />
          </div>
        </div>

        {calendarDate && (
          <div className={styles.selectedDateInfo}>
            <div className={styles.selectedDateLabel}>
              {calendarDate.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric', 
                weekday: 'long' 
              })}
            </div>
          </div>
        )}

        {calendarDate && (
          <div className={styles.slotsContainer}>
            {availableTimeSlots.length > 0 ? (
              <>
                <div className={styles.slotsGrid}>
                  {availableTimeSlots.map((slot, idx) => {
                    const badge = getAvailabilityBadge(slot);
                    return (
                      <div
                        key={idx}
                        className={`${styles.timeSlot} ${selectedTimeSlot === slot ? styles.selected : ''}`}
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        <div className={styles.timeSlotHeader}>
                          <div className={styles.timeRange}>
                            <FaClock className={styles.timeIcon} />
                            {slot.start_time} - {slot.end_time}
                          </div>
                          <div className={`${styles.availabilityBadge} ${styles[badge.class]}`}>
                            {badge.text}
                          </div>
                        </div>
                        <div className={styles.timeSlotDetails}>
                          <div className={styles.capacity}>
                            <FaUsers className={styles.capacityIcon} />
                            {slot.available_capacity}/{slot.capacity} spots available
                          </div>
                          <div className={styles.duration}>
                            Duration: {activity.activity_duration}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedTimeSlot && (
                  <div className={styles.ticketSection}>
                    <div className={styles.ticketQuantity}>
                      <label>Number of Tickets:</label>
                      <div className={styles.quantityControls}>
                        <button
                          className={styles.quantityButton}
                          onClick={() => handleTicketQuantityChange(ticketQuantity - 1)}
                          disabled={ticketQuantity <= 1}
                        >
                          -
                        </button>
                        <span className={styles.quantityValue}>{ticketQuantity}</span>
                        <button
                          className={styles.quantityButton}
                          onClick={() => handleTicketQuantityChange(ticketQuantity + 1)}
                          disabled={ticketQuantity >= selectedTimeSlot.available_capacity}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div className={styles.totalAmount}>
                      Total: ₹{(activity.price_per_slot * ticketQuantity).toLocaleString()}
                    </div>

                    <button 
                      className={styles.bookButton} 
                      onClick={handleBooking}
                      disabled={loading}
                    >
                      {loading ? (
                        'Processing Payment...'
                      ) : (
                        <>
                          <FaCreditCard />
                          <span>Pay ₹{(activity.price_per_slot * ticketQuantity).toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noSlotsMessage}>
                No available time slots for this date.
              </div>
            )}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

export default ActivityBookingFlow;