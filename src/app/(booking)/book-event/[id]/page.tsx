'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/infrastructure/firebase';
import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaTicketAlt, FaUser, FaChevronRight, FaCreditCard, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import styles from './BookingFlow.module.css';
import { initiateRazorpayPayment, BookingData } from '@/domains/payments/services/razorpay';
import { DateSelector } from '@/components/ui';

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  session_id?: string;
}

interface TicketType {
  name: string;
  price: number;
  capacity: number;
  available_capacity: number; // This will be calculated dynamically
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

  // Calculate real-time availability like the dashboard does - UPDATED for session-centric
  const calculateRealTimeAvailability = (eventData: EventData, attendeesList: Attendee[]): TicketType[] => {
    // Handle session-centric events
    if (eventData.architecture === 'session-centric' && selectedSession) {
      return selectedSession.tickets.map(ticket => {
        // Count actual sold tickets from attendees for this specific session
        const soldCount = attendeesList.reduce((count, attendee) => {
          // Handle new individual attendee records
          if (attendee.canCheckInIndependently && 
              attendee.ticketType === ticket.name && 
              attendee.sessionId === selectedSession.id) {
            return count + 1;
          }
          // Handle old group booking records for this session
          if (typeof attendee.tickets === 'object' && 
              attendee.selectedSession?.id === selectedSession.id) {
            return count + (attendee.tickets[ticket.name] || 0);
          }
          return count;
        }, 0);
        
        return {
          name: ticket.name,
          price: ticket.price,
          capacity: ticket.capacity,
          available_capacity: Math.max(0, ticket.capacity - soldCount)
        };
      });
    }
    // Handle legacy events
    else {
      return eventData.tickets.map(ticket => {
        // Count actual sold tickets from attendees - now supports individual attendee records
        const soldCount = attendeesList.reduce((count, attendee) => {
          // Handle new individual attendee records
          if (attendee.canCheckInIndependently && attendee.ticketType === ticket.name) {
            return count + 1;
          }
          // Handle old group booking records
          if (typeof attendee.tickets === 'object') {
            return count + (attendee.tickets[ticket.name] || 0);
          }
          return count;
        }, 0);
        
        return {
          ...ticket,
          available_capacity: Math.max(0, ticket.capacity - soldCount)
        };
      });
    }
  };

  // Fetch attendees for real-time availability calculation
  const fetchAttendees = async () => {
    if (!params?.id) return [];

    try {
      const attendeesRef = collection(db(), 'eventAttendees');
      const attendeesQuery = query(
        attendeesRef,
        where('eventId', '==', params.id)
      );

      const snapshot = await getDocs(attendeesQuery);
      const attendeesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendee[];
      
      return attendeesList;
    } catch (err) {
      console.error("Error fetching attendees:", err);
      return [];
    }
  };

  // Fetch event details with real-time updates - UPDATED for session-centric
  const fetchEvent = async (showRefreshIndicator = false) => {
    if (!params?.id) return;

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch event data and attendees in parallel
      const [eventDoc, attendeesList] = await Promise.all([
        getDoc(doc(db(), 'events', params.id)),
        fetchAttendees()
      ]);
      
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        const baseEventData: EventData = {
          id: eventDoc.id,
          title: data.title || data.eventTitle || '',
          event_image: data.event_image || data.eventImage || '',
          event_venue: data.event_venue || data.eventVenue || '',
          architecture: data.architecture || 'legacy',
          
          // Legacy fields
          time_slots: data.time_slots || [],
          tickets: data.tickets || [],
          
          // Session-centric fields
          sessions: data.sessions || [],
          venue_type: data.venue_type || 'global',
          total_sessions: data.total_sessions || 0,
          total_capacity: data.total_capacity || 0,
        };

        setEvent(baseEventData);
        setAttendees(attendeesList);
        setLastRefresh(new Date());
        
        // Handle session-centric events
        if (baseEventData.architecture === 'session-centric' && baseEventData.sessions) {
          // Calculate real-time availability for each session
          const sessionsWithAvailability = baseEventData.sessions.map(session => ({
            ...session,
            tickets: session.tickets.map(ticket => {
              const soldCount = attendeesList.reduce((count, attendee) => {
                if (attendee.canCheckInIndependently && 
                    attendee.ticketType === ticket.name && 
                    attendee.sessionId === session.id) {
                  return count + 1;
                }
                if (typeof attendee.tickets === 'object' && 
                    attendee.selectedSession?.id === session.id) {
                  return count + (attendee.tickets[ticket.name] || 0);
                }
                return count;
              }, 0);
              
              return {
                ...ticket,
                available_capacity: Math.max(0, ticket.capacity - soldCount)
              };
            })
          }));
          
          setAvailableSessions(sessionsWithAvailability);
          
          // Extract unique dates from sessions
          const uniqueDates = Array.from(new Set(sessionsWithAvailability.map(session => session.date))).sort();
          setAvailableSessionDates(uniqueDates);
          
          // If only one date, auto-select it and show sessions
          if (uniqueDates.length === 1) {
            setSelectedSessionDate(uniqueDates[0]);
            const sessionsForDate = sessionsWithAvailability.filter(session => session.date === uniqueDates[0]);
            setSessionsForSelectedDate(sessionsForDate);
            
            // If only one session on that date, auto-select it
            if (sessionsForDate.length === 1) {
              setSelectedSession(sessionsForDate[0]);
            }
          }
        }
        // Handle legacy events
        else {
          // Calculate real-time availability
          const ticketsWithRealAvailability = calculateRealTimeAvailability(baseEventData, attendeesList);
          
          const eventData: EventData = {
            ...baseEventData,
            tickets: ticketsWithRealAvailability
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
        }

        console.log('Real-time availability calculated for', baseEventData.architecture, 'event:', {
          totalAttendees: attendeesList.length,
          sessions: baseEventData.sessions?.length || 0,
          ticketAvailability: baseEventData.architecture === 'session-centric' ? 
            'per-session' : 
            baseEventData.tickets?.map(t => ({
              name: t.name,
              capacity: t.capacity,
              available: t.available_capacity,
              sold: t.capacity - t.available_capacity
            }))
        });
      } else {
        setError('Event not found');
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
          const userDoc = await getDoc(doc(db(), "Users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
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
          // Fallback to auth data if Firestore fails
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
    if (selectedSession && event && attendees) {
      // Recalculate tickets for the selected session
      const updatedTickets = calculateRealTimeAvailability(event, attendees);
      // Update the event state with new ticket availability
      setEvent(prev => prev ? { ...prev, tickets: updatedTickets } : null);
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

    try {
      setIsPaymentProcessing(true);
      setLoading(true);

      // Prepare booking data - UPDATED for session-centric
      const bookingData: BookingData = {
        eventId: params.id,
        userId: auth.currentUser.uid,
        name: userInfo.name,
        email: userInfo.email,
        phone: userInfo.phone,
        selectedDate: event?.architecture === 'session-centric' ? selectedSession?.date! : selectedDate!,
        selectedTimeSlot: event?.architecture === 'session-centric' ? {
          date: selectedSession?.date!,
          start_time: selectedSession?.start_time!,
          end_time: selectedSession?.end_time!,
          available: true,
          session_id: selectedSession?.id
        } : selectedTimeSlot,
        selectedSession: selectedSession, // NEW: Include session for session-centric events
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
            sessionId: selectedSession?.id || 'legacy',
          },
        },
        bookingData,
        'event',
        (bookingId: string) => {
          // Payment successful - keep loading state while navigating
          console.log('Payment successful, redirecting to confirmation...');
          router.push(`/booking-confirmation/${bookingId}`);
          // Don't reset loading state here - let the confirmation page handle it
        },
        (error: string) => {
          // Payment failed or cancelled
          console.error('Payment failed:', error);
          setIsPaymentProcessing(false);
          setLoading(false);
          // Redirect to payment failed page with error details
          router.push(`/payment-failed?eventId=${params.id}&error=${encodeURIComponent(error)}`);
        }
      );

    } catch (err) {
      console.error('Error initiating booking:', err);
      setError('Error initiating booking. Please try again.');
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
        <div className={styles.bookingProgress}>
          <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>
            <FaCalendarAlt />
            <span>{event.architecture === 'session-centric' ? 'Session' : 'Date & Time'}</span>
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

                <button
                  className={styles.nextButton}
                  onClick={() => setStep(2)}
                  disabled={!selectedSession}
                >
                  <span>Continue to Tickets</span>
                  <FaChevronRight />
                </button>
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

                <button
                  className={styles.nextButton}
                  onClick={() => setStep(2)}
                  disabled={!selectedTimeSlot}
                >
                  <span>Continue to Tickets</span>
                  <FaChevronRight />
                </button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className={styles.bookingStep}>
            <div className={styles.stepHeader}>
              <h2>Select Tickets</h2>
              {event.architecture === 'session-centric' && selectedSession && (
                <div className={styles.selectedSessionInfo}>
                  <span>For: {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</span>
                  <span>{formatDate(selectedSession.date)}</span>
                </div>
              )}
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
                        {!isSoldOut && (
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill}
                              style={{ 
                                width: `${((ticket.capacity - ticket.available_capacity) / ticket.capacity) * 100}%`,
                                backgroundColor: availability.color
                              }}
                            />
                          </div>
                        )}
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
              <div className={styles.selectionSummary}>
                <h4>Selected Tickets</h4>
                <div className={styles.selectedTicketsList}>
                  {Object.entries(selectedTickets).map(([ticketName, quantity]) => {
                    const ticket = currentTickets.find(t => t.name === ticketName);
                    return (
                      <div key={ticketName} className={styles.selectedTicketItem}>
                        <span>{ticketName} × {quantity}</span>
                        <span>₹{((ticket?.price || 0) * quantity).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.totalSelected}>
                  <strong>Total: ₹{getTotalAmount().toLocaleString()}</strong>
                </div>
              </div>
            )}

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