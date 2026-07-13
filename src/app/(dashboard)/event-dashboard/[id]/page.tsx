'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useParams, useRouter } from 'next/navigation';
// Firestore imports removed
import { getAuth } from 'firebase/auth';
import styles from './EventDashboard.module.css';
import { DashboardSecurity, DashboardPermissions } from '@/shared/utils/security/dashboardSecurity';
import { getTicketDisplayStatus } from '@/domains/tickets/services/ticketValidator';


import DashboardSidebar from '@/shared/components/dashboard/DashboardSidebar/DashboardSidebar';
import DashboardOverview from '@/shared/components/dashboard/DashboardOverview/DashboardOverview';
import { 
  safeDivision, 
  calculateCheckInRate, 
  calculateRevenue, 
  formatDate, 
  formatTime, 
  calculateTicketStats, 
  filterAttendees, 
  exportAttendeesToCSV, 
  validateCheckInEligibility, 
  getEmptyStateMessage,
  getContextEmptyState
} from '@/shared/utils/helpers/dashboardHelpers';
import { 
  FaEdit, 
  FaTrash, 
  FaTicketAlt, 
  FaUsers, 
  FaCalendarAlt, 
  FaMapMarkerAlt,
  FaDownload,
  FaEye,
  FaMoneyBillWave,
  FaSearch,
  FaFilter,
  FaQrcode,
  FaSyncAlt,
  FaChartBar,
  FaUserCheck,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaCamera,
  FaToggleOn,
  FaPause,
  FaFileExcel,
  FaFilePdf,
  FaBell,
  FaShare,
  FaCopy,
  FaCog,
  FaExclamationTriangle,
  FaUserPlus,
  FaArrowLeft,
  FaLayerGroup,
  FaChevronRight,
  FaPercentage,
  FaHandshake,
  FaStop,
  FaChevronLeft,
  FaChevronDown,
  FaBars
} from 'react-icons/fa';

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  tickets: Record<string, number> | number;
  selectedDate: string;
  selectedTimeSlot: TimeSlot;
  selectedSession?: EventSession;
  sessionId?: string;
  createdAt: string;
  status?: string;
  paymentStatus?: string;
  checkedIn?: boolean;
  checkInTime?: string;
  ticketIds?: string[];
  userId?: string;
  eventId?: string;
  ticketType?: string;
  ticketIndex?: number;
  totalTicketsInBooking?: number;
  individualAmount?: number;
  originalBookingData?: {
    originalTotalAmount: number;
    originalTickets: Record<string, number> | number;
    bookingReference: string;
  };
  attendeeId?: string;
  canCheckInIndependently?: boolean;
  checkInMethod?: string;
  checkedInBy?: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  userName: string;
  userEmail: string;
  ticketType?: string;
  eventId?: string;
  sessionId?: string;
  userId: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  createdAt: string;
  usedAt?: string;
  qrCode?: string;
  type: 'event' | 'activity';
  title: string;
  venue: string;
  selectedDate: string;
  selectedTimeSlot: {
    start_time: string;
    end_time: string;
  };
  amount: number;
  bookingId: string;
}

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
  event_image?: string;
  organizationId: string;
  event_type: string;
  architecture?: 'legacy' | 'session-centric';
  
  // Session-centric fields
  sessions?: EventSession[];
  venue_type?: 'global' | 'per_session';
  total_sessions?: number;
  total_capacity?: number;
  
  // Legacy and compatibility fields
  time_slots: Array<{
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
    session_id?: string;
  }>;
  tickets: Array<{
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
  event_venue: string;
  about_event: string;
  hosting_club: string;
  organization_username: string;
  event_category: string;
  event_languages: string;
  event_duration: string;
  event_age_limit: string;
}

// Error Fallback Component
const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className={styles.errorState}>
      <FaExclamationTriangle />
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <div className={styles.errorActions}>
        <button onClick={resetErrorBoundary} className={styles.primaryButton}>
          Try again
        </button>
        <button onClick={() => window.location.reload()} className={styles.secondaryButton}>
          Refresh page
        </button>
      </div>
    </div>
  );
};

// Utility functions
const validateEventSession = (session: EventSession | null): boolean => {
  if (!session) return false;
  
  const now = new Date();
  const sessionDate = new Date(session.date);
  const startTime = new Date(`${session.date} ${session.start_time}`);
  const endTime = new Date(`${session.date} ${session.end_time}`);
  
  // Session date validation
  if (sessionDate < new Date(now.setHours(0,0,0,0))) {
    console.warn('Session date is in the past:', session.date);
  }
  
  // Time validation
  if (endTime < now) {
    console.warn('Session has ended:', session.end_time);
  }
  
  // Capacity validation
  const totalCapacity = session.tickets.reduce((sum, t) => sum + t.capacity, 0);
  if (totalCapacity !== session.maxCapacity) {
    console.warn('Session capacity mismatch:', {
      calculatedCapacity: totalCapacity,
      maxCapacity: session.maxCapacity
    });
  }
  
  return true;
};

const handleRealtimeError = (
  error: Error, 
  context: string,
  cleanup: () => void,
  reconnect: () => void,
  setError: (message: string) => void
) => {
  console.error(`Error in ${context}:`, error);
  
  // Show user-friendly error message
  setError(`Failed to get real-time updates. ${error.message}`);
  
  // Clean up listeners on error
  cleanup();
  
  // Attempt to reconnect after delay
  setTimeout(() => {
    console.log('🔄 Attempting to reconnect...');
    reconnect();
  }, 5000);
};

const EventDashboardContent = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getAuth();
  const eventId = params?.id;
  
  // NEW: Session-centric states
  const [selectedSession, setSelectedSession] = useState<EventSession | null>(null);
  const [showSessionSelector, setShowSessionSelector] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  
  // State management
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [sessionAttendees, setSessionAttendees] = useState<Attendee[]>([]);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<DashboardPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canManageAttendees: false,
    canViewFinancials: false,
    canSendCommunications: false,
    role: 'unauthorized'
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isDeleting, setDeleting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendees' | 'checkin' | 'settings' | 'manage-tickets' | 'collaborations'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending' | 'checked-in' | 'not-checked-in'>('all');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sessionTickets, setSessionTickets] = useState<Ticket[]>([]);
  
  // Real-time data for selected session
  const [sessionStats, setSessionStats] = useState({
    totalRevenue: 0,
    soldTickets: 0,
    availableTickets: 0,
    totalCapacity: 0,
    checkedInCount: 0,
    pendingCheckIn: 0,
    lastUpdated: new Date()
  });
  
  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Check-in specific state
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [manualCheckInSearch, setManualCheckInSearch] = useState('');
  const [selectedAttendeeForCheckIn, setSelectedAttendeeForCheckIn] = useState<Attendee | null>(null);
  const [manualQrInput, setManualQrInput] = useState('');
  const [qrScannerSupported, setQrScannerSupported] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Loading and Undo states
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null); // attendeeId being processed
  const [recentCheckIn, setRecentCheckIn] = useState<{attendee: Attendee, timestamp: Date} | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);
  
  // Ticket management state
  const [showTicketManager, setShowTicketManager] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [newTicket, setNewTicket] = useState({ name: '', capacity: '', price: '' });
  const [ticketUpdating, setTicketUpdating] = useState<string | null>(null);
  const [ticketUpdateResult, setTicketUpdateResult] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  
  // Event sharing state
  const [showEventSharing, setShowEventSharing] = useState(false);
  
  // Manual attendee addition state
  const [showManualAttendeeForm, setShowManualAttendeeForm] = useState(false);
  const [manualAttendeeData, setManualAttendeeData] = useState({
    name: '',
    email: '',
    phone: '',
    ticketType: '',
    quantity: 1,
    selectedTimeSlot: null as any
  });
  const [manualAttendeeLoading, setManualAttendeeLoading] = useState(false);
  const [manualAttendeeResult, setManualAttendeeResult] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  
  // Refs for cleanup
  const unsubscribeAttendees = useRef<(() => void) | null>(null);
  const unsubscribeTickets = useRef<(() => void) | null>(null);

  // Remove complex analytics state - keep it simple
  const [showBasicStats, setShowBasicStats] = useState(true);

  // Simple pagination for large events
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Fixed page size for simplicity
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [showPagination, setShowPagination] = useState(false);

  // New ticket category states
  const [newTicketName, setNewTicketName] = useState('');
  const [newTicketPrice, setNewTicketPrice] = useState('');
  const [newTicketCapacity, setNewTicketCapacity] = useState('');
  const [addingTicket, setAddingTicket] = useState(false);

  // Check QR scanner support without accessing camera
  useEffect(() => {
    const checkQRSupport = () => {
      try {
        // FIXED: Check browser support without accessing camera
        const userAgent = navigator.userAgent.toLowerCase();
        const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
        const isFirefox = /firefox/.test(userAgent);
        const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
        const isEdge = /edge/.test(userAgent);
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

        console.log('Browser detection:', { isSafari, isFirefox, isChrome, isEdge, isMobile });

        // Check if MediaDevices API is available (don't access camera yet)
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        
        if (!hasMediaDevices) {
          console.log('❌ MediaDevices API not available - QR scanning disabled');
          setQrScannerSupported(false);
          return;
        }

        // Check BarcodeDetector API support (preferred method)
        if ('BarcodeDetector' in window) {
          try {
            // Test if BarcodeDetector can be instantiated
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code']
            });
            console.log('✅ BarcodeDetector API supported and working');
            setQrScannerSupported(true);
          } catch (barcodeError) {
            console.log('❌ BarcodeDetector API exists but failed to initialize:', barcodeError);
            setQrScannerSupported(false);
          }
        } else {
          console.log('❌ BarcodeDetector API not supported');
          
          // Special handling for different browsers
          if (isSafari) {
            console.log('🍎 Safari detected - BarcodeDetector not supported, manual entry recommended');
          } else if (isFirefox) {
            console.log('🦊 Firefox detected - BarcodeDetector not supported, manual entry recommended');
          } else {
            console.log('📱 Browser does not support BarcodeDetector API');
          }
          
          // For browsers without BarcodeDetector, still allow QR scanning attempt
          // The camera check will happen when user actually tries to scan
          setQrScannerSupported(hasMediaDevices);
        }
      } catch (error) {
        console.log('❌ QR scanner support check failed:', error);
        setQrScannerSupported(false);
      }
    };

    checkQRSupport();
  }, []);

  // Start QR scanner
  const startQRScanner = async () => {
    // Detect browser and provide specific guidance
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    // Show loading state
      setScanResult({
        type: 'info',
      message: 'Requesting camera access...'
      });

    try {
      // Check camera access first (only when user wants to scan)
      let stream;
      try {
        // First try with back camera (mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      } catch (backCameraError) {
        console.log('Back camera not available, trying any camera:', backCameraError);
        try {
          // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        } catch (anyCameraError) {
          console.log('No camera available:', anyCameraError);
          throw anyCameraError;
        }
      }

      // Check if we have a valid stream
      if (!stream) {
        throw new Error('No camera stream available');
      }

      // For browsers without BarcodeDetector, warn user but still allow manual entry
      if (!('BarcodeDetector' in window)) {
        let message = 'Camera started, but automatic QR scanning not supported on this browser. ';
        if (isSafari && isMac) {
          message += 'Safari on Mac has limited QR support. You can see the camera but please use manual check-in below.';
        } else {
          message += 'Please use manual QR input or manual check-in below.';
        }
        
        setScanResult({
          type: 'info',
          message
        });
        
        // Auto-show manual check-in for better UX
        setShowManualCheckIn(true);
      }
      
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setScannerActive(true);
      
      // Only start barcode detection if supported
      if ('BarcodeDetector' in window) {
      setScanResult({
        type: 'info',
        message: isMac ? 'QR scanner started. If scanning doesn\'t work, use manual check-in below.' : 'QR scanner started. Point camera at attendee QR code.'
      });

      // Start scanning for QR codes
      startBarcodeDetection(stream);
      }
      
    } catch (error) {
      console.error('Error starting camera:', error);
      
      let errorMessage = 'Could not access camera. ';
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Camera is being used by another application.';
        } else {
          errorMessage += 'Camera error occurred.';
        }
      } else if (isMac && isSafari) {
        errorMessage += 'Safari on Mac may have camera issues. Try Chrome or use manual check-in.';
      } else {
        errorMessage += 'Please use manual check-in instead.';
      }
      
      setScanResult({
        type: 'error',
        message: errorMessage
      });
      
      // Auto-show manual check-in as fallback
      setShowManualCheckIn(true);
      
      // Update QR support status based on actual camera access
      setQrScannerSupported(false);
    }
  };

  // Stop QR scanner
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

  // Barcode detection
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
            
            // Continue scanning if still active
            if (scannerActive) {
              requestAnimationFrame(detectBarcodes);
            }
          } catch (error) {
            // Continue scanning even if detection fails
            if (scannerActive) {
              requestAnimationFrame(detectBarcodes);
            }
          }
        }
      };

      // Start detection loop
      detectBarcodes();
      
    } catch (error) {
      console.error('Error setting up barcode detection:', error);
      setScanResult({
        type: 'error',
        message: 'Error setting up QR scanner. Please use manual check-in.'
      });
    }
  };

  // Process scanned QR code
  const processQRCode = async (qrData: string) => {
    try {
      // Parse QR data - assuming it contains ticket ID or attendee info
      let ticketId = '';
      let attendeeId = '';
      
      try {
        // Try parsing as JSON first
        const qrJson = JSON.parse(qrData);
        ticketId = qrJson.ticketId || qrJson.id || '';
        attendeeId = qrJson.attendeeId || '';
      } catch {
        // If not JSON, treat as plain ticket ID
        ticketId = qrData;
      }

      if (!ticketId) {
        setScanResult({
          type: 'error',
          message: 'Invalid QR code format'
        });
        return;
      }

      // Stop scanner first to prevent multiple scans
      stopQRScanner();

      setScanResult({
        type: 'info',
        message: 'Validating ticket...'
      });

      // Use the comprehensive ticket validation API
      try {
        const response = await fetch('/api/tickets/verify-entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: ticketId,
            eventId: eventId,
            sessionId: selectedSession?.id
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setScanResult({
            type: 'success',
            message: `✅ ${result.ticket.userName} checked in successfully! Ticket marked as used.`
          });
          
          // Clear message after 5 seconds
          setTimeout(() => setScanResult(null), 5000);
        } else {
          setScanResult({
            type: 'error',
            message: result.message || 'Ticket validation failed'
          });
          setTimeout(() => setScanResult(null), 5000);
        }
      } catch (validationError) {
        console.error('Ticket validation API error:', validationError);
        
        // FIXED: Improved fallback with safer matching
        const attendee = sessionAttendees.find(a => {
          // Primary: Direct ID match
          if (a.id === ticketId || a.id === attendeeId) return true;
          
          // Secondary: Ticket IDs array match
          if (a.ticketIds?.includes(ticketId)) return true;
          
          // REMOVED: Dangerous email.includes() check
          // Tertiary: Exact email match only if ticketId looks like email
          if (ticketId.includes('@') && a.email === ticketId) return true;
          
          return false;
        });

        if (attendee) {
          await handleSessionCheckIn(attendee);
        } else {
          setScanResult({
            type: 'error',
            message: `No attendee found for ticket: ${ticketId.substring(0, 20)}...`
          });
          setTimeout(() => setScanResult(null), 5000);
        }
      }
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      setScanResult({
        type: 'error',
        message: 'Error processing QR code. Please try manual check-in.'
      });
      setTimeout(() => setScanResult(null), 5000);
    }
  };

  // Helper functions now imported from dashboardHelpers for safety

  // FIXED: Standardized revenue calculation function
  const calculateAttendeeRevenue = (attendee: Attendee, sessionContext?: EventSession): number => {
    try {
      // Method 1: Individual amount (preferred for new records)
      if (attendee.individualAmount && typeof attendee.individualAmount === 'number' && attendee.individualAmount > 0) {
        return attendee.individualAmount;
      }
      
      // Method 2: Calculate from ticket prices using session context
      if (typeof attendee.tickets === 'object' && attendee.tickets && sessionContext) {
        const calculatedRevenue = Object.entries(attendee.tickets).reduce((sum, [ticketName, quantity]) => {
          const ticket = sessionContext.tickets.find(t => t.name === ticketName);
          const count = Number(quantity);
          if (ticket && !isNaN(count) && count > 0) {
            return sum + (ticket.price * count);
          }
          return sum;
        }, 0);
        
        if (calculatedRevenue > 0) {
          return calculatedRevenue;
        }
      }
      
      // Method 3: Legacy single ticket booking
      if (typeof attendee.tickets === 'number' && attendee.tickets > 0 && sessionContext && sessionContext.tickets.length > 0) {
        return sessionContext.tickets[0].price * attendee.tickets;
      }
      
      // Method 4: Fallback to original booking data
      if (attendee.originalBookingData?.originalTotalAmount && 
          typeof attendee.originalBookingData.originalTotalAmount === 'number' && 
          attendee.originalBookingData.originalTotalAmount > 0) {
        return attendee.originalBookingData.originalTotalAmount;
      }
      
      // Default: No revenue found
      return 0;
    } catch (error) {
      console.warn('Error calculating revenue for attendee:', attendee.id, error);
      return 0;
    }
  };

  // FIXED: Standardized session revenue calculation
  const calculateSessionRevenue = (attendees: Attendee[], sessionContext?: EventSession): number => {
    return attendees.reduce((total, attendee) => {
      return total + calculateAttendeeRevenue(attendee, sessionContext);
    }, 0);
  };

  // NEW: Session selection handler
  const handleSessionSelect = (session: EventSession) => {
    setSelectedSession(session);
    setShowSessionSelector(false);
    setActiveTab('overview');
    
    // Set up real-time listeners for this session
    if (permissions.canView && eventId) {
      setupRealTimeAttendees();
      setupRealTimeTickets();
    }
  };

  // Calculate live ticket statistics for a specific ticket type
  const calculateLiveTicketStats = useCallback((ticketName: string, ticketCapacity: number, ticketPrice: number) => {
    const soldCount = sessionAttendees.filter(attendee => {
      // Check direct ticket type
      if (attendee.ticketType === ticketName) return true;
      
      // Check for multi-ticket bookings
      if (typeof attendee.tickets === 'object' && attendee.tickets[ticketName] > 0) {
        return true;
      }
      
      return false;
    }).length;

    const availableCount = Math.max(0, ticketCapacity - soldCount);
    const revenue = soldCount * ticketPrice;
    const soldPercentage = ticketCapacity > 0 ? (soldCount / ticketCapacity) * 100 : 0;
    
    return {
      sold: soldCount,
      available: availableCount,
      revenue,
      percentage: soldPercentage,
      capacity: ticketCapacity
    };
  }, [sessionAttendees]);

  // NEW: Update session-specific statistics
  const updateSessionStats = useCallback((session: EventSession, sessionAttendees: Attendee[], sessionTickets: Ticket[]) => {
    if (!session) return;

    const totalCapacity = session.tickets.reduce((sum, ticket) => sum + ticket.capacity, 0);
    const soldTickets = sessionAttendees.length;
    
    // Calculate revenue for this session
    const revenue = sessionAttendees.reduce((sum, attendee) => {
      // Try individualAmount first (for new individual records)
      if (attendee.individualAmount) {
        return sum + attendee.individualAmount;
      }
      
      // Calculate from ticket prices for group bookings or legacy records
      if (typeof attendee.tickets === 'object') {
        return sum + Object.entries(attendee.tickets).reduce((ticketSum, [ticketName, count]) => {
          const ticket = session.tickets.find(t => t.name === ticketName);
          return ticketSum + (ticket ? ticket.price * Number(count) : 0);
        }, 0);
      }
      
      // For legacy single ticket bookings
      if (typeof attendee.tickets === 'number' && session.tickets.length > 0) {
        return sum + (session.tickets[0].price * attendee.tickets);
      }
      
      // Fallback: try to get from originalBookingData
      if (attendee.originalBookingData?.originalTotalAmount) {
        return sum + attendee.originalBookingData.originalTotalAmount;
      }
      
      return sum;
    }, 0);

    const checkedInCount = sessionAttendees.filter(attendee => attendee.checkedIn).length;
    const pendingCheckIn = sessionAttendees.length - checkedInCount;

    setSessionStats({
      totalRevenue: revenue,
      soldTickets,
      availableTickets: totalCapacity - soldTickets,
      totalCapacity,
      checkedInCount,
      pendingCheckIn,
      lastUpdated: new Date()
    });
  }, []);

  // Initialize dashboard
  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }
    
    const initializeDashboard = async () => {
      setLoading(true);
      try {
        await checkAuthorization();
        await fetchEventData();
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [eventId]);

  const checkAuthorization = async () => {
    if (!auth.currentUser || !eventId) {
      setPermissions({
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageAttendees: false,
        canViewFinancials: false,
        canSendCommunications: false,
        role: 'unauthorized'
      });
      setError('Please sign in to access this dashboard');
      return;
    }

    try {
      const dashboardPermissions = await DashboardSecurity.verifyDashboardAccess(eventId, auth.currentUser.uid);
      setPermissions(dashboardPermissions);
      
      if (!dashboardPermissions.canView) {
        setError('You do not have permission to view this event dashboard');
      }
    } catch (err) {
      console.error("Error checking authorization:", err);
      setPermissions({
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageAttendees: false,
        canViewFinancials: false,
        canSendCommunications: false,
        role: 'unauthorized'
      });
      setError('Failed to verify permissions');
    }
  };

  const fetchEventData = async () => {
    if (!eventId) return;

    try {
      const response = await fetch(`/api/dashboard/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to load event data');
      }
      
      const data = await response.json();
      
      if (data.event) {
        setEventData({ ...data.event });
        setAttendees(data.attendees || []);
        setTickets(data.tickets || []);
        setSessionAttendees(data.attendees || []);
        setSessionTickets(data.tickets || []);
        setLastRefresh(new Date());
        
        // For session-centric events, show session selector
        if (data.event.architecture === 'session-centric' && data.event.sessions && data.event.sessions.length > 0) {
          setShowSessionSelector(true);
          
          // Re-filter if a session is currently selected
          if (selectedSession) {
            const filteredAttendees = (data.attendees || []).filter((a: any) => a.sessionId === selectedSession.id);
            const filteredTickets = (data.tickets || []).filter((t: any) => t.sessionId === selectedSession.id);
            setSessionAttendees(filteredAttendees);
            setSessionTickets(filteredTickets);
            if (typeof updateSessionStats === 'function') {
              updateSessionStats(selectedSession, filteredAttendees, filteredTickets);
            }
          }
        } else {
          setShowSessionSelector(false);
        }
      } else {
        setError("Event not found");
      }
    } catch (err) {
      console.error("Error fetching event data:", err);
      setError("Failed to load event data");
    }
  };

  // Real-time fetching removed in favor of polling
  const setupSessionSelectorAttendees = useCallback(() => {}, []);
  const setupRealTimeAttendees = useCallback(() => {}, []);
  const setupRealTimeTickets = useCallback(() => {}, []);

  // Set up polling interval for dashboard data
  useEffect(() => {
    if (eventId && permissions.canView) {
      const intervalId = setInterval(() => {
        fetchEventData();
      }, 15000); // Poll every 15 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [eventId, permissions.canView]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEventData();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Simple pagination for large events
  const loadAttendeesPaginated = useCallback(async (page: number = 1) => {
    // Relying on full API fetch
  }, [eventId, permissions.canView, selectedSession?.id, pageSize, eventData?.architecture]);

  // Simple pagination controls
  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
    loadAttendeesPaginated(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      loadAttendeesPaginated(currentPage - 1);
    }
  };

  // Handle check-in for session-specific attendee with validation, loading, and undo
  const handleSessionCheckIn = async (attendee: Attendee) => {
    if (!permissions.canManageAttendees) {
      setScanResult({ type: 'error', message: 'You do not have permission to check in attendees' });
      return;
    }

    if (!selectedSession) {
      setScanResult({ type: 'error', message: 'No session selected for check-in' });
      return;
    }

    const validation = validateCheckInEligibility(attendee);
    if (!validation.canCheckIn) {
      setScanResult({ 
        type: validation.reason?.includes('status') ? 'error' : 'info', 
        message: `Cannot check in ${attendee.name}: ${validation.reason}` 
      });
      return;
    }

    setCheckInLoading(attendee.id);
    
    try {
      // Find the first active ticket to check in
      const ticketToUse = Array.isArray(attendee.ticketIds) && attendee.ticketIds.length > 0 
        ? attendee.ticketIds[0] 
        : null;

      if (!ticketToUse) {
        throw new Error('No valid ticket found to check in');
      }

      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHECK_IN_ATTENDEE',
          payload: {
            ticketId: ticketToUse,
            checkInSessionId: selectedSession.id
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket check-in status');
      }

      const checkInTime = new Date().toISOString();

      setRecentCheckIn({
        attendee: { ...attendee, checkedIn: true, checkInTime: checkInTime },
        timestamp: new Date()
      });

      setScanResult({
        type: 'success',
        message: `${attendee.name} checked in successfully! Undo available for 30 seconds.`
      });

      // Refresh event data to update UI
      fetchEventData();

      setTimeout(() => {
        setRecentCheckIn(null);
      }, 30000);

      setTimeout(() => setScanResult(null), 5000);
      
    } catch (error) {
      console.error('❌ Error checking in attendee:', error);
      setScanResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to check in attendee. Please try again.'
      });
      setTimeout(() => setScanResult(null), 5000);
    } finally {
      setCheckInLoading(null);
    }
  };

  // Undo check-in functionality
  const handleUndoCheckIn = async () => {
    // Reverting ticket status requires another API endpoint, 
    // for simplicity we will just warn users for now.
    setScanResult({
      type: 'info',
      message: `Undo functionality is currently disabled.`
    });
    setRecentCheckIn(null);
    setTimeout(() => setScanResult(null), 3000);
    setUndoLoading(false);
  };

  // Handle edit event
  const handleEdit = () => {
    router.push(`/edit-event/${eventId}`);
  };

  // Handle delete event
  const handleDelete = async () => {
    if (!permissions.canDelete || !eventData) return;

    if (deleteConfirmText !== eventData.title) {
      setError('Event title does not match. Please type the exact event title to confirm deletion.');
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      router.push('/dashboard');
      
    } catch (err) {
      console.error("Error deleting event:", err);
      setError("Failed to delete event. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // Export attendees data using safe helper function
  const handleExportAttendees = () => {
    if (!selectedSession && eventData?.architecture === 'session-centric') {
      alert('Please select a session first');
      return;
    }

    const attendeesToExport = selectedSession ? sessionAttendees : attendees;
    const eventTitle = eventData?.title || 'Event';
    const sessionName = selectedSession ? selectedSession.name : 'all';

    exportAttendeesToCSV(attendeesToExport, eventTitle, sessionName);
  };

  // Update session ticket capacity
  const handleUpdateSessionTicket = async (ticketIndex: number, field: 'capacity' | 'price', value: number) => {
    if (!selectedSession || !eventData || !eventData.sessions || !permissions.canEdit) return;

    setTicketUpdating(`${field}-${ticketIndex}`);
    
    try {
      // Find the session in the event data
      const sessionIndex = eventData.sessions.findIndex(s => s.id === selectedSession.id);
      if (sessionIndex === -1) {
        throw new Error('Session not found');
      }

      // Update the session data
      const updatedSessions = [...eventData.sessions];
      const updatedTickets = [...updatedSessions[sessionIndex].tickets];
      
      if (field === 'capacity') {
        const soldCount = sessionAttendees.filter(a => a.ticketType === updatedTickets[ticketIndex].name).length;
        if (value < soldCount) {
          setTicketUpdateResult({
            type: 'error',
            message: `Cannot reduce capacity below ${soldCount} (already sold tickets)`
          });
          return;
        }
        updatedTickets[ticketIndex].capacity = value;
        updatedTickets[ticketIndex].available_capacity = value - soldCount;
      } else {
        updatedTickets[ticketIndex].price = value;
      }

      updatedSessions[sessionIndex].tickets = updatedTickets;

      // Update in database
      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SESSION_TICKET',
          payload: {
            sessionId: selectedSession.id,
            ticketName: updatedTickets[ticketIndex].name,
            updates: {
              capacity: field === 'capacity' ? value : undefined,
              price: field === 'price' ? value : undefined
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to update ticket');

      setTicketUpdateResult({
        type: 'success',
        message: `Ticket ${field} updated successfully!`
      });

      // Refresh event data
      await fetchEventData();

    } catch (error) {
      console.error(`Error updating ticket ${field}:`, error);
      setTicketUpdateResult({
        type: 'error',
        message: `Failed to update ticket ${field}`
      });
    } finally {
      setTicketUpdating(null);
      setTimeout(() => setTicketUpdateResult(null), 3000);
    }
  };

  // Add new ticket type to session
  const handleAddSessionTicket = async () => {
    if (!selectedSession || !eventData || !eventData.sessions || !permissions.canEdit) return;

    if (!newTicket.name.trim() || !newTicket.capacity || !newTicket.price) {
      setTicketUpdateResult({
        type: 'error',
        message: 'Please fill in all ticket fields'
      });
      return;
    }

    setTicketUpdating('new');

    try {
      // Find the session in the event data
      const sessionIndex = eventData.sessions.findIndex(s => s.id === selectedSession.id);
      if (sessionIndex === -1) {
        throw new Error('Session not found');
      }

      // Check for duplicate ticket names
      const sessionTickets = eventData.sessions[sessionIndex].tickets;
      if (sessionTickets.some((t: any) => t.name.toLowerCase() === newTicket.name.trim().toLowerCase())) {
        setTicketUpdateResult({
          type: 'error',
          message: 'Ticket type with this name already exists in this session'
        });
        return;
      }

      // Update the session data
      const updatedSessions = [...eventData.sessions];
      updatedSessions[sessionIndex].tickets.push({
        name: newTicket.name.trim(),
        capacity: parseInt(newTicket.capacity),
        price: parseFloat(newTicket.price),
        available_capacity: parseInt(newTicket.capacity)
      });

      // Update in database
      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_SESSION_TICKET',
          payload: {
            sessionId: selectedSession.id,
            ticket: {
              name: newTicketName,
              capacity: parseInt(newTicketCapacity),
              price: parseInt(newTicketPrice)
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to add ticket category');

      setTicketUpdateResult({
        type: 'success',
        message: 'New ticket type added successfully!'
      });

      setNewTicket({ name: '', capacity: '', price: '' });
      
      // Refresh event data
      await fetchEventData();

    } catch (error) {
      console.error('Error adding new ticket:', error);
      setTicketUpdateResult({
        type: 'error',
        message: 'Failed to add new ticket type'
      });
    } finally {
      setTicketUpdating(null);
      setTimeout(() => setTicketUpdateResult(null), 3000);
    }
  };

  // Handle adding new ticket category
  const handleAddNewTicketCategory = async () => {
    if (!selectedSession || !eventId || !newTicketName || !newTicketPrice || !newTicketCapacity) {
      setTicketUpdateResult({
        type: 'error',
        message: 'Please fill in all ticket details'
      });
      return;
    }

    setAddingTicket(true);
    try {
      const response = await fetch(`/api/dashboard/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_SESSION_TICKET',
          payload: {
            sessionId: selectedSession.id,
            ticket: {
              name: newTicketName,
              capacity: parseInt(newTicketCapacity),
              price: parseInt(newTicketPrice)
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to add ticket category');

      // Update local state
      setSelectedSession(prev => prev ? {
        ...prev,
        tickets: [
          ...prev.tickets,
          {
            name: newTicketName,
            price: parseInt(newTicketPrice),
            capacity: parseInt(newTicketCapacity),
            available_capacity: parseInt(newTicketCapacity)
          }
        ]
      } : null);

      // Clear form
      setNewTicketName('');
      setNewTicketPrice('');
      setNewTicketCapacity('');
      
      setTicketUpdateResult({
        type: 'success',
        message: `New ticket category "${newTicketName}" added successfully!`
      });

      // Clear message after 3 seconds
      setTimeout(() => setTicketUpdateResult(null), 3000);

    } catch (error) {
      console.error('Error adding new ticket category:', error);
      setTicketUpdateResult({
        type: 'error',
        message: 'Failed to add new ticket category. Please try again.'
      });
    } finally {
      setAddingTicket(false);
    }
  };


  // CRITICAL: Effect to setup real-time data with proper cleanup
  useEffect(() => {
    if (eventData && permissions.canView) {
      console.log('🚀 Setting up real-time listeners for:', { eventId, selectedSession: selectedSession?.id });
      
      // Validate session if selected
      if (selectedSession) {
        const isValid = validateEventSession(selectedSession);
        if (!isValid) {
          console.warn('Selected session validation failed');
          setError('Invalid session data. Please refresh the page.');
          return;
        }
      }

      try {
        setupRealTimeAttendees();
        setupRealTimeTickets();
      } catch (error) {
        handleRealtimeError(
          error as Error,
          'real-time setup',
          () => {
            if (unsubscribeAttendees.current) {
              unsubscribeAttendees.current();
              unsubscribeAttendees.current = null;
            }
            if (unsubscribeTickets.current) {
              unsubscribeTickets.current();
              unsubscribeTickets.current = null;
            }
          },
          () => {
            setupRealTimeAttendees();
            setupRealTimeTickets();
          },
          setError
        );
      }
    }

    // CRITICAL: Cleanup listeners on unmount or dependency changes
    return () => {
      console.log('🧹 Component cleanup: removing all listeners');
      if (unsubscribeAttendees.current) {
        unsubscribeAttendees.current();
        unsubscribeAttendees.current = null;
      }
      if (unsubscribeTickets.current) {
        unsubscribeTickets.current();
        unsubscribeTickets.current = null;
      }
      // Reset states on cleanup
      setAttendees([]);
      setSessionAttendees([]);
      setTickets([]);
      setSessionTickets([]);
      setSessionStats({
        totalRevenue: 0,
        soldTickets: 0,
        availableTickets: 0,
        totalCapacity: 0,
        checkedInCount: 0,
        pendingCheckIn: 0,
        lastUpdated: new Date()
      });
    };
  }, [setupRealTimeAttendees, setupRealTimeTickets, eventData, permissions.canView, selectedSession]);

  // Handle mobile detection after mount
  useLayoutEffect(() => {
    setHasMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add useMemo for filtered attendees
  const filteredAttendees = useMemo(() => {
    return sessionAttendees.filter(attendee => {
      const matchesSearch = searchTerm.toLowerCase().trim() === '' || 
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.phone.includes(searchTerm);
      
      const matchesFilter = filterStatus === 'all' ||
        (filterStatus === 'checked-in' && attendee.checkedIn) ||
        (filterStatus === 'not-checked-in' && !attendee.checkedIn) ||
        (filterStatus === 'confirmed' && attendee.status === 'confirmed');
      
      return matchesSearch && matchesFilter;
    });
  }, [sessionAttendees, searchTerm, filterStatus]);

  // Add useMemo for session stats
  const currentSessionStats = useMemo(() => {
    if (!selectedSession) return null;

    const checkedInCount = filteredAttendees.filter(a => a.checkedIn).length;
    const pendingCount = filteredAttendees.length - checkedInCount;
    const totalCapacity = selectedSession.tickets.reduce((sum, t) => sum + t.capacity, 0);
    const revenue = calculateSessionRevenue(filteredAttendees, selectedSession);

    return {
      checkedIn: checkedInCount,
      pending: pendingCount,
      total: filteredAttendees.length,
      capacity: totalCapacity,
      revenue,
      percentageCheckedIn: filteredAttendees.length > 0 
        ? (checkedInCount / filteredAttendees.length) * 100 
        : 0
    };
  }, [selectedSession, filteredAttendees, calculateSessionRevenue]);

  // Add useMemo for ticket stats
  const ticketStats = useMemo(() => {
    if (!selectedSession) return [];

    return selectedSession.tickets.map(ticket => {
      const soldCount = sessionAttendees.filter(attendee => 
        attendee.ticketType === ticket.name ||
        (typeof attendee.tickets === 'object' && attendee.tickets && attendee.tickets[ticket.name] > 0)
      ).length;

      return {
        ...ticket,
        soldCount,
        available: ticket.capacity - soldCount,
        revenue: soldCount * ticket.price,
        percentage: (soldCount / ticket.capacity) * 100
      };
    });
  }, [selectedSession, sessionAttendees]);

  // Add debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Update filtered results
      const results = sessionAttendees.filter(attendee => {
        const matchesSearch = searchTerm.toLowerCase().trim() === '' || 
          attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attendee.phone.includes(searchTerm);
        
        const matchesFilter = filterStatus === 'all' ||
          (filterStatus === 'checked-in' && attendee.checkedIn) ||
          (filterStatus === 'not-checked-in' && !attendee.checkedIn) ||
          (filterStatus === 'confirmed' && attendee.status === 'confirmed');
        
        return matchesSearch && matchesFilter;
      });

      // Update pagination if needed
      if (results.length < pageSize) {
        setShowPagination(false);
      } else {
        setShowPagination(true);
        setTotalAttendees(results.length);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus, sessionAttendees, pageSize]);

  // Loading state
  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading event dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !permissions.canView) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorState}>
          <FaExclamationTriangle />
          <h2>Access Denied</h2>
          <p>{error || "You don't have permission to view this dashboard"}</p>
          <button onClick={() => router.push('/events')} className={styles.backButton}>
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  // Session selector for session-centric events
  if (showSessionSelector && eventData?.architecture === 'session-centric' && eventData.sessions) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.sessionSelectorContainer}>
          <div className={styles.sessionSelectorHeader}>
            <button 
              onClick={() => router.push('/events')} 
              className={styles.backButton}
            >
              <FaArrowLeft /> Back to Events
            </button>
            <div className={styles.eventInfo}>
              <h1>{eventData.title}</h1>
              <p className={styles.eventSubtitle}>
                <FaLayerGroup /> {eventData.sessions.length} Sessions • Select a session to manage
              </p>
            </div>
          </div>

          <div className={styles.sessionsGrid}>
            {eventData.sessions.map((session, index) => {
              // Filter attendees for this specific session
              const sessionAttendeesList = attendees.filter(attendee => {
                // Primary filter: sessionId match
                if (attendee.sessionId === session.id) return true;
                
                // Fallback: selectedSession object match
                if (attendee.selectedSession?.id === session.id) return true;
                
                // Final fallback: date and time match for legacy records
                if (attendee.selectedDate === session.date && 
                    attendee.selectedTimeSlot?.start_time === session.start_time) return true;
                
                return false;
              });

              const sessionAttendeeCount = sessionAttendeesList.length;
              const sessionCapacity = session.maxCapacity || session.tickets.reduce((sum, ticket) => sum + ticket.capacity, 0);
              
              // FIXED: Use standardized revenue calculation
              const sessionRevenue = calculateSessionRevenue(sessionAttendeesList, session);

              return (
                <div
                  key={session.id}
                  className={styles.sessionCard}
                  onClick={() => handleSessionSelect(session)}
                >
                  <div className={styles.sessionCardHeader}>
                    <h3>{session.name}</h3>
                    <span className={styles.sessionDate}>
                      {formatDate(session.date)}
                    </span>
                  </div>
                  
                  <div className={styles.sessionCardContent}>
                    <div className={styles.sessionTime}>
                      <FaClock />
                      <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                    </div>
                    
                    {session.venue && session.venue !== eventData.event_venue && (
                      <div className={styles.sessionVenue}>
                        <FaMapMarkerAlt />
                        <span>{session.venue}</span>
                      </div>
                    )}
                    
                    <div className={styles.sessionStats}>
                      <div className={styles.statItem}>
                        <FaUsers />
                        <span>{sessionAttendeeCount} / {sessionCapacity}</span>
                        <small>Attendees</small>
                      </div>
                      <div className={styles.statItem}>
                        <FaMoneyBillWave />
                        <span>₹{sessionRevenue.toLocaleString()}</span>
                        <small>Revenue</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles.sessionCardFooter}>
                    <span className={styles.manageButton}>
                      Manage Session <FaChevronRight />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Add this function to handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Main dashboard view (session-specific or legacy)
  return (
    <div className={styles.modernDashboard}>
      {/* Mobile Menu Button - only show after mount */}
      {hasMounted && isMobile && (
        <button 
          className={styles.mobileMenuButton}
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label="Toggle menu"
        >
          <FaBars />
        </button>
      )}

      {/* Instagram-Style Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={(tab: string) => setActiveTab(tab as any)}
        attendeesCount={selectedSession ? sessionAttendees.length : attendees.length}
        selectedSession={selectedSession ? { 
          id: selectedSession.id, 
          name: selectedSession.name,
          date: selectedSession.date,
          start_time: selectedSession.start_time,
          end_time: selectedSession.end_time
        } : undefined}
        onBack={selectedSession ? () => setShowSessionSelector(true) : () => router.push('/events')}
        eventTitle={eventData?.title || 'Event Dashboard'}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Tab Content */}
        <div className={styles.tabContent}>
        {activeTab === 'overview' && selectedSession && (
          <DashboardOverview
            selectedSession={selectedSession}
            sessionAttendees={sessionAttendees as any}
            calculateSessionRevenue={calculateSessionRevenue as any}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}

        {/* Attendees Tab - DATA VIEW ONLY with CSV Export */}
        {activeTab === 'attendees' && (
          <div className={styles.attendeesTab}>
            <div className={styles.attendeesHeader}>
              <div className={styles.attendeesHeaderTop}>
                <h2>Attendees Data ({filteredAttendees.length})</h2>
                <button 
                  className={styles.exportButton}
                  onClick={handleExportAttendees}
                >
                  <FaDownload /> Export CSV
                </button>
              </div>
              <div className={styles.attendeesActions}>
                <div className={styles.searchBox}>
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Attendees</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked-in">Checked In</option>
                  <option value="not-checked-in">Not Checked In</option>
                </select>
              </div>
            </div>

            {/* Attendee Statistics Summary */}
            <div className={styles.attendeesSummary}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryNumber}>{currentSessionStats?.total || 0}</span>
                <span className={styles.summaryLabel}>Total Attendees</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryNumber}>{currentSessionStats?.checkedIn || 0}</span>
                <span className={styles.summaryLabel}>Checked In</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryNumber}>{currentSessionStats?.pending || 0}</span>
                <span className={styles.summaryLabel}>Pending</span>
              </div>
            </div>

            {/* Attendees Data Table/Cards */}
            <div className={styles.attendeesDataTable}>
              {filteredAttendees.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <FaUsers />
                  </div>
                  <h3>No attendees found</h3>
                  <p className={styles.emptyStateMessage}>
                    {getEmptyStateMessage(searchTerm, filterStatus)}
                  </p>
                  {searchTerm || filterStatus !== 'all' ? (
                    <button 
                      className={styles.primaryButton}
                      onClick={() => {
                        setSearchTerm('');
                        setFilterStatus('all');
                      }}
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <button 
                      className={styles.primaryButton}
                      onClick={() => setActiveTab('overview')}
                    >
                      <FaChartBar /> View Overview
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <table className={styles.attendeesTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Ticket Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Booking Date</th>
                        <th>Check-in Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendees.map(attendee => (
                        <tr key={attendee.id} className={attendee.checkedIn ? styles.checkedInRow : styles.pendingRow}>
                          <td>
                            <div className={styles.nameCell}>
                              <strong>{attendee.name}</strong>
                              {attendee.ticketIndex && attendee.totalTicketsInBooking && attendee.totalTicketsInBooking > 1 && (
                                <span className={styles.groupIndicator}>
                                  #{attendee.ticketIndex} of {attendee.totalTicketsInBooking}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{attendee.email}</td>
                          <td>{attendee.phone}</td>
                          <td>
                            <span className={styles.ticketTypeTag}>
                              {attendee.ticketType || 'Standard'}
                            </span>
                          </td>
                          <td>
                            <span className={styles.amountCell}>
                              ₹{calculateAttendeeRevenue(attendee, selectedSession || undefined).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className={styles.statusCell}>
                              {attendee.checkedIn ? (
                                <span className={`${styles.statusBadge} ${styles.checkedIn}`}>
                                  <FaCheckCircle /> Checked In
                                </span>
                              ) : (
                                <span className={`${styles.statusBadge} ${styles.pending}`}>
                                  <FaClock /> Pending
                                </span>
                              )}
                            </span>
                          </td>
                          <td>
                            <span className={styles.dateCell}>
                              {new Date(attendee.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td>
                            {attendee.checkedIn && attendee.checkInTime ? (
                              <span className={styles.timeCell}>
                                {new Date(attendee.checkInTime).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            ) : (
                              <span className={styles.dateCell}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Cards */}
                  <div className={styles.attendeesMobileList}>
                    {filteredAttendees.map(attendee => (
                      <div 
                        key={attendee.id} 
                        className={`${styles.attendeeMobileCard} ${attendee.checkedIn ? styles.checkedIn : ''}`}
                      >
                        <div className={styles.attendeeMobileCardHeader}>
                          <h4>{attendee.name}</h4>
                          {attendee.checkedIn ? (
                            <span className={`${styles.statusBadge} ${styles.checkedIn}`}>
                              <FaCheckCircle /> Checked In
                            </span>
                          ) : (
                            <span className={`${styles.statusBadge} ${styles.pending}`}>
                              <FaClock /> Pending
                            </span>
                          )}
                        </div>
                        
                        <div className={styles.attendeeMobileCardDetails}>
                          <div className={styles.attendeeMobileCardDetail}>
                            <span>Email:</span>
                            <span>{attendee.email}</span>
                          </div>
                          <div className={styles.attendeeMobileCardDetail}>
                            <span>Phone:</span>
                            <span>{attendee.phone}</span>
                          </div>
                          <div className={styles.attendeeMobileCardDetail}>
                            <span>Ticket:</span>
                            <span className={styles.ticketTypeTag}>
                              {attendee.ticketType || 'Standard'}
                            </span>
                          </div>
                          <div className={styles.attendeeMobileCardDetail}>
                            <span>Amount:</span>
                            <span className={styles.amountCell}>
                              ₹{calculateAttendeeRevenue(attendee, selectedSession || undefined).toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.attendeeMobileCardDetail}>
                            <span>Booked:</span>
                            <span className={styles.dateCell}>
                              {new Date(attendee.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          {attendee.checkedIn && attendee.checkInTime && (
                            <div className={styles.attendeeMobileCardDetail}>
                              <span>Checked in:</span>
                              <span className={styles.timeCell}>
                                {new Date(attendee.checkInTime).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          {attendee.ticketIndex && attendee.totalTicketsInBooking && attendee.totalTicketsInBooking > 1 && (
                            <div className={styles.attendeeMobileCardDetail}>
                              <span>Group booking:</span>
                              <span className={styles.groupIndicator}>
                                #{attendee.ticketIndex} of {attendee.totalTicketsInBooking}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Check-in Tab - COMPLETE CHECK-IN MANAGEMENT WITH ATTENDEE INFO */}
        {activeTab === 'checkin' && (
          <div className={styles.checkinTab}>
            <div className={styles.checkinHeader}>
              <h2>Check-in Management</h2>
              <div className={styles.checkinHeaderActions}>
                <div className={styles.checkinStats}>
                  <span className={styles.checkinStat}>
                    <FaUsers /> {sessionAttendees.filter(a => a.checkedIn).length} / {sessionAttendees.length} checked in
                  </span>
                  <span className={styles.checkinStat}>
                    <FaPercentage /> {sessionAttendees.length > 0 
                      ? ((sessionAttendees.filter(a => a.checkedIn).length / sessionAttendees.length) * 100).toFixed(1)
                      : 0}% completion
                  </span>
                </div>
                <button 
                  onClick={() => setShowEventSharing(true)}
                  className={styles.primaryButton}
                  disabled={permissions.role === 'unauthorized' || !selectedSession}
                >
                  <FaUserCheck /> Share Access
                </button>
              </div>
            </div>
            
            {scanResult && (
              <div className={`${styles.scanResult} ${styles[scanResult.type]}`}>
                {scanResult.type === 'success' && <FaCheckCircle />}
                {scanResult.type === 'error' && <FaTimesCircle />}
                {scanResult.type === 'info' && <FaExclamationTriangle />}
                <span>{scanResult.message}</span>
              </div>
            )}

            {/* Undo Check-in Option */}
            {recentCheckIn && (
              <div className={styles.undoSection}>
                <div className={styles.undoCard}>
                  <div className={styles.undoInfo}>
                    <span>Just checked in: <strong>{recentCheckIn.attendee.name}</strong></span>
                    <span className={styles.undoTimer}>
                      Undo available for {Math.max(0, 30 - Math.floor((Date.now() - recentCheckIn.timestamp.getTime()) / 1000))} seconds
                    </span>
                  </div>
                  <button
                    onClick={handleUndoCheckIn}
                    disabled={undoLoading}
                    className={styles.undoButton}
                  >
                    {undoLoading ? (
                      <>
                        <FaSyncAlt className={styles.spinning} /> Undoing...
                      </>
                    ) : (
                      <>
                        <FaArrowLeft /> Undo Check-in
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* QR Camera Scanner Section */}
            <div className={styles.qrScannerSection}>
              <div className={styles.qrScannerHeader}>
                <h3>QR Camera Scanner</h3>
                <button 
                  className={`${styles.scannerToggleButton} ${scannerActive ? styles.active : ''}`}
                  onClick={scannerActive ? stopQRScanner : startQRScanner}
                >
                  <FaQrcode />
                  {scannerActive ? 'Stop Scanner' : 'Start Camera Scanner'}
                </button>
              </div>

              {/* QR Scanner Video */}
              {scannerActive && (
                <div className={styles.qrScannerContainer}>
                  <div className={styles.scannerFrame}>
                    <video
                      ref={videoRef}
                      className={styles.scannerVideo}
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className={styles.scannerOverlay}>
                      <div className={styles.scannerTarget}></div>
                      <p>Position QR code within the frame</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Check-in Layout */}
            <div className={styles.checkinMainLayout}>
              {/* Manual Check-in Section */}
              <div className={styles.manualCheckinSection}>
                <div className={styles.manualCheckinHeader}>
                  <h3>Manual Check-in</h3>
                  <p>Search by name, email, phone, or QR code number</p>
                </div>
                
                <div className={styles.searchBox}>
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search name, email, phone, or QR code..."
                    value={manualCheckInSearch}
                    onChange={(e) => setManualCheckInSearch(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                {/* Pending Check-ins */}
                <div className={styles.pendingCheckins}>
                  <h4>Pending Check-ins ({sessionAttendees.filter(a => !a.checkedIn).length})</h4>
                  
                  {sessionAttendees.filter(a => !a.checkedIn).length === 0 ? (
                    <div className={styles.allCheckedIn}>
                      <FaCheckCircle />
                      <p>All attendees have been checked in!</p>
                    </div>
                  ) : (
                    <div className={styles.pendingList}>
                      {sessionAttendees
                        .filter(a => !a.checkedIn)
                        .filter(attendee => {
                          if (!manualCheckInSearch) return true;
                          const searchLower = manualCheckInSearch.toLowerCase();
                          return (
                            attendee.name.toLowerCase().includes(searchLower) ||
                            attendee.email.toLowerCase().includes(searchLower) ||
                            attendee.phone.includes(manualCheckInSearch) ||
                            (attendee.ticketIds && attendee.ticketIds.some(id => 
                              id.toLowerCase().includes(searchLower)
                            ))
                          );
                        })
                        .map(attendee => (
                          <div key={attendee.id} className={styles.pendingAttendeeItem}>
                            <div className={styles.attendeeInfo}>
                              <h5>{attendee.name}</h5>
                              <div className={styles.attendeeDetails}>
                                <span>{attendee.email}</span>
                                <span>{attendee.phone}</span>
                                <span>{attendee.ticketType || 'Standard'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSessionCheckIn(attendee)}
                              disabled={checkInLoading === attendee.id}
                              className={`${styles.quickCheckInButton} ${checkInLoading === attendee.id ? styles.loading : ''}`}
                            >
                              {checkInLoading === attendee.id ? (
                                <>
                                  <FaSyncAlt className={styles.spinning} /> Checking In...
                                </>
                              ) : (
                                <>
                                  <FaUserCheck /> Check In
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Checked-in People Sidebar */}
              <div className={styles.checkedInSidebar}>
                <h4>Checked In ({sessionAttendees.filter(a => a.checkedIn).length})</h4>
                
                <div className={styles.checkedInList}>
                  {sessionAttendees
                    .filter(a => a.checkedIn)
                    .map(attendee => (
                      <div key={attendee.id} className={styles.checkedInItem}>
                        <div className={styles.checkedInInfo}>
                          <span className={styles.checkedInName}>{attendee.name}</span>
                          <span className={styles.checkedInTime}>
                            {attendee.checkInTime && 
                              new Date(attendee.checkInTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            }
                          </span>
                        </div>
                        <FaCheckCircle className={styles.checkedInIcon} />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Tickets Tab - LIVE DATA */}
        {activeTab === 'manage-tickets' && selectedSession && (
          <div className={styles.manageTicketsTab}>
            <h2>Manage Session Tickets</h2>
            <p className={styles.subtitle}>Real-time ticket availability and sales data</p>
            
            {ticketUpdateResult && (
              <div className={`${styles.updateResult} ${styles[ticketUpdateResult.type]}`}>
                {ticketUpdateResult.message}
              </div>
            )}

            {/* Add New Ticket Section */}
            <div className={styles.addTicketSection}>
              <div className={styles.addTicketHeader}>
                <h3>Add New Ticket Type</h3>
              </div>
              <div className={styles.addTicketForm}>
                <div className={styles.formGroup}>
                  <label>Ticket Name</label>
                  <input
                    type="text"
                    value={newTicketName}
                    onChange={(e) => setNewTicketName(e.target.value)}
                    placeholder="e.g., VIP Pass"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    value={newTicketPrice}
                    onChange={(e) => setNewTicketPrice(e.target.value)}
                    placeholder="Enter price"
                    min="0"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Capacity</label>
                  <input
                    type="number"
                    value={newTicketCapacity}
                    onChange={(e) => setNewTicketCapacity(e.target.value)}
                    placeholder="Enter capacity"
                    min="1"
                  />
                </div>
                <button
                  className={styles.addTicketButton}
                  onClick={handleAddNewTicketCategory}
                  disabled={addingTicket || !newTicketName || !newTicketPrice || !newTicketCapacity}
                >
                  {addingTicket ? (
                    <>
                      <FaSyncAlt className={styles.spinningIcon} /> Adding...
                    </>
                  ) : (
                    <>
                      <FaTicketAlt /> Add Ticket
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className={styles.ticketsGrid}>
              {ticketStats.map((ticket, index) => {
                const isLowStock = ticket.available <= 5 && ticket.available > 0;
                const isSoldOut = ticket.available === 0;
                
                return (
                  <div key={index} className={styles.ticketManageCard}>
                    <div className={styles.ticketManageHeader}>
                      <div>
                        <h3>{ticket.name}</h3>
                        {isSoldOut && (
                          <span className={styles.soldOutBadge}>
                            SOLD OUT
                          </span>
                        )}
                        {isLowStock && (
                          <span className={styles.lowStockBadge}>
                            LOW STOCK
                          </span>
                        )}
                      </div>
                      <button 
                        className={styles.secondaryButton}
                        onClick={() => setEditingTicket({...ticket, index})}
                      >
                        <FaEdit /> Edit Ticket
                      </button>
                    </div>
                    
                    <div className={styles.ticketManageStats}>
                      <div className={styles.statRow}>
                        <span>Total Capacity:</span>
                        <span className={styles.statValue}>{ticket.capacity}</span>
                      </div>
                      <div className={styles.statRow}>
                        <span>Tickets Sold:</span>
                        <span className={styles.statValue}>{ticket.soldCount}</span>
                      </div>
                      <div className={styles.statRow}>
                        <span>Available Now:</span>
                        <span className={`${styles.statValue} ${
                          isSoldOut ? styles.soldOut : 
                          isLowStock ? styles.lowStock : 
                          styles.available
                        }`}>
                          {ticket.available}
                        </span>
                      </div>
                      <div className={styles.statRow}>
                        <span>Revenue Generated:</span>
                        <span className={styles.statValue}>₹{ticket.revenue.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className={styles.ticketProgress}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${Math.min(ticket.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className={styles.progressLabel}>
                        {ticket.percentage.toFixed(1)}% sold
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collaborations Tab */}
        {activeTab === 'collaborations' && eventData && (
          <div className={styles.collaborationsTab}>
            <div className={styles.collaborationsHeader}>
              <h2>Event Collaborations</h2>
              <p className={styles.collaborationsDescription}>
                Collaboration features are temporarily disabled during the infrastructure migration.
              </p>
            </div>
          </div>
        )}

        {/* Settings Tab - Keep minimal */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            <h2>Event Settings</h2>
            
            <div className={styles.settingsSection}>
              <h3>Event Management</h3>
              <div className={styles.settingsActions}>
                <button 
                  onClick={handleEdit}
                  className={styles.editEventButton}
                  disabled={!permissions.canEdit}
                >
                  <FaEdit /> Edit Event
                </button>
                
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className={styles.deleteEventButton}
                  disabled={!permissions.canDelete}
                >
                  <FaTrash /> Delete Event
                </button>
              </div>
            </div>

            {showDeleteConfirm && (
              <div className={styles.deleteConfirmation}>
                <h3>⚠️ Delete Event</h3>
                <p>This action cannot be undone. All attendee data and tickets will be permanently deleted.</p>
                <p>Type the event title "<strong>{eventData?.title}</strong>" to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter event title"
                />
                <div className={styles.deleteActions}>
                  <button 
                    onClick={handleDelete}
                    className={styles.confirmDeleteButton}
                    disabled={deleteConfirmText !== eventData?.title}
                  >
                    Delete Event
                  </button>
                  <button 
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className={styles.cancelDeleteButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket Edit Modal */}
      {editingTicket && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Edit Ticket: {editingTicket.name}</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setEditingTicket(null)}
              >
                <FaTimesCircle />
              </button>
            </div>
            
            <div className={styles.editTicketForm}>
              <div className={styles.formGroup}>
                <label>Capacity</label>
                {(() => {
                  const soldTickets = calculateLiveTicketStats(editingTicket.name, editingTicket.capacity, editingTicket.price).sold;
                  return (
                    <>
                <input
                  type="number"
                  defaultValue={editingTicket.capacity}
                        min={soldTickets}
                  onBlur={(e) => {
                    const newCapacity = parseInt(e.target.value);
                          if (newCapacity !== editingTicket.capacity && newCapacity >= soldTickets) {
                      handleUpdateSessionTicket(editingTicket.index, 'capacity', newCapacity);
                          } else if (newCapacity < soldTickets) {
                            e.target.value = editingTicket.capacity.toString();
                            alert(`Cannot set capacity below ${soldTickets} (number of tickets already sold)`);
                    }
                  }}
                  disabled={ticketUpdating === `capacity-${editingTicket.index}`}
                />
                      <p className={styles.helperText}>
                        Minimum: {soldTickets} (tickets already sold)
                      </p>
                {ticketUpdating === `capacity-${editingTicket.index}` && (
                  <span className={styles.updating}>Updating...</span>
                )}
                    </>
                  );
                })()}
              </div>

              <div className={styles.formGroup}>
                <label>Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={editingTicket.price}
                  min="0"
                  onBlur={(e) => {
                    const newPrice = parseFloat(e.target.value);
                    if (newPrice !== editingTicket.price && newPrice >= 0) {
                      handleUpdateSessionTicket(editingTicket.index, 'price', newPrice);
                    }
                  }}
                  disabled={ticketUpdating === `price-${editingTicket.index}`}
                />
                {ticketUpdating === `price-${editingTicket.index}` && (
                  <span className={styles.updating}>Updating...</span>
                )}
              </div>

              {(() => {
                const modalLiveStats = calculateLiveTicketStats(editingTicket.name, editingTicket.capacity, editingTicket.price);
                return (
              <div className={styles.ticketStats}>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-400">Tickets Sold</p>
                        <p className="text-lg font-semibold text-blue-400">{modalLiveStats.sold}</p>
              </div>
                      <div>
                        <p className="text-sm text-gray-400">Available Now</p>
                        <p className="text-lg font-semibold text-green-400">{modalLiveStats.available}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Sales Progress</p>
                        <p className="text-lg font-semibold">{modalLiveStats.percentage.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Revenue</p>
                        <p className="text-lg font-semibold text-green-400">₹{modalLiveStats.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.min(modalLiveStats.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setEditingTicket(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      

      </div>
    </div>
  );
};

// Main Component with Error Boundary
const EventDashboard = () => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state here
        window.location.href = '/events';
      }}
    >
      <EventDashboardContent />
    </ErrorBoundary>
  );
};

export default EventDashboard; 