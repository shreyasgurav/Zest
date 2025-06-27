'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaTicketAlt, FaUser, FaChevronRight, FaCreditCard, FaExclamationTriangle, FaSync, FaStar, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import styles from './BookingFlow.module.css';
import { initiateRazorpayPayment, BookingData } from '@/utils/razorpay';

// 🚀 NEW ARCHITECTURE: Updated interfaces for new event structure
interface NewEventSession {
  sessionId: string;
  title: string;
  start_time: string;  // ISO string
  end_time: string;    // ISO string
  tickets: Array<{
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
}

interface EventData {
  id: string;
  title: string;
  about_event: string;
  event_type: string;
  event_venue: string;
  event_image?: string;
  event_categories: string[];
  event_languages: string;
  event_guides: Record<string, string>;
  
  // 🎯 NEW: Clean sessions structure
  sessions: NewEventSession[];
  
  // Creator and organization info
  creator: {
    type: string;
    pageId: string;
    name: string;
    username: string;
    userId: string;
  };
  organizationId: string;
  hosting_club: string;
  organization_username: string;
  status: string;
  createdAt: any;
  updatedAt: any;
  image_upload_status: string;
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
  selectedTimeSlot?: any;
  createdAt: string;
  status?: string;
  paymentStatus?: string;
  ticketType?: string;
  canCheckInIndependently?: boolean;
  sessionId?: string;
  individualAmount?: number;
}

function BookingFlow() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState<EventData | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  
  // 🚀 NEW: Date-first selection flow
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [sessionsForDate, setSessionsForDate] = useState<NewEventSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<NewEventSession | null>(null);
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
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 NEW: Calculate real-time availability for sessions
  const calculateSessionAvailability = (eventData: EventData, attendeesList: Attendee[]): NewEventSession[] => {
    return eventData.sessions.map(session => {
      // Calculate tickets with real availability for this session
      const ticketsWithAvailability = session.tickets.map(ticket => {
        const soldCount = attendeesList.filter(attendee => 
          attendee.sessionId === session.sessionId && 
          attendee.ticketType === ticket.name
        ).length;

        return {
          ...ticket,
          available_capacity: Math.max(0, ticket.capacity - soldCount)
        };
      });

      return {
        ...session,
        tickets: ticketsWithAvailability
      };
    });
  };

  // 🚀 NEW: Extract unique dates from sessions
  const extractAvailableDates = (sessions: NewEventSession[]): string[] => {
    const dates = sessions.map(session => {
      const date = new Date(session.start_time);
      return date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    });
    
    // Remove duplicates and sort
    const uniqueDates = Array.from(new Set(dates)).sort();
    return uniqueDates;
  };

  // 🚀 NEW: Get sessions for a specific date
  const getSessionsForDate = (sessions: NewEventSession[], dateString: string): NewEventSession[] => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
      return sessionDate === dateString;
    }).sort((a, b) => {
      // Sort by start time
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
  };

  // Fetch attendees for real-time availability calculation
  const fetchAttendees = async () => {
    if (!params?.id) return [];

    try {
      const attendeesRef = collection(db, 'eventAttendees');
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

  // 🚀 NEW: Fetch event details with new architecture
  const fetchEvent = async (showRefreshIndicator = false) => {
    if (!params?.id) return;

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [eventDoc, attendeesList] = await Promise.all([
        getDoc(doc(db, 'events', params.id)),
        fetchAttendees()
      ]);
      
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        
        console.log('🔍 Fetched event data:', {
          title: data.title,
          hasSessions: !!data.sessions,
          sessionsCount: data.sessions?.length || 0,
          firstSession: data.sessions?.[0]
        });
        
        const eventData: EventData = {
          id: eventDoc.id,
          title: data.title || '',
          about_event: data.about_event || '',
          event_type: data.event_type || 'event',
          event_venue: data.event_venue || '',
          event_image: data.event_image || '',
          event_categories: data.event_categories || [],
          event_languages: data.event_languages || '',
          event_guides: data.event_guides || {},
          sessions: data.sessions || [],
          creator: data.creator || {},
          organizationId: data.organizationId || '',
          hosting_club: data.hosting_club || '',
          organization_username: data.organization_username || '',
          status: data.status || 'active',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          image_upload_status: data.image_upload_status || 'none'
        };

        // 🎯 Calculate real-time availability
        const sessionsWithAvailability = calculateSessionAvailability(eventData, attendeesList);
        eventData.sessions = sessionsWithAvailability;

        setEvent(eventData);
        setAttendees(attendeesList);
        setLastRefresh(new Date());
        
        // 🚀 Extract available dates from sessions
        const dates = extractAvailableDates(sessionsWithAvailability);
        setAvailableDates(dates);
        
        // Auto-select first available date if only one date
        if (dates.length === 1 && !selectedDate) {
          setSelectedDate(dates[0]);
          const sessionsForFirstDate = getSessionsForDate(sessionsWithAvailability, dates[0]);
          setSessionsForDate(sessionsForFirstDate);
        }

        console.log('✅ Event loaded:', {
          sessionsCount: sessionsWithAvailability.length,
          datesCount: dates.length,
          attendeesCount: attendeesList.length
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

  // Set up automatic refresh interval
  useEffect(() => {
    if (step === 2 || step === 3) {
      refreshIntervalRef.current = setInterval(() => {
        fetchEvent(true);
      }, 15000);

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
          const userDoc = await getDoc(doc(db, "Users", auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserInfo({
              name: userData.name || '',
              email: userData.email || userData.contactEmail || auth.currentUser.email || '',
              phone: userData.phone || ''
            });
          } else {
            setUserInfo({
              name: '',
              email: auth.currentUser.email || '',
              phone: ''
            });
          }
        } catch (err) {
          console.error('Error fetching user details:', err);
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

  // 🚀 NEW: Update sessions when date changes
  useEffect(() => {
    if (selectedDate && event) {
      const sessionsForSelectedDate = getSessionsForDate(event.sessions, selectedDate);
      setSessionsForDate(sessionsForSelectedDate);
      
      // Reset session and ticket selection when date changes
      setSelectedSession(null);
      setSelectedTickets({});
      
      console.log('📅 Date changed:', selectedDate, 'Sessions:', sessionsForSelectedDate.length);
    }
  }, [selectedDate, event]);

  // 🎯 Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateForDisplay = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // 🚀 NEW: Handlers for new flow
  const handleDateSelect = (date: string) => {
    console.log('📅 Date selected:', date);
    setSelectedDate(date);
  };

  const handleSessionSelect = (session: NewEventSession) => {
    console.log('🎯 Session selected:', session.title, session.sessionId);
    setSelectedSession(session);
    setSelectedTickets({});
  };

  const handleTicketQuantityChange = (ticketName: string, change: number) => {
    if (!selectedSession) return;
    
    const ticket = selectedSession.tickets.find(t => t.name === ticketName);
    if (!ticket) return;
    
    setSelectedTickets(prev => {
      const currentQuantity = prev[ticketName] || 0;
      const newQuantity = Math.max(0, currentQuantity + change);
      
      if (newQuantity === 0) {
        const { [ticketName]: _, ...rest } = prev;
        return rest;
      }
      
      const maxAllowed = Math.min(newQuantity, ticket.available_capacity);
      
      return {
        ...prev,
        [ticketName]: maxAllowed
      };
    });
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, quantity) => sum + quantity, 0);
  };

  const getTotalAmount = () => {
    if (!selectedSession) return 0;
    
    return selectedSession.tickets.reduce((total, ticket) => {
      return total + (ticket.price * (selectedTickets[ticket.name] || 0));
    }, 0);
  };

  // 🚀 NEW: Updated booking handler for new architecture
  const handleBooking = async () => {
    if (!auth.currentUser) {
      router.push('/login');
      return;
    }

    if (!params?.id || !selectedSession) return;

    try {
      setLoading(true);

      // 🎯 NEW: Use new booking flow with session architecture
      const response = await fetch('/api/book-event-new-architecture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: params.id,
          sessionId: selectedSession.sessionId,
          userId: auth.currentUser.uid,
          userInfo,
          selectedTickets,
          totalAmount: getTotalAmount()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Initiate Razorpay payment
        await initiateRazorpayPayment(
          {
            amount: getTotalAmount(),
            currency: 'INR',
            receipt: `event_${params.id}_${Date.now()}`,
            notes: {
              eventId: params.id,
              sessionId: selectedSession.sessionId,
              userId: auth.currentUser.uid
            },
          },
          {
            eventId: params.id,
            userId: auth.currentUser.uid,
            name: userInfo.name,
            email: userInfo.email,
            phone: userInfo.phone,
            selectedDate: selectedDate!,
            tickets: selectedTickets,
            totalAmount: getTotalAmount(),
            sessionId: selectedSession.sessionId
          } as BookingData,
          'event',
          (bookingId: string) => {
            router.push(`/booking-confirmation/${bookingId}`);
          },
          (error: string) => {
            console.error('Payment failed:', error);
            setLoading(false);
            router.push(`/payment-failed?eventId=${params.id}&error=${encodeURIComponent(error)}`);
          }
        );
      } else {
        throw new Error(result.error || 'Booking failed');
      }

    } catch (err) {
      console.error('Error initiating booking:', err);
      setError('Error initiating booking. Please try again.');
      setLoading(false);
    }
  };

  // Get availability status for a ticket
  const getAvailabilityStatus = (ticket: { available_capacity: number; capacity: number }) => {
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

  const handleManualRefresh = async () => {
    await fetchEvent(true);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!event) return <div className={styles.error}>Event not found</div>;

  return (
    <div className={styles.bookingFlow}>
      <div className={styles.bookingContainer}>
        {/* 🚀 NEW: Updated Progress Steps */}
        <div className={`${styles.bookingProgress} ${step === 2 ? styles.step2 : ''} ${step === 3 ? styles.step3 : ''}`}>
          <div className={styles.stepWrapper}>
            <div className={styles.stepItem}>
              <div className={`${styles.progressStep} ${step >= 1 ? styles.active : ''}`}>
                <FaCalendarAlt />
                <span>Date & Session</span>
              </div>
            </div>
            <div className={styles.stepConnector}></div>
          </div>
          
          <div className={styles.stepWrapper}>
            <div className={styles.stepItem}>
              <div className={`${styles.progressStep} ${step >= 2 ? styles.active : ''}`}>
                <FaTicketAlt />
                <span>Select Tickets</span>
              </div>
            </div>
            <div className={styles.stepConnector}></div>
          </div>
          
          <div className={styles.stepWrapper}>
            <div className={styles.stepItem}>
              <div className={`${styles.progressStep} ${step >= 3 ? styles.active : ''}`}>
                <FaUser />
                <span>Review & Pay</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🚀 STEP 1: Combined Date & Session Selection */}
        {step === 1 && (
          <div className={styles.bookingStep}>
            <h2>Select Date & Session</h2>
            <p className={styles.stepDescription}>
              Choose your preferred date and session for this event.
            </p>
            
            {/* Date Selection */}
            <div className={styles.dateSelector}>
              <h4><FaCalendarAlt /> Available Dates</h4>
              <div className={styles.calendarContainer}>
                <div className={styles.datesList}>
                  {availableDates.map((date, index) => {
                    const dateObj = new Date(date);
                    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                    
                    const dateNumber = dateObj.getDate();
                    const dayName = dayNames[dateObj.getDay()];
                    const monthName = monthNames[dateObj.getMonth()];
                    
                    // Show month label for first date or when month changes
                    const prevDate = index > 0 ? new Date(availableDates[index - 1]) : null;
                    const showMonthLabel = index === 0 || (prevDate && prevDate.getMonth() !== dateObj.getMonth());
                    
                    const isToday = dateObj.toDateString() === new Date().toDateString();
                    const isPast = dateObj < new Date();
                    
                    return (
                      <div key={date} className={styles.dateItem}>
                        {showMonthLabel && (
                          <div className={styles.monthLabel}>{monthName}</div>
                        )}
                        <div
                          className={`${styles.dateCard} ${selectedDate === date ? styles.selected : ''} ${isPast ? styles.disabled : ''}`}
                          onClick={() => !isPast && handleDateSelect(date)}
                        >
                          <div className={styles.dateNumber}>{dateNumber}</div>
                          <div className={styles.dayName}>
                            {dayName}
                            {isToday && <span className={styles.todayBadge}>Today</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Session Selection - Only show when date is selected */}
            {selectedDate && (
              <div className={styles.timeSelector}>
                <h4><FaClock /> Available Sessions for {formatDate(selectedDate)}</h4>
                <div className={styles.sessionsGrid}>
                  {sessionsForDate.map((session) => {
                    const sessionDate = new Date(session.start_time);
                    const isToday = sessionDate.toDateString() === new Date().toDateString();
                    const isPast = sessionDate < new Date();
                    const sessionCapacity = session.tickets.reduce((sum, ticket) => sum + ticket.capacity, 0);
                    const sessionAvailable = session.tickets.reduce((sum, ticket) => sum + ticket.available_capacity, 0);
                    const sessionSold = sessionCapacity - sessionAvailable;
                    const availabilityPercentage = (sessionAvailable / sessionCapacity) * 100;
                    
                    return (
                      <div 
                        key={session.sessionId} 
                        className={`${styles.sessionCard} ${selectedSession?.sessionId === session.sessionId ? styles.selected : ''} ${isPast ? styles.disabled : ''}`}
                        onClick={() => !isPast && handleSessionSelect(session)}
                      >
                        <div className={styles.sessionHeader}>
                          <div className={styles.sessionInfo}>
                            <h3>{session.title}</h3>
                            <p className={styles.sessionTime}>
                              <FaClock /> {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </p>
                            <p className={styles.sessionVenue}>
                              <FaMapMarkerAlt /> {event.event_venue}
                            </p>
                            {isPast && <span className={styles.pastBadge}>Past</span>}
                            {isToday && <span className={styles.todayBadge}>Today</span>}
                          </div>
                          
                          <div className={styles.sessionStats}>
                            <div className={styles.statItem}>
                              <FaUsers />
                              <span>{sessionSold}/{sessionCapacity}</span>
                            </div>
                            <div className={styles.statItem}>
                              <FaMoneyBillWave />
                              <span>₹{session.tickets[0]?.price || 0}+</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.sessionProgress}>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill}
                              style={{ 
                                width: `${100 - availabilityPercentage}%`,
                                backgroundColor: availabilityPercentage > 50 ? '#10b981' : availabilityPercentage > 25 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span className={styles.availabilityText}>
                            {Math.round(availabilityPercentage)}% available
                          </span>
                        </div>
                        
                        <div className={styles.sessionTickets}>
                          <h5>Tickets Available:</h5>
                          <div className={styles.ticketsList}>
                            {session.tickets.map((ticket, index) => (
                              <div key={index} className={styles.ticketItem}>
                                <span className={styles.ticketName}>{ticket.name}</span>
                                <span className={styles.ticketPrice}>₹{ticket.price}</span>
                                <span className={styles.ticketAvailability}>
                                  {ticket.available_capacity}/{ticket.capacity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
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
          </div>
        )}

        {/* 🚀 STEP 2: Ticket Selection */}
        {step === 2 && selectedSession && (
          <div className={styles.bookingStep}>
            <div className={styles.stepHeader}>
              <h2>Select Tickets</h2>
              <div className={styles.selectedSessionInfo}>
                <h4>{selectedSession.title}</h4>
                <p>{selectedDate && formatDate(selectedDate)} • {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</p>
              </div>
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
              {selectedSession.tickets.map((ticket, index) => {
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
                        onClick={() => handleTicketQuantityChange(ticket.name, -1)}
                        className={styles.quantityButton}
                        disabled={!selectedQuantity || isSoldOut}
                      >
                        -
                      </button>
                      <span>{selectedQuantity}</span>
                      <button
                        onClick={() => handleTicketQuantityChange(ticket.name, 1)}
                        className={styles.quantityButton}
                        disabled={isSoldOut || selectedQuantity >= ticket.available_capacity}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {getTotalTickets() > 0 && (
              <div className={styles.selectionSummary}>
                <h4>Selected Tickets</h4>
                <div className={styles.selectedTicketsList}>
                  {Object.entries(selectedTickets).map(([ticketName, quantity]) => {
                    const ticket = selectedSession.tickets.find(t => t.name === ticketName);
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

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button
                className={styles.backButton}
                onClick={() => setStep(1)}
              >
                <span>Back to Date & Session</span>
              </button>
              <button
                className={styles.nextButton}
                onClick={() => setStep(3)}
                disabled={getTotalTickets() === 0}
              >
                <span>Continue to Review</span>
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}

        {/* 🚀 STEP 3: Booking Summary & Payment */}
        {step === 3 && selectedSession && (
          <div className={styles.bookingStep}>
            <h2>Booking Summary</h2>
            <div className={styles.bookingSummary}>
              <div className={styles.eventSummary}>
                {event.event_image && <img src={event.event_image} alt={event.title} />}
                <div className={styles.eventDetails}>
                  <h3>{event.title}</h3>
                  <p><FaStar /> {selectedSession.title}</p>
                  <p><FaCalendarAlt /> {selectedDate && formatDate(selectedDate)}</p>
                  <p><FaClock /> {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</p>
                  <p><FaMapMarkerAlt /> {event.event_venue}</p>
                </div>
              </div>

              <div className={styles.ticketInfo}>
                <h3><FaTicketAlt /> Ticket Information</h3>
                {Object.entries(selectedTickets).map(([ticketName, quantity]) => {
                  const ticket = selectedSession.tickets.find(t => t.name === ticketName);
                  return (
                    <div key={ticketName} className={styles.ticketSummary}>
                      <p>{ticketName}: {quantity} tickets</p>
                      <p>₹{((ticket?.price || 0) * quantity).toLocaleString()}</p>
                    </div>
                  );
                })}
                <div className={styles.totalAmount}>
                  <h3>Total Amount: ₹{getTotalAmount().toLocaleString()}</h3>
                </div>
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

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button
                className={styles.backButton}
                onClick={() => setStep(2)}
              >
                <span>Back to Tickets</span>
              </button>
              <button
                className={styles.nextButton}
                onClick={handleBooking}
                disabled={loading || !userInfo.name || !userInfo.email || !userInfo.phone}
              >
                {loading ? (
                  'Processing Payment...'
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
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

export default BookingFlow; 