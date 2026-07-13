'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
// Firestore imports removed
import { getAuth } from 'firebase/auth';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, FaLanguage, FaChevronLeft, FaChevronRight, FaCreditCard, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import styles from './ActivityBookingFlow.module.css';
import { loadRazorpayScript } from '@/domains/payments/services/razorpay';
import dynamic from 'next/dynamic';
import type { CalendarProps } from 'react-calendar';
const Calendar = dynamic(() => import('react-calendar'), { ssr: false });
import 'react-calendar/dist/Calendar.css';

interface TimeSlot {
  start_time: string;
  end_time: string;
  capacity: number;
  available_capacity: number; // Will be calculated dynamically
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

interface ActivityBooking {
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
  createdAt: string;
  status?: string;
  paymentStatus?: string;
}

function ActivityBookingFlow() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [activityBookings, setActivityBookings] = useState<ActivityBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate real-time availability for activity time slots
  const calculateRealTimeAvailability = (activityData: ActivityData, bookingsList: ActivityBooking[], targetDate: string): DaySchedule[] => {
    const dayOfWeek = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' });
    
    return activityData.weekly_schedule.map(daySchedule => {
      if (daySchedule.day !== dayOfWeek) {
        return daySchedule;
      }

      const updatedTimeSlots = daySchedule.time_slots.map(slot => {
        // Count actual booked spots for this specific date and time slot
        const bookedSpots = bookingsList.reduce((count, booking) => {
          if (booking.selectedDate === targetDate &&
              booking.selectedTimeSlot.start_time === slot.start_time &&
              booking.selectedTimeSlot.end_time === slot.end_time) {
            return count + booking.tickets;
          }
          return count;
        }, 0);

        return {
          ...slot,
          available_capacity: Math.max(0, slot.capacity - bookedSpots)
        };
      });

      return {
        ...daySchedule,
        time_slots: updatedTimeSlots
      };
    });
  };

  // Fetch activity details with real-time updates from Postgres API
  const fetchActivity = async (showRefreshIndicator = false) => {
    if (!params?.id) return;

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await fetch(`/api/activities/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to load activity');
      }

      const data = await response.json();
      
      if (data.activity) {
        setActivity(data.activity as ActivityData);
        setActivityBookings(data.bookings || []);
        setLastRefresh(new Date());

        console.log('Real-time activity availability calculated:', {
          totalBookings: data.bookings?.length || 0,
          totalSpots: (data.bookings || []).reduce((sum: number, booking: any) => sum + (booking.tickets || 0), 0)
        });
      } else {
        setError("Activity not found");
      }
    } catch (err) {
      console.error("Error fetching activity:", err);
      setError("Error loading activity");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Set up automatic refresh interval when time slots are visible
  useEffect(() => {
    if (calendarDate && availableTimeSlots.length > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchActivity(true);
      }, 15000); // Refresh every 15 seconds for critical booking data

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [calendarDate, availableTimeSlots.length]);

  useEffect(() => {
    fetchActivity();
    
    // Refresh data when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchActivity(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
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
      // Calculate real-time availability for the selected date
      const updatedSchedule = calculateRealTimeAvailability(activity, activityBookings, selectedDate);
      const dayOfWeek = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
      const daySchedule = updatedSchedule.find(schedule => schedule.day === dayOfWeek);
      
      if (daySchedule?.is_open) {
        setAvailableTimeSlots(daySchedule.time_slots);
      } else {
        setAvailableTimeSlots([]);
      }
    }
  }, [activity, activityBookings, selectedDate]);

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
    if (slot.available_capacity === 0) return { text: 'SOLD OUT', class: 'soldOut', color: '#ef4444' };
    if (percentage <= 10) return { text: 'Critical', class: 'critical', color: '#f59e0b' };
    if (percentage <= 25) return { text: 'Limited', class: 'limited', color: '#f59e0b' };
    if (percentage > 50) return { text: 'Available', class: 'available', color: '#10b981' };
    return { text: 'Few Left', class: 'few', color: '#f59e0b' };
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    await fetchActivity(true);
  };

  const handleBooking = async () => {
    if (!activity || !selectedDate || !selectedTimeSlot) return;

    // Validate activity price before proceeding
    if (typeof activity.price_per_slot !== 'number' || isNaN(activity.price_per_slot)) {
      setError("This activity has an invalid price configuration. Please contact support.");
      console.error("Invalid price for activity:", activity.id);
      return;
    }
    
    const totalAmount = activity.price_per_slot * ticketQuantity;

    // If activity is free, we should handle it differently (or disallow for now)
    // The create-order API rejects orders with amount <= 0
    if (totalAmount <= 0) {
      setError("Bookings for free activities are not supported via this payment flow.");
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);

      // Get user profile data
      const token = await user.getIdToken();
      const res = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = res.ok ? (await res.json()).user : null;

      const contact = {
        name: userData?.name || user.displayName || 'Anonymous',
        email: userData?.email || userData?.contactEmail || user.email || 'no-email@zest.dev',
        phone: userData?.phone || '0000000000',
      };

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) throw new Error('Failed to load Razorpay script');

      // Create Razorpay order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          receipt: `activity_${activity.id}_${Date.now()}`,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');
      const order = orderData.order;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Zest',
        description: 'Activity Booking',
        order_id: order.id,
        prefill: { name: contact.name, email: contact.email, contact: contact.phone },
        theme: { color: '#c084fc' },
        handler: async (response: any) => {
          try {
            // Persist the booking atomically in Postgres.
            const bookingPayload = {
              userId: user.uid,
              activityId: activity.id,
              date: selectedDate,
              startTime: selectedTimeSlot.start_time,
              endTime: selectedTimeSlot.end_time,
              quantity: ticketQuantity,
              contact,
              payment: {
                method: 'RAZORPAY',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            };

            const bookingRes = await fetch('/api/bookings/activity', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bookingPayload),
            });
            const bookingResult = await bookingRes.json();
            if (!bookingRes.ok) {
              throw new Error(bookingResult.message || bookingResult.error || 'Booking failed');
            }

            router.push(`/booking-confirmation/${bookingResult.bookingId}`);
          } catch (err: any) {
            console.error('Booking failed:', err);
            setLoading(false);
            router.push(`/payment-failed?activityId=${activity.id}&error=${encodeURIComponent(err.message || 'Verification failed')}`);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

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
                <div className={styles.slotsHeader}>
                  <h3>Available Time Slots</h3>
                  <div className={styles.refreshSection}>
                    <button 
                      onClick={handleManualRefresh}
                      className={styles.refreshButton}
                      disabled={isRefreshing}
                    >
                      <FaSync className={isRefreshing ? styles.spinning : ''} />
                      {isRefreshing ? 'Updating...' : 'Refresh'}
                    </button>
                    <span className={styles.lastUpdate}>
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <div className={styles.slotsGrid}>
                  {availableTimeSlots.map((slot, idx) => {
                    const badge = getAvailabilityBadge(slot);
                    const isSoldOut = slot.available_capacity === 0;
                    return (
                      <div
                        key={idx}
                        className={`${styles.timeSlot} ${selectedTimeSlot === slot ? styles.selected : ''} ${isSoldOut ? styles.soldOut : ''}`}
                        onClick={() => !isSoldOut && setSelectedTimeSlot(slot)}
                        style={{ cursor: isSoldOut ? 'not-allowed' : 'pointer' }}
                      >
                        <div className={styles.timeSlotHeader}>
                          <div className={styles.timeRange}>
                            <FaClock className={styles.timeIcon} />
                            {slot.start_time} - {slot.end_time}
                          </div>
                          <div 
                            className={`${styles.availabilityBadge} ${styles[badge.class]}`}
                            style={{ backgroundColor: badge.color }}
                          >
                            {badge.text}
                          </div>
                        </div>
                        <div className={styles.timeSlotDetails}>
                          <div className={styles.capacity}>
                            <FaUsers className={styles.capacityIcon} />
                            {isSoldOut ? (
                              <span className={styles.soldOutText}>
                                <FaExclamationTriangle /> Sold Out
                              </span>
                            ) : (
                              <span>{slot.available_capacity} of {slot.capacity} spots available</span>
                            )}
                          </div>
                          {!isSoldOut && (
                            <div className={styles.progressBar}>
                              <div 
                                className={styles.progressFill}
                                style={{ 
                                  width: `${((slot.capacity - slot.available_capacity) / slot.capacity) * 100}%`,
                                  backgroundColor: badge.color
                                }}
                              />
                            </div>
                          )}
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
                    <div className={styles.sectionTitle}>
                      <h4>Book Your Spots</h4>
                      <div className={styles.slotInfo}>
                        Selected: {selectedTimeSlot.start_time} - {selectedTimeSlot.end_time}
                      </div>
                    </div>
                    
                    <div className={styles.ticketQuantity}>
                      <label>Number of Spots:</label>
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
                    
                    <div className={styles.bookingSummary}>
                      <div className={styles.summaryItem}>
                        <span>Spots: {ticketQuantity}</span>
                        <span>₹{activity.price_per_slot.toLocaleString()} each</span>
                      </div>
                      <div className={styles.totalAmount}>
                        Total: ₹{(activity.price_per_slot * ticketQuantity).toLocaleString()}
                      </div>
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