'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import { FaTicketAlt, FaQrcode, FaTimes, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaUser, FaRupeeSign } from 'react-icons/fa';
import TicketCard from '@/domains/tickets/components/TicketCard/TicketCard';
import { getTicketDisplayStatus } from '@/domains/tickets/services/ticketValidator';
import { getFirebaseAuth } from '@/infrastructure/firebase';
import styles from './Tickets.module.css';

interface Ticket {
  id: string;
  ticketNumber: string;
  qrCode: string;
  type: 'event' | 'activity';
  eventId?: string;
  activityId?: string;
  title: string;
  venue: string;
  selectedDate: string;
  selectedTimeSlot: {
    start_time: string;
    end_time: string;
  };
  ticketType?: string;
  status: 'active' | 'used' | 'cancelled';
  userName: string;
  amount: number;
  createdAt: string;
  usedAt?: string;
}

const TicketsPage = () => {
  const router = useRouter();
  const auth = getFirebaseAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', {
        userExists: !!user,
        userId: user?.uid,
        email: user?.email,
        timestamp: new Date().toISOString()
      });
      
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }
      
      console.log('User authenticated, fetching tickets for userId:', user.uid);
      fetchTickets(user.uid);
    });

    // Refresh tickets when page becomes visible (after scanning)
    const handleVisibilityChange = () => {
      if (!document.hidden && auth.currentUser) {
        console.log('Page became visible, refreshing tickets');
        fetchTickets(auth.currentUser.uid);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [auth, router]);

  const fetchTickets = async (userId: string, retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching tickets for userId: ${userId.substring(0, 8)}... (attempt ${retryCount + 1})`);
      console.log('API URL:', `/api/tickets?userId=${userId}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`/api/tickets?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('API Response status:', response.status);
      console.log('API Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('API Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        // Try to get error details from response
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('Failed to parse error response as JSON:', parseError);
          errorData = { error: 'Server error', details: errorText };
        }
        
        // Handle specific error types
        if (response.status === 500 && retryCount < maxRetries) {
          console.log(`500 error detected, retrying in ${(retryCount + 1) * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
          return fetchTickets(userId, retryCount + 1);
        }
        
        if (response.status === 503 || response.status === 504) {
          if (retryCount < maxRetries) {
            console.log(`Service unavailable/timeout, retrying in ${(retryCount + 1) * 3} seconds...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 3000));
            return fetchTickets(userId, retryCount + 1);
          }
        }
        
        setError(`Failed to load tickets (${response.status}): ${errorData.error || 'Unknown error'}`);
        setDebugInfo({
          status: response.status,
          statusText: response.statusText,
          errorData,
          userId: userId.substring(0, 8) + '...',
          timestamp: new Date().toISOString(),
          retryCount,
          userAgent: navigator.userAgent
        });
        return;
      }
      
      const data = await response.json();
      console.log('API Response data:', data);

      if (data.success) {
        console.log(`Successfully loaded ${data.tickets.length} tickets`);
        
        // Sort tickets: upcoming active tickets first, then by date
        const sortedTickets = data.tickets.sort((a: Ticket, b: Ticket) => {
          const now = new Date();
          const dateA = new Date(a.selectedDate);
          const dateB = new Date(b.selectedDate);
          
          // Active upcoming tickets first
          if (a.status === 'active' && dateA >= now && (b.status !== 'active' || dateB < now)) {
            return -1;
          }
          if (b.status === 'active' && dateB >= now && (a.status !== 'active' || dateA < now)) {
            return 1;
          }
          
          // Then sort by date descending
          return dateB.getTime() - dateA.getTime();
        });
        
        setTickets(sortedTickets);
        setDebugInfo(data.debug || null);
      } else {
        console.error('API returned success=false:', data);
        setError(data.error || 'Failed to fetch tickets');
        setDebugInfo(data.debug || null);
      }
    } catch (err) {
      console.error('Network error fetching tickets:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace',
        type: typeof err,
        userId: userId.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
        isAbortError: err instanceof Error && err.name === 'AbortError',
        retryCount
      });
      
      // Handle network errors with retry
      if (err instanceof Error && err.name === 'AbortError') {
        if (retryCount < maxRetries) {
          console.log(`Request timeout, retrying in ${(retryCount + 1) * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
          return fetchTickets(userId, retryCount + 1);
        }
        setError('Request timeout. Please check your internet connection and try again.');
      } else if (retryCount < maxRetries) {
        console.log(`Network error, retrying in ${(retryCount + 1) * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
        return fetchTickets(userId, retryCount + 1);
      } else {
        setError(`Network error: ${err instanceof Error ? err.message : 'Failed to fetch tickets'}`);
      }
      
      setDebugInfo({
        error: 'Network error',
        details: err instanceof Error ? err.message : String(err),
        userId: userId.substring(0, 8) + '...',
        timestamp: new Date().toISOString(),
        retryCount,
        finalAttempt: retryCount >= maxRetries
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'used': return '#6B7280';
      case 'expired': return '#EF4444';
      case 'cancelled': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getTicketStatus = (ticket: Ticket) => {
    return getTicketDisplayStatus(ticket);
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  if (loading) {
    return (
      <div className={styles.ticketsPage}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading your tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.ticketsPage}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>❌</div>
          <h2>Error Loading Tickets</h2>
          <p>{error}</p>
          {debugInfo && process.env.NODE_ENV === 'development' && (
            <div className={styles.debugInfo}>
              <h4>Debug Information:</h4>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
          <button 
            className={styles.retryButton}
            onClick={() => auth.currentUser && fetchTickets(auth.currentUser.uid)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.ticketsPage}>
      {/* Simple Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <FaTicketAlt className={styles.titleIcon} />
          <div>
            <h1>My Tickets</h1>
            <p className={styles.subtitle}>
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
            </p>
          </div>
        </div>
      </div>

      {/* Tickets Display */}
      <div className={styles.ticketsContainer}>
        {tickets.length === 0 ? (
          <div className={styles.emptyState}>
            <FaTicketAlt className={styles.emptyIcon} />
            <h3>No Tickets Yet</h3>
            <p>You haven't booked any events or activities yet.</p>
            <div className={styles.emptyActions}>
              <button 
                className={styles.browseButton}
                onClick={() => router.push('/events')}
              >
                Browse Events
              </button>
              <button 
                className={styles.browseButton}
                onClick={() => router.push('/activities')}
              >
                Browse Activities
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.ticketsList}>
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full Ticket Modal */}
      {selectedTicket && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTicket(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeButton}
              onClick={() => setSelectedTicket(null)}
            >
              <FaTimes />
            </button>

            <div className={styles.fullTicket}>
              {/* Ticket Header */}
              <div className={styles.fullTicketHeader}>
                <div className={styles.fullTicketTitle}>
                  <h2>{selectedTicket.title}</h2>
                  <span className={styles.fullTicketType}>
                    {selectedTicket.type.toUpperCase()}
                  </span>
                </div>
                <div 
                  className={styles.fullTicketStatus}
                  style={{ backgroundColor: getStatusColor(getTicketStatus(selectedTicket).status) }}
                >
                  {getTicketStatus(selectedTicket).displayText.toUpperCase()}
                </div>
              </div>

              {/* QR Code Section */}
              <div className={styles.qrSection}>
                <div className={styles.qrCodeContainer}>
                  <QRCodeSVG
                    value={selectedTicket.qrCode}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                    includeMargin={true}
                    className={styles.qrCode}
                  />
                </div>
                <p className={styles.qrInstructions}>
                  Show this QR code at the venue entrance
                </p>
              </div>

              {/* Ticket Details */}
              <div className={styles.ticketDetails}>
                <div className={styles.detailRow}>
                  <FaUser className={styles.detailIcon} />
                  <div>
                    <span className={styles.detailLabel}>Name</span>
                    <span className={styles.detailValue}>{selectedTicket.userName}</span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <FaCalendarAlt className={styles.detailIcon} />
                  <div>
                    <span className={styles.detailLabel}>Date</span>
                    <span className={styles.detailValue}>{formatDate(selectedTicket.selectedDate)}</span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <FaClock className={styles.detailIcon} />
                  <div>
                    <span className={styles.detailLabel}>Time</span>
                    <span className={styles.detailValue}>
                      {formatTime(selectedTicket.selectedTimeSlot.start_time)} - {formatTime(selectedTicket.selectedTimeSlot.end_time)}
                    </span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <FaMapMarkerAlt className={styles.detailIcon} />
                  <div>
                    <span className={styles.detailLabel}>Venue</span>
                    <span className={styles.detailValue}>{selectedTicket.venue}</span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <FaRupeeSign className={styles.detailIcon} />
                  <div>
                    <span className={styles.detailLabel}>Amount Paid</span>
                    <span className={styles.detailValue}>₹{selectedTicket.amount}</span>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <FaTicketAlt className={styles.detailIcon} />
                  <div>
                    <span className={styles.detailLabel}>Ticket Number</span>
                    <span className={styles.detailValue}>{selectedTicket.ticketNumber}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                className={styles.viewEventButton}
                onClick={() => {
                  setSelectedTicket(null);
                  if (selectedTicket.type === 'event') {
                    router.push(`/event-profile/${selectedTicket.eventId}`);
                  } else {
                    router.push(`/activity-profile/${selectedTicket.activityId}`);
                  }
                }}
              >
                View {selectedTicket.type === 'event' ? 'Event' : 'Activity'} Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage; 