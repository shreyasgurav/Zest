'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  collection,
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaTicketAlt, FaUser, FaChevronRight, FaCreditCard } from 'react-icons/fa';
import styles from './BookingFlow.module.css';
import { initiateRazorpayPayment, BookingData } from '@/utils/razorpay';

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
}

interface TicketType {
  name: string;
  price: number;
  available_capacity: number;
}

interface EventData {
  id: string;
  title: string;
  event_image: string;
  event_venue: string;
  time_slots: TimeSlot[];
  tickets: TicketType[];
}

interface UserInfo {
  name: string;
  email: string;
  phone: string;
}

function BookingFlow() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<EventData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      if (!params?.id) return;

      try {
        const eventDoc = await getDoc(doc(db, 'events', params.id));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          const eventData: EventData = {
            id: eventDoc.id,
            title: data.title || data.eventTitle || '',
            event_image: data.event_image || data.eventImage || '',
            event_venue: data.event_venue || data.eventVenue || '',
            time_slots: data.time_slots || [],
            tickets: data.tickets || []
          };
          setEvent(eventData);
          
          // Process dates and time slots
          const dates = Array.from(new Set(eventData.time_slots.map(slot => slot.date)));
          setAvailableDates(dates);
          
          // If only one date, select it automatically
          if (dates.length === 1) {
            setSelectedDate(dates[0]);
            const slotsForDate = eventData.time_slots.filter(slot => slot.date === dates[0]);
            setTimeSlots(slotsForDate);
          }
        } else {
          setError('Event not found');
        }
      } catch (err) {
        setError('Error fetching event details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [params?.id]);

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "Users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserInfo({
              name: userData.name || '',
              email: auth.currentUser.email || '',
              phone: userData.phone || ''
            });
          }
        } catch (err) {
          console.error('Error fetching user details:', err);
        }
      }
    };

    fetchUserDetails();
  }, [auth.currentUser]);

  useEffect(() => {
    if (selectedDate && event) {
      const slotsForDate = event.time_slots.filter(slot => slot.date === selectedDate);
      setTimeSlots(slotsForDate);
    }
  }, [selectedDate, event]);

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

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
  };

  const handleTicketQuantityChange = (ticketType: TicketType, change: number) => {
    setSelectedTickets(prev => {
      const currentQuantity = prev[ticketType.name] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);
      
      if (newQuantity === 0) {
        const { [ticketType.name]: _, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [ticketType.name]: Math.min(newQuantity, ticketType.available_capacity)
      };
    });
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getTotalAmount = () => {
    if (!event) return 0;
    return event.tickets.reduce((total, ticket) => {
      return total + (ticket.price * (selectedTickets[ticket.name] || 0));
    }, 0);
  };

  const handleBooking = async () => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }

    if (!params?.id) return;

    try {
      setLoading(true);

      // Check if user has already booked this event
      const existingBookingQuery = query(
        collection(db, 'eventAttendees'),
        where("eventId", "==", params.id),
        where("userId", "==", auth.currentUser.uid)
      );
      const existingBookingSnap = await getDocs(existingBookingQuery);

      if (!existingBookingSnap.empty) {
        setError("You have already booked this event.");
        setLoading(false);
        return;
      }

      // Prepare booking data
      const bookingData: BookingData = {
        eventId: params.id,
        userId: auth.currentUser.uid,
        name: userInfo.name,
        email: userInfo.email,
        phone: userInfo.phone,
        selectedDate: selectedDate!,
        selectedTimeSlot,
        tickets: selectedTickets,
        totalAmount: getTotalAmount(),
      };

      // Initiate Razorpay payment
      await initiateRazorpayPayment(
        {
          amount: getTotalAmount(),
          currency: 'INR',
          receipt: `event_${params.id}_${Date.now()}`,
          notes: {
            eventId: params.id,
            userId: auth.currentUser.uid,
          },
        },
        bookingData,
        'event',
        (bookingId: string) => {
          // Payment successful, navigate to confirmation page
          router.push(`/booking-confirmation/${bookingId}`);
        },
        (error: string) => {
          // Payment failed or cancelled
          console.error('Payment failed:', error);
          setLoading(false);
          // Redirect to payment failed page with error details
          router.push(`/payment-failed?eventId=${params.id}&error=${encodeURIComponent(error)}`);
        }
      );

    } catch (err) {
      console.error('Error initiating booking:', err);
      setError('Error initiating booking. Please try again.');
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!event) return <div className={styles.error}>Event not found</div>;

  return (
    <div className={styles.bookingFlow}>
      <div className={styles.bookingContainer}>
        <div className={styles.bookingProgress}>
          <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>
            <FaCalendarAlt />
            <span>Date & Time</span>
          </div>
          <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>
            <FaTicketAlt />
            <span>Tickets</span>
          </div>
          <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>
            <FaUser />
            <span>Review</span>
          </div>
        </div>

        {step === 1 && (
          <div className={styles.bookingStep}>
            <h2>Select Date & Time</h2>
            
            {availableDates.length > 1 && (
              <div className={styles.dateSelector}>
                <h4><FaCalendarAlt /> Select Date</h4>
                <div className={styles.availableDates}>
                  {availableDates.map((date) => (
                    <button
                      key={date}
                      className={`${styles.dateOption} ${selectedDate === date ? styles.selected : ''}`}
                      onClick={() => handleDateSelect(date)}
                    >
                      {formatDate(date)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDate && (
              <div className={styles.timeSelector}>
                <h4><FaClock /> Select Time</h4>
                <div className={styles.availableSlots}>
                  {timeSlots.map((slot, index) => (
                    <button
                      key={index}
                      className={`${styles.slotOption} ${selectedTimeSlot === slot ? styles.selected : ''}`}
                      onClick={() => handleTimeSlotSelect(slot)}
                      disabled={!slot.available}
                    >
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className={styles.nextButton}
              onClick={() => setStep(2)}
              disabled={!selectedTimeSlot}
            >
              <span>Continue to Tickets</span>
              <FaChevronRight />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.bookingStep}>
            <h2>Select Tickets</h2>
            <div className={styles.ticketTypes}>
              {event.tickets.map((ticket, index) => (
                <div key={index} className={styles.ticketType}>
                  <div className={styles.ticketDetails}>
                    <h3>{ticket.name}</h3>
                    <p className={styles.ticketPrice}>₹{ticket.price.toLocaleString()}</p>
                    <p className={styles.ticketsLeft}>
                      {ticket.available_capacity} tickets available
                    </p>
                  </div>
                  <div className={styles.ticketQuantity}>
                    <button
                      onClick={() => handleTicketQuantityChange(ticket, -1)}
                      className={styles.quantityButton}
                      disabled={!selectedTickets[ticket.name]}
                    >
                      -
                    </button>
                    <span>{selectedTickets[ticket.name] || 0}</span>
                    <button
                      onClick={() => handleTicketQuantityChange(ticket, 1)}
                      className={styles.quantityButton}
                      disabled={
                        (selectedTickets[ticket.name] || 0) >= ticket.available_capacity
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className={styles.nextButton}
              onClick={() => setStep(3)}
              disabled={getTotalTickets() === 0}
            >
              <span>Continue to Review</span>
              <FaChevronRight />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={styles.bookingStep}>
            <h2>Booking Summary</h2>
            <div className={styles.bookingSummary}>
              <div className={styles.eventSummary}>
                <img src={event.event_image} alt={event.title} />
                <div className={styles.eventDetails}>
                  <h3>{event.title}</h3>
                  <p>
                    <FaCalendarAlt /> {selectedDate && formatDate(selectedDate)}
                  </p>
                  <p>
                    <FaClock /> {selectedTimeSlot && `${formatTime(selectedTimeSlot.start_time)} - ${formatTime(selectedTimeSlot.end_time)}`}
                  </p>
                  <p>
                    <FaMapMarkerAlt /> {event.event_venue}
                  </p>
                </div>
              </div>

              <div className={styles.ticketInfo}>
                <h3><FaTicketAlt /> Ticket Information</h3>
                {Object.entries(selectedTickets).map(([ticketName, quantity]) => (
                  <div key={ticketName} className={styles.ticketSummary}>
                    <p>{ticketName}: {quantity} tickets</p>
                    <p>₹{(event.tickets.find(t => t.name === ticketName)?.price! * quantity).toLocaleString()}</p>
                  </div>
                ))}
                <p className={styles.totalAmount}>Total Amount: ₹{getTotalAmount().toLocaleString()}</p>
              </div>
              
              <div className={styles.userInfo}>
                <h3><FaUser /> Attendee Information</h3>
                <div className={styles.userDetails}>
                  <p>Name: {userInfo.name || 'Not provided'}</p>
                  <p>Email: {userInfo.email || 'Not provided'}</p>
                  <p>Phone: {userInfo.phone || 'Not provided'}</p>
                </div>
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
                  <span>Pay ₹{getTotalAmount().toLocaleString()}</span>
                  <FaChevronRight />
                </>
              )}
            </button>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

export default BookingFlow; 