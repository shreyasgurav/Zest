'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/infrastructure/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  serverTimestamp, 
  runTransaction,
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { EventCollaborationSecurity } from '@/domains/events/services/collaboration.service';
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
  FaStop,
  FaPlay,
  FaExclamationTriangle
} from 'react-icons/fa';
import styles from './CheckinPage.module.css';

interface EventSession {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
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
  description: string;
  event_image?: string;
  architecture?: 'legacy' | 'session-centric';
  sessions?: EventSession[];
  venue_type?: 'global' | 'per_session';
  event_venue: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  creator: {
    name: string;
    pageId: string;
    userId: string;
  };
  time_slots: Array<{
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
    session_id?: string;
  }>;
}

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
  selectedSession?: EventSession;
  selectedDate: string;
  selectedTimeSlot: {
    start_time: string;
    end_time: string;
  };
  ticketIds?: string[];
  userId?: string;
  eventId?: string;
  createdAt: string;
  status?: string;
  paymentStatus?: string;
}

export default function CheckinPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Core state
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Session state
  const [selectedSession, setSelectedSession] = useState<EventSession | null>(null);
  const [showSessionSelector, setShowSessionSelector] = useState(true);
  const [sessionAttendees, setSessionAttendees] = useState<AttendeeData[]>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [checkingInAttendee, setCheckingInAttendee] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    pending: 0
  });

  // QR Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [qrScannerSupported, setQrScannerSupported] = useState(false);
  const [scanResult, setScanResult] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [manualQrInput, setManualQrInput] = useState('');
  
  // Undo functionality
  const [recentCheckIn, setRecentCheckIn] = useState<{attendee: AttendeeData, timestamp: Date} | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);

  // Check QR scanner support
  useEffect(() => {
    const checkQRSupport = () => {
      try {
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        const hasBarcodeDetector = 'BarcodeDetector' in window;
        setQrScannerSupported(hasMediaDevices);
        console.log('📱 QR Scanner support:', { hasMediaDevices, hasBarcodeDetector });
      } catch (error) {
        console.log('❌ QR scanner check failed:', error);
        setQrScannerSupported(false);
      }
    };
    checkQRSupport();
  }, []);

  // Auth and data loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), async (currentUser) => {
      setUser(currentUser);
      if (currentUser && eventId) {
        await loadEventData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [eventId]);

  // Real-time attendee updates
  useEffect(() => {
    if (!eventId || !hasAccess) return;

    console.log('📡 Setting up real-time attendee listener');
    
    // FIXED: Remove restrictive paymentStatus filter to match dashboard behavior
    const attendeesRef = collection(db(), 'eventAttendees');
    let attendeesQuery;

    // For session-centric events with selected session, filter by session
    if (selectedSession && event?.architecture === 'session-centric') {
      try {
        // Try to use sessionId filter for efficiency
        attendeesQuery = query(
          attendeesRef,
          where('eventId', '==', eventId),
          where('sessionId', '==', selectedSession.id),
          orderBy('createdAt', 'desc')
        );
      } catch (indexError) {
        console.warn('SessionId query failed, using basic query with client filtering:', indexError);
        // Fallback to basic query
        attendeesQuery = query(
          attendeesRef,
          where('eventId', '==', eventId),
          orderBy('createdAt', 'desc')
        );
      }
    } else {
      // For legacy events or when no session selected, get all attendees
      attendeesQuery = query(
        attendeesRef,
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(attendeesQuery, (snapshot) => {
      console.log(`📡 Raw query returned ${snapshot.docs.length} documents`);
      
      const attendeeList: AttendeeData[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.attendeeName || 'Unknown',
          email: data.email || data.attendeeEmail || '',
          phone: data.phone || data.attendeePhone || '',
          ticketType: data.ticketType || 'General',
          checkedIn: data.checkedIn || false,
          checkInTime: data.checkInTime,
          checkedInBy: data.checkedInBy,
          checkInMethod: data.checkInMethod,
          sessionId: data.sessionId || data.checkInSessionId,
          selectedSession: data.selectedSession,
          selectedDate: data.selectedDate || '',
          selectedTimeSlot: data.selectedTimeSlot || { start_time: '', end_time: '' },
          ticketIds: data.ticketIds || [],
          userId: data.userId,
          eventId: data.eventId || eventId,
          createdAt: data.createdAt || '',
          status: data.status,
          paymentStatus: data.paymentStatus
        };
      });

      // Filter out obviously invalid attendees (no name/email)
      const validAttendees = attendeeList.filter(attendee => 
        (attendee.name && attendee.name !== 'Unknown') || 
        (attendee.email && attendee.email !== '')
      );

      console.log(`📡 Filtered to ${validAttendees.length} valid attendees`);
      console.log('📡 Attendee sample:', validAttendees.slice(0, 3).map(a => ({
        id: a.id.substring(0, 8),
        name: a.name,
        sessionId: a.sessionId,
        paymentStatus: a.paymentStatus,
        checkedIn: a.checkedIn
      })));

      setAttendees(validAttendees);
      updateSessionAttendees(validAttendees);
      updateStats(validAttendees);
      console.log(`📡 Real-time update: ${validAttendees.length} total attendees`);
    }, (error) => {
      console.error('❌ Real-time listener error:', error);
      
      // If query with sessionId fails (missing index), fall back to basic query
      if (error.code === 'failed-precondition' && selectedSession) {
        console.warn('📡 Falling back to basic query due to missing index');
        
        const fallbackQuery = query(
          attendeesRef,
          where('eventId', '==', eventId),
          orderBy('createdAt', 'desc')
        );
        
        const fallbackUnsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
          const allAttendees = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || data.attendeeName || 'Unknown',
              email: data.email || data.attendeeEmail || '',
              phone: data.phone || data.attendeePhone || '',
              ticketType: data.ticketType || 'General',
              checkedIn: data.checkedIn || false,
              checkInTime: data.checkInTime,
              checkedInBy: data.checkedInBy,
              checkInMethod: data.checkInMethod,
              sessionId: data.sessionId || data.checkInSessionId,
              selectedSession: data.selectedSession,
              selectedDate: data.selectedDate || '',
              selectedTimeSlot: data.selectedTimeSlot || { start_time: '', end_time: '' },
              ticketIds: data.ticketIds || [],
              userId: data.userId,
              eventId: data.eventId || eventId,
              createdAt: data.createdAt || '',
              status: data.status,
              paymentStatus: data.paymentStatus
            };
          }) as AttendeeData[];

          const validAttendees = allAttendees.filter(attendee => 
            (attendee.name && attendee.name !== 'Unknown') || 
            (attendee.email && attendee.email !== '')
          );

          setAttendees(validAttendees);
          updateSessionAttendees(validAttendees);
          updateStats(validAttendees);
          console.log(`📡 Fallback update: ${validAttendees.length} attendees`);
        });

        return () => fallbackUnsubscribe();
      }
    });

    return () => unsubscribe();
  }, [eventId, hasAccess, selectedSession?.id, event?.architecture]);

  const loadEventData = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      console.log(`🔍 Loading event data for: ${eventId}`);

      // Check if user has check-in access to this event
      console.log(`🔐 Verifying access for user: ${currentUser.uid.substring(0, 8)}... to event: ${eventId}`);
      const permissions = await EventCollaborationSecurity.verifyEventAccess(eventId, currentUser.uid);
      console.log('🔐 User permissions result:', {
        canView: permissions.canView,
        canCheckIn: permissions.canCheckIn,
        role: permissions.role,
        fullPermissions: permissions
      });
      
      if (!permissions.canCheckIn) {
        console.log(`❌ Check-in access denied for user ${currentUser.uid.substring(0, 8)}...`);
        console.log('🔍 Attempting manual collaboration lookup...');
        
        // Debug: Check if there are any collaboration records for this user
        try {
          const sharedEvents = await EventCollaborationSecurity.getUserSharedEvents(currentUser.uid);
          console.log('🔍 User shared events:', sharedEvents);
          
          const hasEventAccess = sharedEvents.checkinEvents.some(event => event.eventId === eventId) ||
                                sharedEvents.managedEvents.some(event => event.eventId === eventId);
          
          if (hasEventAccess) {
            console.log('✅ Found collaboration access, allowing check-in access anyway');
            setHasAccess(true);
          } else {
            console.log('❌ No collaboration access found');
            setHasAccess(false);
            setError("You don't have check-in access to this event. Please contact the event organizer.");
            setLoading(false);
            return;
          }
        } catch (debugError) {
          console.error('❌ Debug collaboration lookup failed:', debugError);
        setHasAccess(false);
          setError("You don't have check-in access to this event");
        setLoading(false);
        return;
        }
      } else {
        console.log(`✅ Check-in access granted for user ${currentUser.uid.substring(0, 8)}...`);
        setHasAccess(true);
      }

      setHasAccess(true);

      // Load event data
      const eventDoc = await getDoc(doc(db(), 'events', eventId));
      if (eventDoc.exists()) {
        const eventData = { id: eventDoc.id, ...eventDoc.data() } as EventData;
        setEvent(eventData);
        console.log('📅 Event loaded:', eventData.title);
        
        // Handle session-centric events
        if (eventData.architecture === 'session-centric' && eventData.sessions) {
          console.log(`🎭 Session-centric event with ${eventData.sessions.length} sessions`);
          setShowSessionSelector(true);
        } else {
          console.log('📝 Legacy event structure');
          setShowSessionSelector(false);
          setSelectedSession(null);
        }
      } else {
        setError('Event not found');
      }
      
    } catch (error) {
      console.error('❌ Error loading event data:', error);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const updateSessionAttendees = (allAttendees: AttendeeData[]) => {
    if (!selectedSession) {
      setSessionAttendees(allAttendees);
      console.log(`📊 No session selected, showing all ${allAttendees.length} attendees`);
      return;
    }

    const sessionFiltered = allAttendees.filter(attendee => {
      // Primary filter: sessionId match (most reliable)
      if (attendee.sessionId === selectedSession.id) {
        console.log(`✅ Attendee ${attendee.name} matched by sessionId: ${attendee.sessionId}`);
        return true;
      }
      
      // Fallback: selectedSession object match
      if (attendee.selectedSession?.id === selectedSession.id) {
        console.log(`✅ Attendee ${attendee.name} matched by selectedSession.id: ${attendee.selectedSession.id}`);
        return true;
      }
      
      // Final fallback: date and time match for legacy records
      if (attendee.selectedDate === selectedSession.date && 
          attendee.selectedTimeSlot?.start_time === selectedSession.start_time) {
        console.log(`✅ Attendee ${attendee.name} matched by date/time: ${attendee.selectedDate} ${attendee.selectedTimeSlot.start_time}`);
        return true;
      }
      
      // Debug: Show why attendees don't match
      if (allAttendees.length < 20) { // Only for small lists to avoid spam
        console.log(`❌ Attendee ${attendee.name} doesn't match session ${selectedSession.id}:`, {
          attendeeSessionId: attendee.sessionId,
          attendeeSelectedSessionId: attendee.selectedSession?.id,
          attendeeDate: attendee.selectedDate,
          attendeeTime: attendee.selectedTimeSlot?.start_time,
          sessionDate: selectedSession.date,
          sessionTime: selectedSession.start_time
        });
      }
      
      return false;
    });

    console.log(`🎭 Session "${selectedSession.name}" (${selectedSession.id}): ${sessionFiltered.length}/${allAttendees.length} attendees`);
    
    if (sessionFiltered.length === 0 && allAttendees.length > 0) {
      console.warn(`⚠️ No attendees found for session ${selectedSession.id}. Check session ID matching logic.`);
      console.log('Session details:', {
        id: selectedSession.id,
        name: selectedSession.name,
        date: selectedSession.date,
        start_time: selectedSession.start_time
      });
      console.log('Sample attendee details:', allAttendees.slice(0, 3).map(a => ({
        id: a.id.substring(0, 8),
        name: a.name,
        sessionId: a.sessionId,
        selectedSessionId: a.selectedSession?.id,
        date: a.selectedDate,
        time: a.selectedTimeSlot?.start_time
      })));
    }
    
    setSessionAttendees(sessionFiltered);
  };

  const updateStats = (attendeeList: AttendeeData[]) => {
    const relevantAttendees = selectedSession ? 
      attendeeList.filter(a => 
        a.sessionId === selectedSession.id || 
        a.selectedSession?.id === selectedSession.id ||
        (a.selectedDate === selectedSession.date && a.selectedTimeSlot?.start_time === selectedSession.start_time)
      ) : attendeeList;

    const total = relevantAttendees.length;
    const checkedIn = relevantAttendees.filter(a => a.checkedIn).length;
      const pending = total - checkedIn;
      
      setStats({ total, checkedIn, pending });
  };

  // QR Scanner functions
  const startQRScanner = async () => {
    setScanResult({ type: 'info', message: 'Starting camera...' });
    
    try {
      let stream;
      try {
        // Try back camera first (mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      } catch {
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } }
        });
      }

      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setScannerActive(true);
      setScanResult({ type: 'info', message: 'Point camera at QR code or enter manually below' });

      // Start barcode detection if supported
      if ('BarcodeDetector' in window) {
        startBarcodeDetection(stream);
      }
      
    } catch (error) {
      console.error('❌ Camera error:', error);
      setScanResult({ 
        type: 'error', 
        message: 'Camera access failed. Use manual input below.' 
      });
      setQrScannerSupported(false);
    }
  };

  const stopQRScanner = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setScannerActive(false);
    setScanResult(null);
  };

  const startBarcodeDetection = async (stream: MediaStream) => {
    if (!('BarcodeDetector' in window)) return;

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code']
      });

      const detectBarcodes = async () => {
        if (videoRef.current && scannerActive) {
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            
            if (barcodes.length > 0) {
              const qrData = barcodes[0].rawValue;
              await processQRCode(qrData);
            }
            
            if (scannerActive) {
              requestAnimationFrame(detectBarcodes);
            }
          } catch (error) {
            if (scannerActive) {
              requestAnimationFrame(detectBarcodes);
            }
          }
        }
      };

      detectBarcodes();
    } catch (error) {
      console.error('❌ Barcode detection error:', error);
    }
  };

  const processQRCode = async (qrData: string) => {
    console.log('🔍 Processing QR code:', qrData);
    stopQRScanner();
    
    try {
      // Enhanced QR code parsing - support multiple formats
      const attendeeList = selectedSession ? sessionAttendees : attendees;
      
      console.log(`🔍 Searching ${attendeeList.length} attendees for QR match`);
      
      // Try different matching strategies
      let attendee = null;
      
      // Strategy 1: Direct ID match
      attendee = attendeeList.find(a => qrData.includes(a.id));
      if (attendee) {
        console.log('✅ Found attendee by ID match');
      }
      
      // Strategy 2: Email match
      if (!attendee) {
        attendee = attendeeList.find(a => a.email && qrData.includes(a.email));
        if (attendee) {
          console.log('✅ Found attendee by email match');
        }
      }
      
      // Strategy 3: Phone match
      if (!attendee) {
        attendee = attendeeList.find(a => a.phone && qrData.includes(a.phone));
        if (attendee) {
          console.log('✅ Found attendee by phone match');
        }
      }
      
      // Strategy 4: Ticket ID match (if ticketIds present)
      if (!attendee) {
        attendee = attendeeList.find(a => 
          a.ticketIds && a.ticketIds.some(ticketId => qrData.includes(ticketId))
        );
        if (attendee) {
          console.log('✅ Found attendee by ticket ID match');
        }
      }
      
      // Strategy 5: Name match (last resort, case insensitive)
      if (!attendee) {
        const qrLower = qrData.toLowerCase();
        attendee = attendeeList.find(a => 
          a.name && qrLower.includes(a.name.toLowerCase())
        );
        if (attendee) {
          console.log('✅ Found attendee by name match (verify manually)');
        }
      }

      if (attendee) {
        console.log(`🎯 Found attendee: ${attendee.name} (${attendee.id.substring(0, 8)})`);
        
        // Validate session match for session-centric events
        if (selectedSession && attendee.sessionId !== selectedSession.id && 
            attendee.selectedSession?.id !== selectedSession.id &&
            !(attendee.selectedDate === selectedSession.date && 
              attendee.selectedTimeSlot?.start_time === selectedSession.start_time)) {
          setScanResult({ 
            type: 'error', 
            message: `${attendee.name}'s ticket is for a different session. Please select the correct session first.` 
          });
          setTimeout(() => setScanResult(null), 5000);
          return;
        }
        
        if (attendee.checkedIn) {
          setScanResult({ 
            type: 'info', 
            message: `${attendee.name} is already checked in at ${new Date(attendee.checkInTime || '').toLocaleTimeString()}` 
          });
        } else {
          await handleCheckIn(attendee.id);
        }
      } else {
        console.log('❌ No attendee found for QR code:', qrData.substring(0, 50));
        setScanResult({ 
          type: 'error', 
          message: `QR code not found. Please verify the ticket is for this ${selectedSession ? 'session' : 'event'} or use manual check-in.` 
        });
      }
      
      setTimeout(() => setScanResult(null), 5000);
    } catch (error) {
      console.error('❌ QR processing error:', error);
      setScanResult({ 
        type: 'error', 
        message: 'Failed to process QR code. Please try manual check-in.' 
      });
      setTimeout(() => setScanResult(null), 5000);
    }
  };

  const handleManualQRSubmit = async () => {
    if (!manualQrInput.trim()) return;
    await processQRCode(manualQrInput.trim());
    setManualQrInput('');
  };

  const handleCheckIn = async (attendeeId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      setScanResult({ type: 'error', message: 'You must be signed in to check in attendees' });
      return;
    }
    
    const attendeeList = selectedSession ? sessionAttendees : attendees;
    const attendee = attendeeList.find(a => a.id === attendeeId);
    if (!attendee) {
      setScanResult({ type: 'error', message: 'Attendee not found in current session/event' });
      return;
    }

    // Double-check if already checked in
    if (attendee.checkedIn) {
      setScanResult({ 
        type: 'info', 
        message: `${attendee.name} is already checked in at ${new Date(attendee.checkInTime || '').toLocaleTimeString()}` 
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // Prevent multiple simultaneous check-ins
    if (checkingInAttendee === attendeeId) {
      return;
    }
    
    setCheckingInAttendee(attendeeId);
    console.log(`🔄 Starting check-in for ${attendee.name} (${attendeeId.substring(0, 8)})`);
    
    // If user has access to this check-in page, skip additional permission checks
    // The access verification was already done in loadEventData()
    console.log(`🔐 User has check-in page access, proceeding with check-in transaction`);
    
    try {
      const checkInTime = new Date().toISOString();
      const checkInMethod = scannerActive ? 'qr_scan' : 'manual';
      
      // Use transaction for atomic updates
      await runTransaction(db(), async (transaction) => {
        const attendeeRef = doc(db(), 'eventAttendees', attendeeId);
        const attendeeDoc = await transaction.get(attendeeRef);
        
        if (!attendeeDoc.exists()) {
          throw new Error('Attendee record not found in database');
        }
        
        const attendeeData = attendeeDoc.data();
        
        // Final check within transaction to prevent race conditions
        if (attendeeData.checkedIn) {
          throw new Error(`${attendee.name} was already checked in by another user`);
        }
        
        // Validate session match within transaction for session-centric events
        if (selectedSession) {
          const isValidSession = 
            attendeeData.sessionId === selectedSession.id ||
            attendeeData.selectedSession?.id === selectedSession.id ||
            (attendeeData.selectedDate === selectedSession.date && 
             attendeeData.selectedTimeSlot?.start_time === selectedSession.start_time);
             
          if (!isValidSession) {
            throw new Error(`${attendee.name} is not registered for this session`);
          }
        }
        
        console.log(`✅ Updating attendee record for ${attendee.name}`);
        
        // Update attendee record with comprehensive data
        transaction.update(attendeeRef, {
          checkedIn: true,
          checkInTime: checkInTime,
          checkInMethod: checkInMethod,
          checkedInBy: currentUser.uid,
          checkInSessionId: selectedSession?.id || null,
          lastUpdated: checkInTime
        });

        // Mark associated tickets as used (with error handling for each ticket)
        if (attendee.ticketIds && attendee.ticketIds.length > 0) {
          console.log(`🎫 Updating ${attendee.ticketIds.length} associated tickets`);
          
          attendee.ticketIds.forEach((ticketId, index) => {
            try {
              const ticketRef = doc(db(), 'tickets', ticketId);
              transaction.update(ticketRef, {
                status: 'used',
                usedAt: checkInTime,
                checkedInBy: currentUser.uid,
                checkInMethod: checkInMethod,
                lastUpdated: checkInTime
              });
              console.log(`✅ Updated ticket ${index + 1}/${attendee.ticketIds!.length}: ${ticketId.substring(0, 8)}`);
            } catch (ticketError) {
              console.warn(`⚠️ Failed to update ticket ${ticketId.substring(0, 8)}:`, ticketError);
              // Don't fail the entire transaction for ticket update issues
            }
        });
        }
      });

      console.log(`🎉 Successfully checked in ${attendee.name}`);

      // Store for undo functionality (30-second window)
      setRecentCheckIn({
        attendee: { ...attendee, checkedIn: true, checkInTime: checkInTime },
        timestamp: new Date()
      });

      setScanResult({ 
        type: 'success', 
        message: `🎉 ${attendee.name} checked in successfully! ${selectedSession ? `Session: ${selectedSession.name}` : ''} (Undo available for 30 seconds)` 
      });

      // Clear undo option after 30 seconds
      setTimeout(() => {
        setRecentCheckIn(null);
        console.log('⏰ Undo window expired');
      }, 30000);
      
      setTimeout(() => setScanResult(null), 5000);
      
    } catch (error) {
      console.error('❌ Check-in transaction failed:', error);
      
      let errorMessage = 'Failed to check in attendee';
      if (error instanceof Error) {
        if (error.message.includes('already checked in')) {
          errorMessage = error.message;
        } else if (error.message.includes('not registered for this session')) {
          errorMessage = error.message;
        } else if (error.message.includes('not found')) {
          errorMessage = 'Attendee record not found. Please refresh and try again.';
        } else {
          errorMessage = `Check-in failed: ${error.message}`;
        }
      }
      
      setScanResult({ 
        type: 'error', 
        message: errorMessage 
      });
      setTimeout(() => setScanResult(null), 5000);
    } finally {
      setCheckingInAttendee(null);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!recentCheckIn || undoLoading) return;
    
    setUndoLoading(true);
    
    try {
      const attendee = recentCheckIn.attendee;
      const currentUser = auth().currentUser;

      await runTransaction(db(), async (transaction) => {
        const attendeeRef = doc(db(), 'eventAttendees', attendee.id);
        
        // Revert attendee record
        transaction.update(attendeeRef, {
          checkedIn: false,
          checkInTime: null,
          checkInMethod: null,
          checkedInBy: null,
          checkInSessionId: null
        });
        
        // Revert associated tickets
        if (attendee.ticketIds && attendee.ticketIds.length > 0) {
          attendee.ticketIds.forEach(ticketId => {
            const ticketRef = doc(db(), 'tickets', ticketId);
            transaction.update(ticketRef, {
              status: 'active',
              usedAt: null,
              checkedInBy: null,
              checkInMethod: null
            });
          });
        }
      });

      setScanResult({ 
        type: 'info', 
        message: `↩️ Check-in undone for ${attendee.name}` 
      });

      setRecentCheckIn(null);
      setTimeout(() => setScanResult(null), 3000);
    } catch (error) {
      console.error('❌ Undo error:', error);
      setScanResult({ 
        type: 'error', 
        message: 'Failed to undo check-in' 
      });
      setTimeout(() => setScanResult(null), 5000);
    } finally {
      setUndoLoading(false);
    }
  };

  const handleSessionSelect = (session: EventSession) => {
    setSelectedSession(session);
    setShowSessionSelector(false);
    console.log(`🎭 Selected session: ${session.name}`);
  };

  const filteredAttendees = (selectedSession ? sessionAttendees : attendees).filter(attendee =>
    attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.phone.includes(searchTerm)
  );

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading check-in access...</p>
        </div>
      </div>
    );
  }

  // Auth required
  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <FaTimesCircle className={styles.deniedIcon} />
          <h2>Authentication Required</h2>
          <p>Please sign in to access the check-in system.</p>
          <button onClick={() => router.push('/login')} className={styles.loginButton}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess || error) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <FaTimesCircle className={styles.deniedIcon} />
          <h2>Access Denied</h2>
          <p>{error || "You don't have check-in access to this event."}</p>
          <button onClick={() => router.back()} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Session selector for session-centric events
  if (showSessionSelector && event?.architecture === 'session-centric' && event.sessions) {
    return (
      <div className={styles.container}>
        <div className={styles.sessionSelector}>
          <div className={styles.header}>
            <button onClick={() => router.back()} className={styles.backBtn}>
              <FaArrowLeft />
            </button>
            <div className={styles.headerInfo}>
              <h1>{event.title}</h1>
              <p>Select a session to start check-in</p>
            </div>
          </div>

          <div className={styles.sessionsGrid}>
            {event.sessions.map((session) => {
              const sessionAttendeeCount = attendees.filter(a => 
                a.sessionId === session.id || 
                a.selectedSession?.id === session.id ||
                (a.selectedDate === session.date && a.selectedTimeSlot?.start_time === session.start_time)
              ).length;

              return (
                <div
                  key={session.id}
                  className={styles.sessionCard}
                  onClick={() => handleSessionSelect(session)}
                >
                  <h3>{session.name}</h3>
                  <div className={styles.sessionDetails}>
                    <p>{new Date(session.date).toLocaleDateString()}</p>
                    <p>{session.start_time} - {session.end_time}</p>
                    {session.venue && <p>📍 {session.venue}</p>}
                  </div>
                  <div className={styles.sessionStats}>
                    <span>{sessionAttendeeCount} attendees</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Main check-in interface
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => {
          if (selectedSession && event?.architecture === 'session-centric') {
            setShowSessionSelector(true);
          } else {
            router.back();
          }
        }} className={styles.backBtn}>
          <FaArrowLeft />
        </button>
        <div className={styles.headerInfo}>
          <h1>{selectedSession ? selectedSession.name : (event?.title || 'Event Check-in')}</h1>
          <div className={styles.eventDetails}>
            <span>{selectedSession?.venue || event?.event_venue || event?.location}</span>
            <span>•</span>
            <span>{selectedSession ? 
              new Date(selectedSession.date).toLocaleDateString() : 
              new Date(event?.startDate || '').toLocaleDateString()
            }</span>
          </div>
        </div>
        <div className={styles.qrIcon}>
          <FaQrcode />
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <FaUsers className={styles.statIcon} />
          <div className={styles.statInfo}>
            <div className={styles.statNumber}>{stats.total}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <FaCheckCircle className={styles.statIcon} />
          <div className={styles.statInfo}>
            <div className={styles.statNumber}>{stats.checkedIn}</div>
            <div className={styles.statLabel}>Checked In</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <FaClock className={styles.statIcon} />
          <div className={styles.statInfo}>
            <div className={styles.statNumber}>{stats.pending}</div>
            <div className={styles.statLabel}>Pending</div>
          </div>
        </div>
      </div>

      {/* QR Scanner Section */}
      <div className={styles.scannerSection}>
        {scannerActive ? (
          <div className={styles.scannerContainer}>
            <video ref={videoRef} className={styles.scannerVideo} playsInline />
            <div className={styles.scannerOverlay}>
              <div className={styles.scannerFrame}></div>
            </div>
            <button onClick={stopQRScanner} className={styles.stopScannerBtn}>
              <FaStop /> Stop Scanner
            </button>
          </div>
        ) : (
          <div className={styles.scannerControls}>
            {qrScannerSupported ? (
              <button onClick={startQRScanner} className={styles.startScannerBtn}>
                <FaCamera /> Start QR Scanner
              </button>
            ) : (
              <div className={styles.scannerUnavailable}>
                <FaExclamationTriangle />
                <span>Camera not available - use manual search below</span>
              </div>
            )}
            
            <div className={styles.manualInput}>
              <input
                type="text"
                placeholder="Or enter QR code manually..."
                value={manualQrInput}
                onChange={(e) => setManualQrInput(e.target.value)}
                className={styles.manualQrInput}
                onKeyPress={(e) => e.key === 'Enter' && handleManualQRSubmit()}
              />
              <button onClick={handleManualQRSubmit} className={styles.manualSubmitBtn}>
                Check In
              </button>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className={`${styles.scanResult} ${styles[scanResult.type]}`}>
            {scanResult.message}
          </div>
        )}

        {/* Undo Button */}
        {recentCheckIn && (
          <button 
            onClick={handleUndoCheckIn} 
            disabled={undoLoading}
            className={styles.undoBtn}
          >
            <FaUndo /> {undoLoading ? 'Undoing...' : `Undo ${recentCheckIn.attendee.name}`}
          </button>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchSection}>
        <div className={styles.searchInputContainer}>
          <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        </div>
      </div>

      {/* Attendees List */}
      <div className={styles.attendeesList}>
        {filteredAttendees.length === 0 ? (
          <div className={styles.noResults}>
            <FaUsers />
            <p>{searchTerm ? 'No attendees found matching your search.' : 'No attendees found for this session.'}</p>
          </div>
        ) : (
          filteredAttendees.map((attendee) => (
            <div key={attendee.id} className={`${styles.attendeeCard} ${attendee.checkedIn ? styles.checkedIn : ''}`}>
              <div className={styles.attendeeInfo}>
                <div className={styles.attendeeName}>{attendee.name}</div>
                <div className={styles.attendeeDetails}>
                  <span>{attendee.email}</span>
                  {attendee.phone && <span>• {attendee.phone}</span>}
                  <span>• {attendee.ticketType}</span>
                </div>
                {attendee.checkedIn && attendee.checkInTime && (
                   <div className={styles.checkinTime}>
                    ✅ Checked in at {new Date(attendee.checkInTime).toLocaleTimeString()}
                    {attendee.checkInMethod === 'qr_scan' && ' (QR)'}
                   </div>
                 )}
              </div>
              <div className={styles.attendeeActions}>
                  <button
                    onClick={() => handleCheckIn(attendee.id)}
                  disabled={checkingInAttendee === attendee.id || attendee.checkedIn}
                  className={`${styles.actionButton} ${attendee.checkedIn ? styles.checkedInButton : styles.checkinButton}`}
                  >
                  {checkingInAttendee === attendee.id ? 'Processing...' : 
                   attendee.checkedIn ? '✅ Checked In' : 'Check In'}
                  </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 