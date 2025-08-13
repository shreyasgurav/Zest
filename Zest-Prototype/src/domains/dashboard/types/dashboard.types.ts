export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface Attendee {
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

export interface Ticket {
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
  selectedTimeSlot: TimeSlot;
  amount: number;
  bookingId: string;
}

export interface EventSession {
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

export interface EventData {
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

export interface DashboardPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageAttendees: boolean;
  canViewFinancials: boolean;
  canSendCommunications: boolean;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'unauthorized';
}

export interface SessionStats {
  totalRevenue: number;
  soldTickets: number;
  availableTickets: number;
  totalCapacity: number;
  checkedInCount: number;
  pendingCheckIn: number;
  lastUpdated: Date;
}

export interface TicketStats {
  name: string;
  capacity: number;
  price: number;
  soldCount: number;
  available: number;
  revenue: number;
  percentage: number;
}

export interface FilterOptions {
  searchTerm: string;
  filterStatus: 'all' | 'confirmed' | 'pending' | 'checked-in' | 'not-checked-in';
  sortBy: 'name' | 'date' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface UIState {
  activeTab: 'overview' | 'attendees' | 'checkin' | 'settings' | 'manage-tickets' | 'collaborations';
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
  showSessionSelector: boolean;
  isMobile: boolean;
  hasMounted: boolean;
}

export interface CheckInState {
  scannerActive: boolean;
  scanResult: {
    type: 'success' | 'error' | 'info';
    message: string;
  } | null;
  showManualCheckIn: boolean;
  manualCheckInSearch: string;
  checkInLoading: string | null;
  recentCheckIn: {
    attendee: Attendee;
    timestamp: Date;
  } | null;
  undoLoading: boolean;
  qrScannerSupported: boolean;
}

export interface TicketManagementState {
  editingTicket: any | null;
  newTicket: {
    name: string;
    capacity: string;
    price: string;
  };
  ticketUpdating: string | null;
  ticketUpdateResult: {
    type: 'success' | 'error' | 'info';
    message: string;
  } | null;
  addingTicket: boolean;
}

export type TabType = 'overview' | 'attendees' | 'checkin' | 'manage-tickets' | 'collaborations' | 'settings'; 