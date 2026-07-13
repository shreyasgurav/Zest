'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaTicketAlt, FaUser, FaChevronRight, FaCreditCard, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import styles from './BookingFlow.module.css';
import { DateSelector } from '@/components/ui';

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  session_id?: string;
}

interface TicketType {
  id?: string;
  name: string;
  price: number;
  capacity: number;
  available_capacity: number;
}

// NEW: Session interface for session-centric events
interface EventSession {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date?: string; // Optional end date for multi-day sessions
  venue?: string;
  description?: string;
  tickets: Array<{
    id?: string;
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
  available: boolean;
  maxCapacity?: number;
}

interface EventData {
  id: string;
  title: string;
  event_image: string;
  event_venue: string;
  architecture?: 'legacy' | 'session-centric';
  
  // Legacy fields
  time_slots: TimeSlot[];
  tickets: TicketType[];
  
  // NEW: Session-centric fields
  sessions?: EventSession[];
  venue_type?: 'global' | 'per_session';
  total_sessions?: number;
  total_capacity?: number;
}

interface UserInfo {
  name: string;
  email: string;
  phone: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  tickets: Record<string, number> | number;
  selectedDate: string;
  selectedTimeSlot: TimeSlot;
  selectedSession?: EventSession; // NEW: For session-centric events
  createdAt: string;
  status?: string;
  paymentStatus?: string;
  // New properties for individual attendee records
  ticketType?: string;
  canCheckInIndependently?: boolean;
  sessionId?: string; // NEW: Session ID for session-centric events
}

function BookingFlow() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<EventData | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  
  // Legacy states
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // NEW: Session-centric states
  const [selectedSession, setSelectedSession] = useState<EventSession | null>(null);
  const [availableSessions, setAvailableSessions] = useState<EventSession[]>([]);
  const [availableSessionDates, setAvailableSessionDates] = useState<string[]>([]);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string | null>(null);
  const [sessionsForSelectedDate, setSessionsForSelectedDate] = useState<EventSession[]>([]);
  
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvent = async (showRefreshIndicator = false) => {
    if (!params?.id) return;

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res = await fetch(`/api/events/${params.id}`);
      if (!res.ok) throw new Error('Event not found');
      
      const { event: eventData } = await res.json();
      
      setEvent(eventData);
      setLastRefresh(new Date());
      
      if (eventData.architecture === 'session-centric' && eventData.sessions) {
        setAvailableSessions(eventData.sessions);
        const uniqueDates = Array.from(new Set(eventData.sessions.map((s: any) => s.date.split('T')[0]))).sort() as string[];
        setAvailableSessionDates(uniqueDates);
        
        if (uniqueDates.length === 1) {
          setSelectedSessionDate(uniqueDates[0]);
          const sessionsForDate = eventData.sessions.filter((s: any) => s.date.startsWith(uniqueDates[0]));
          setSessionsForSelectedDate(sessionsForDate);
          if (sessionsForDate.length === 1) {
            setSelectedSession(sessionsForDate[0]);
          }
        }
      }
    } catch (err) {
      setError('Error fetching event details');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Auto-refresh setup
  useEffect(() => {
    if (step === 2 || step === 3) {
      // Set up auto-refresh for critical booking steps
      refreshIntervalRef.current = setInterval(() => {
        fetchEvent(true);
      }, 15000); // Refresh every 15 seconds for critical ticket data

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [step]);

  // Fetch event details on component mount and when returning to tab
  useEffect(() => {
    fetchEvent();
    
    // Refresh data when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchEvent(true);
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

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            const dataResponse = await res.json();
            const userData = dataResponse.user;
            setUserInfo({
              name: userData.name || '',
              email: userData.email || userData.contactEmail || auth.currentUser.email || '',
              phone: userData.phone || ''
            });
          } else {
            // If user document doesn't exist, still set what we can from auth
            setUserInfo({
              name: '',
              email: auth.currentUser.email || '',
              phone: ''
            });
          }
        } catch (err) {
          console.error('Error fetching user details:', err);
          // Fallback to auth data if REST API fails
          setUserInfo({
            name: '',
            email: auth.currentUser.email || '',
            phone: ''
          });
        }
      }
    };

    fetchUserDetails();
  }, [auth.currentUser]);

  // Legacy event: Update time slots when date changes
  useEffect(() => {
    if (selectedDate && event && event.architecture !== 'session-centric') {
      const slotsForDate = event.time_slots.filter(slot => slot.date === selectedDate);
      setTimeSlots(slotsForDate);
    }
  }, [selectedDate, event]);

  // Session-centric: Update available tickets when session changes
  useEffect(() => {
    if (selectedSession && event) {
      // With Postgres, the session tickets already have the correct available_capacity
      setEvent(prev => prev ? { ...prev, tickets: selectedSession.tickets } : null);
    }
  }, [selectedSession]);

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

  // Legacy event handlers
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
  };

  // NEW: Session-centric event handlers
  const handleSessionDateSelect = (date: string) => {
    setSelectedSessionDate(date);
    setSelectedSession(null); // Reset session selection
    setSelectedTickets({}); // Reset ticket selection
    
    // Filter sessions for the selected date
    const sessionsForDate = availableSessions.filter(session => session.date === date);
    setSessionsForSelectedDate(sessionsForDate);
    
    // If only one session on that date, auto-select it
    if (sessionsForDate.length === 1) {
      setSelectedSession(sessionsForDate[0]);
    }
  };

  const handleSessionSelect = (session: EventSession) => {
    setSelectedSession(session);
    setSelectedTickets({}); // Reset ticket selection when changing sessions
  };

  const handleTicketQuantityChange = (ticketType: TicketType, change: number) => {
    setSelectedTickets(prev => {
      const currentQuantity = prev[ticketType.name] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);
      
      if (newQuantity === 0) {
        const { [ticketType.name]: _, ...rest } = prev;
        return rest;
      }
      
      // Double-check against real-time availability
      const maxAllowed = Math.min(newQuantity, ticketType.available_capacity);
      
      return {
        ...prev,
        [ticketType.name]: maxAllowed
      };
    });
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getTotalAmount = () => {
    if (!event) return 0;
    
    // For session-centric events, use selected session tickets
    if (event.architecture === 'session-centric' && selectedSession) {
      return selectedSession.tickets.reduce((total, ticket) => {
        return total + (ticket.price * (selectedTickets[ticket.name] || 0));
      }, 0);
    }
    // For legacy events, use event tickets
    else {
      return event.tickets.reduce((total, ticket) => {
        return total + (ticket.price * (selectedTickets[ticket.name] || 0));
      }, 0);
    }
  };

  const handleBooking = async () => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }

    if (!params?.id) return;
    if (event?.architecture !== 'session-centric' || !selectedSession) {
      setError('Please select a valid session.');
      return;
    }

    try {
      setIsPaymentProcessing(true);
      setLoading(true);

      const { loadRazorpayScript } = await import('@/domains/payments/services/razorpay');
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      const totalAmount = getTotalAmount();

      // Create Razorpay Order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          receipt: `event_${params.id}_${Date.now()}`,
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
        description: 'Event Booking',
        order_id: order.id,
        prefill: {
          name: userInfo.name,
          email: userInfo.email,
          contact: userInfo.phone,
        },
        theme: { color: '#c084fc' },
        handler: async (response: any) => {
          try {
            console.log('Payment success, verifying with Postgres API...');
            
            // Map selected tickets to items array
            const items = Object.entries(selectedTickets)
              .filter(([_, quantity]) => quantity > 0)
              .map(([ticketName, quantity]) => {
                const ticketType = selectedSession.tickets.find((t: any) => t.name === ticketName);
                if (!ticketType || !ticketType.id) {
                  throw new Error(`Ticket type ${ticketName} not found`);
                }
                return { ticketTypeId: ticketType.id, quantity };
              });

            const bookingPayload = {
              userId: auth.currentUser!.uid,
              eventId: params.id as string,
              sessionId: selectedSession.id,
              contact: {
                name: userInfo.name || 'Anonymous',
                email: userInfo.email || 'no-email@zest.dev',
                phone: userInfo.phone || '0000000000',
              },
              items,
              payment: {
                method: 'RAZORPAY',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            };

            const bookingRes = await fetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bookingPayload),
            });

            const bookingResult = await bookingRes.json();

            if (!bookingRes.ok) {
              throw new Error(bookingResult.message || bookingResult.error || 'Booking failed');
            }

            console.log('Postgres booking successful:', bookingResult);
            router.push(`/booking-confirmation/${bookingResult.bookingId}`);
          } catch (error: any) {
            console.error('Booking verification failed:', error);
            setIsPaymentProcessing(false);
            setLoading(false);
            router.push(`/payment-failed?eventId=${params.id}&error=${encodeURIComponent(error.message || 'Verification failed')}`);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaymentProcessing(false);
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Error initiating booking:', err);
      setError(err.message || 'Error initiating booking. Please try again.');
      setIsPaymentProcessing(false);
      setLoading(false);
    }
  };

  // Get availability status for a ticket
  const getAvailabilityStatus = (ticket: TicketType) => {
    const percentage = (ticket.available_capacity / ticket.capacity) * 100;
    if (ticket.available_capacity === 0) {
      return { status: 'sold-out', text: 'SOLD OUT', color: '#ef4444' };
    } else if (percentage <= 10) {
      return { status: 'critical', text: 'Almost Sold Out!', color: '#f59e0b' };
    } else if (percentage <= 25) {
      return { status: 'low', text: 'Limited Availability', color: '#f59e0b' };
    } else if (percentage <= 50) {
      return { status: 'medium', text: 'Good Availability', color: '#10b981' };
    } else {
      return { status: 'high', text: 'Available', color: '#10b981' };
    }
  };

  // Manual refresh function with immediate feedback
  const handleManualRefresh = async () => {
    await fetchEvent(true);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!event) return <div className={styles.error}>Event not found</div>;

  // Get current tickets based on event type
  const currentTickets = event.architecture === 'session-centric' && selectedSession 
    ? selectedSession.tickets 
    : event.tickets;

  return (
    <div className={styles.bookingFlow}>
      {/* Payment Processing Overlay */}
      {isPaymentProcessing && (
        <div className={styles.paymentLoadingOverlay}>
          <div className={styles.paymentLoadingContent}>
            <div className={styles.paymentSpinner}></div>
            <h2>Completing Payment</h2>
            <p>Please wait while we process your payment...</p>
            <div className={styles.loadingSteps}>
              <div className={styles.loadingStep}>
                <div className={styles.stepDot}></div>
                <span>Processing payment</span>
              </div>
              <div className={styles.loadingStep}>
                <div className={styles.stepDot}></div>
                <span>Confirming booking</span>
              </div>
              <div className={styles.loadingStep}>
                <div className={styles.stepDot}></div>
                <span>Generating tickets</span>
              </div>
            </div>
            <p className={styles.paymentNote}>
              <strong>Do not close this window or refresh the page</strong>
            </p>
          </div>
        </div>
      )}

      <div className={styles.bookingContainer}>
        <h2 className={styles.mainTitle}>Select Date & Time</h2>

        {step === 1 && (
          <div className={styles.bookingStep}>
            {/* Session-Centric Event: Date and Session Selection */}
            {event.architecture === 'session-centric' ? (
              <>
                {/* Step 1a: Date Selection */}
                <DateSelector
                  availableDates={availableSessionDates.map(date => new Date(date))}
                  selectedDate={selectedSessionDate ? new Date(selectedSessionDate) : null}
                  onDateSelect={(date) => handleSessionDateSelect(date.toISOString().split('T')[0])}
                />

                {/* Step 1b: Session Selection for Selected Date */}
                {selectedSessionDate && (
                  <div className={styles.sessionSelector}>
                    <div className={styles.availableSessions}>
                      {sessionsForSelectedDate.map((session, index) => {
                        const isMultiDay = session.end_date && session.end_date !== session.date;
                        
                        return (
                          <button
                            key={session.id}
                            className={`${styles.sessionOption} ${selectedSession?.id === session.id ? styles.selected : ''}`}
                            onClick={() => handleSessionSelect(session)}
                          >
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            {isMultiDay && (
                              <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                                (Multi-day)
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}


              </>
            ) : (
              /* Legacy Event: Date & Time Selection */
              <>
                <DateSelector
                  availableDates={availableDates.map(date => new Date(date))}
                  selectedDate={selectedDate ? new Date(selectedDate) : null}
                  onDateSelect={(date) => handleDateSelect(date.toISOString().split('T')[0])}
                />

                {selectedDate && (
                  <div className={styles.timeSelector}>
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

              </>
            )}

            {((event.architecture === 'session-centric' && selectedSession) || 
              (event.architecture !== 'session-centric' && selectedTimeSlot)) && (
              <div className={styles.ticketSectionWrapper} style={{ marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px' }}>

            
            <div className={styles.ticketTypes}>
              {currentTickets.map((ticket, index) => {
                const isSoldOut = ticket.available_capacity <= 0;
                const availability = getAvailabilityStatus(ticket);
                const selectedQuantity = selectedTickets[ticket.name] || 0;
                
                return (
                  <div key={index} className={`${styles.ticketType} ${isSoldOut ? styles.soldOut : ''}`}>
                    <div className={styles.ticketDetails}>
                      <div className={styles.ticketHeader}>
                        <h3>{ticket.name}</h3>
                        <div 
                          className={styles.availabilityBadge}
                          style={{ backgroundColor: availability.color }}
                        >
                          {availability.text}
                        </div>
                      </div>
                      <p className={styles.ticketPrice}>₹{ticket.price.toLocaleString()}</p>
                      <div className={styles.availabilityInfo}>
                        <div className={styles.availabilityText}>
                          {isSoldOut ? (
                            <span className={styles.soldOutText}>
                              <FaExclamationTriangle /> SOLD OUT
                            </span>
                          ) : (
                            <span className={styles.ticketsLeft}>
                              <FaTicketAlt /> {ticket.available_capacity} of {ticket.capacity} available
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                    <div className={styles.ticketQuantity}>
                      <button
                        onClick={() => handleTicketQuantityChange(ticket, -1)}
                        className={styles.quantityButton}
                        disabled={!selectedTickets[ticket.name] || isSoldOut}
                      >
                        -
                      </button>
                      <span>{selectedTickets[ticket.name] || 0}</span>
                      <button
                        onClick={() => handleTicketQuantityChange(ticket, 1)}
                        className={styles.quantityButton}
                        disabled={
                          isSoldOut || (selectedTickets[ticket.name] || 0) >= ticket.available_capacity
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(selectedTickets).length > 0 && (
              <div className={styles.floatingContinueContainer}>
                <button
                  className={styles.floatingContinueButton}
                  onClick={() => setStep(2)}
                  disabled={getTotalTickets() === 0}
                >
                  <span>Continue</span>
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )}
    {step === 2 && (
          <div className={styles.bookingStep}>
            <h2>Booking Summary</h2>
            <div className={styles.bookingSummary}>
              <div className={styles.eventSummary}>
                <img src={event.event_image} alt={event.title} />
                <div className={styles.eventDetails}>
                  <h3>{event.title}</h3>
                  
                  {/* Updated for session-centric with multi-day support */}
                  {event.architecture === 'session-centric' && selectedSession ? (
                    <>
                      {selectedSession.end_date && selectedSession.end_date !== selectedSession.date ? (
                        <>
                          <p>
                            <FaCalendarAlt /> {formatDate(selectedSession.date)} - {formatDate(selectedSession.end_date)}
                          </p>
                          <p>
                            <FaClock /> {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                            <span className={styles.multiDayDuration}>
                              ({(() => {
                                const startDateTime = new Date(`${selectedSession.date} ${selectedSession.start_time}`);
                                const endDateTime = new Date(`${selectedSession.end_date} ${selectedSession.end_time}`);
                                const diffMs = endDateTime.getTime() - startDateTime.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                return `${diffDays} day${diffDays > 1 ? 's' : ''}${diffHours > 0 ? `, ${diffHours} hour${diffHours !== 1 ? 's' : ''}` : ''}`;
                              })()})
                            </span>
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            <FaCalendarAlt /> {formatDate(selectedSession.date)}
                          </p>
                          <p>
                            <FaClock /> {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                          </p>
                        </>
                      )}
                      <p>
                        <FaMapMarkerAlt /> {selectedSession.venue || event.event_venue}
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <FaCalendarAlt /> {selectedDate && formatDate(selectedDate)}
                      </p>
                      <p>
                        <FaClock /> {selectedTimeSlot && `${formatTime(selectedTimeSlot.start_time)} - ${formatTime(selectedTimeSlot.end_time)}`}
                      </p>
                      <p>
                        <FaMapMarkerAlt /> {event.event_venue}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.ticketInfo}>
                <h3><FaTicketAlt /> Ticket Information</h3>
                {Object.entries(selectedTickets).map(([ticketName, quantity]) => {
                  const ticket = currentTickets.find(t => t.name === ticketName);
                  return (
                    <div key={ticketName} className={styles.ticketSummary}>
                      <p>{ticketName}: {quantity} tickets</p>
                      <p>₹{(ticket?.price! * quantity).toLocaleString()}</p>
                    </div>
                  );
                })}
                <p className={styles.totalAmount}>Total Amount: ₹{getTotalAmount().toLocaleString()}</p>
              </div>
              
              <div className={styles.userInfo}>
                <h3><FaUser /> Attendee Information</h3>
                <div className={styles.userDetails}>
                  <div className={styles.userField}>
                    <label>Name:</label>
                    <input
                      type="text"
                      value={userInfo.name}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className={styles.userField}>
                    <label>Email:</label>
                    <input
                      type="email"
                      value={userInfo.email}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className={styles.userField}>
                    <label>Phone:</label>
                    <input
                      type="tel"
                      value={userInfo.phone}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                </div>
                {(!userInfo.name || !userInfo.email || !userInfo.phone) && (
                  <div className={styles.missingInfoWarning}>
                    <FaExclamationTriangle />
                    Please fill in all required fields before proceeding with payment.
                  </div>
                )}
              </div>
            </div>

            <button
              className={styles.bookButton}
              onClick={handleBooking}
              disabled={loading || isPaymentProcessing || !userInfo.name || !userInfo.email || !userInfo.phone}
            >
              {isPaymentProcessing ? (
                <>
                  <div className={styles.buttonSpinner}></div>
                  <span>Initiating Payment...</span>
                </>
              ) : loading ? (
                'Loading...'
              ) : !userInfo.name || !userInfo.email || !userInfo.phone ? (
                'Please Complete All Fields'
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