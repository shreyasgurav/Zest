'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { 
  FaQrcode, 
  FaArrowLeft, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaUsers, 
  FaClock, 
  FaCamera,
  FaSearch,
  FaUndo,
  FaExclamationTriangle
} from 'react-icons/fa';
import styles from './CheckinPage.module.css';

interface AttendeeData {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  checkedIn: boolean;
  checkInTime?: string;
  checkedInBy?: string;
  checkInMethod?: string;
  sessionId?: string;
  selectedDate?: string;
  selectedTimeSlot?: {
    start_time: string;
    end_time: string;
  };
  ticketNumber: string;
  status: string;
}

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;
  
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [scannerActive, setScannerActive] = useState(false);
  const [manualQrInput, setManualQrInput] = useState('');
  const [scanResult, setScanResult] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), async (currentUser) => {
      setUser(currentUser);
      if (currentUser && eventId) {
        await loadEventData(currentUser);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [eventId]);

  const loadEventData = async (currentUser: any) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/dashboard/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Event not found');
      
      const data = await res.json();
      setEvent(data.event);
      setAttendees(data.tickets || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async (ticketNumber: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/tickets/verify-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber,
          scannerId: user.uid,
          scannerType: 'user',
          eventId,
          scannerLocation: 'venue_entrance'
        })
      });

      const data = await res.json();
      if (data.success) {
        setScanResult({ type: 'success', message: 'Ticket validated successfully!' });
        await loadEventData(user); // Reload attendees to reflect status change
      } else {
        setScanResult({ type: 'error', message: data.error || 'Invalid ticket' });
      }
    } catch (err) {
      console.error(err);
      setScanResult({ type: 'error', message: 'Failed to verify ticket' });
    }
  };

  const submitManualQr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQrInput.trim()) return;
    handleManualCheckIn(manualQrInput.trim());
    setManualQrInput('');
  };

  const filteredAttendees = attendees.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter(a => a.status === 'used').length,
    pending: attendees.filter(a => a.status === 'active').length
  };

  if (loading) return <div className={styles.container}><div className={styles.loadingSpinner}>Loading...</div></div>;
  if (error) return <div className={styles.container}><div className={styles.errorState}>{error}</div></div>;
  if (!event) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push(`/event-dashboard/${eventId}`)}>
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>{event.title} Check-in</h1>
            <p className={styles.subtitle}>{event.event_venue}</p>
          </div>
        </div>
      </header>

      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><FaUsers /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Tickets</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.successIcon}`}><FaCheckCircle /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Checked In</span>
            <span className={styles.statValue}>{stats.checkedIn}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.pendingIcon}`}><FaClock /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Pending</span>
            <span className={styles.statValue}>{stats.pending}</span>
          </div>
        </div>
      </div>

      <div className={styles.scannerSection}>
        <div className={styles.scannerCard}>
          <h2 className={styles.scannerTitle}>Scan Ticket</h2>
          {scanResult && (
            <div className={`${styles.scanAlert} ${styles[scanResult.type]}`}>
              {scanResult.type === 'success' ? <FaCheckCircle /> : scanResult.type === 'error' ? <FaTimesCircle /> : <FaExclamationTriangle />}
              {scanResult.message}
            </div>
          )}
          <form onSubmit={submitManualQr} className={styles.manualEntryForm}>
            <input 
              type="text" 
              placeholder="Enter Ticket Number" 
              value={manualQrInput}
              onChange={(e) => setManualQrInput(e.target.value)}
              className={styles.manualInput}
            />
            <button type="submit" className={styles.submitButton} disabled={!manualQrInput.trim()}>
              Verify
            </button>
          </form>
        </div>
      </div>

      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Attendee List</h2>
          <div className={styles.searchBar}>
            <FaSearch className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search by name, email, or ticket..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.attendeesList}>
          {filteredAttendees.length > 0 ? (
            filteredAttendees.map(attendee => (
              <div key={attendee.id} className={`${styles.attendeeCard} ${attendee.status === 'used' ? styles.checkedInCard : ''}`}>
                <div className={styles.attendeeInfo}>
                  <h3 className={styles.attendeeName}>{attendee.name || attendee.email}</h3>
                  <div className={styles.attendeeDetails}>
                    <span className={styles.ticketTypeBadge}>{attendee.ticketType}</span>
                    <span className={styles.ticketNumberText}>{attendee.ticketNumber}</span>
                  </div>
                </div>
                <div className={styles.checkinAction}>
                  {attendee.status === 'used' ? (
                    <div className={styles.checkedInStatus}>
                      <FaCheckCircle />
                      <span>Checked In</span>
                    </div>
                  ) : (
                    <button 
                      className={styles.checkinButton}
                      onClick={() => handleManualCheckIn(attendee.ticketNumber)}
                    >
                      Check In
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>No attendees found.</div>
          )}
        </div>
      </div>
    </div>
  );
}