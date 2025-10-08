'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  EventData, 
  EventSession, 
  Attendee, 
  Ticket, 
  DashboardPermissions, 
  SessionStats, 
  FilterOptions, 
  UIState, 
  CheckInState, 
  TicketManagementState,
  TabType 
} from '../types/dashboard.types';

// Enhanced Dashboard State
export interface DashboardState {
  // Event Data
  eventData: EventData | null;
  selectedSession: EventSession | null;
  sessionStats: SessionStats;
  
  // Attendees
  attendees: Attendee[];
  sessionAttendees: Attendee[];
  filteredAttendees: Attendee[];
  
  // Tickets
  tickets: Ticket[];
  sessionTickets: Ticket[];
  
  // UI State
  ui: UIState;
  
  // Filters
  filters: FilterOptions;
  
  // Check-in State
  checkIn: CheckInState;
  
  // Ticket Management State
  ticketManagement: TicketManagementState;
  
  // Permissions
  permissions: DashboardPermissions;
}

export type DashboardAction = 
  | { type: 'SET_EVENT_DATA'; payload: EventData | null }
  | { type: 'SET_SELECTED_SESSION'; payload: EventSession | null }
  | { type: 'SET_SESSION_STATS'; payload: SessionStats }
  | { type: 'SET_ATTENDEES'; payload: Attendee[] }
  | { type: 'SET_SESSION_ATTENDEES'; payload: Attendee[] }
  | { type: 'SET_FILTERED_ATTENDEES'; payload: Attendee[] }
  | { type: 'SET_TICKETS'; payload: Ticket[] }
  | { type: 'SET_SESSION_TICKETS'; payload: Ticket[] }
  | { type: 'SET_ACTIVE_TAB'; payload: TabType }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_FILTER_STATUS'; payload: FilterOptions['filterStatus'] }
  | { type: 'SET_FILTERS'; payload: FilterOptions }
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'SET_CHECKIN_STATE'; payload: Partial<CheckInState> }
  | { type: 'SET_TICKET_MANAGEMENT_STATE'; payload: Partial<TicketManagementState> }
  | { type: 'SET_PERMISSIONS'; payload: DashboardPermissions }
  | { type: 'RESET_STATE' };

const initialState: DashboardState = {
  eventData: null,
  selectedSession: null,
  sessionStats: {
    totalRevenue: 0,
    soldTickets: 0,
    availableTickets: 0,
    totalCapacity: 0,
    checkedInCount: 0,
    pendingCheckIn: 0,
    lastUpdated: new Date()
  },
  attendees: [],
  sessionAttendees: [],
  filteredAttendees: [],
  tickets: [],
  sessionTickets: [],
  ui: {
    activeTab: 'overview',
    sidebarOpen: false,
    loading: true,
    error: null,
    showSessionSelector: true,
    isMobile: false,
    hasMounted: false
  },
  filters: {
    searchTerm: '',
    filterStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  },
  checkIn: {
    scannerActive: false,
    scanResult: null,
    showManualCheckIn: false,
    manualCheckInSearch: '',
    checkInLoading: null,
    recentCheckIn: null,
    undoLoading: false,
    qrScannerSupported: false
  },
  ticketManagement: {
    editingTicket: null,
    newTicket: {
      name: '',
      capacity: '',
      price: ''
    },
    ticketUpdating: null,
    ticketUpdateResult: null,
    addingTicket: false
  },
  permissions: {
    canView: false,
    canEdit: false,
    canDelete: false,
    canManageAttendees: false,
    canViewFinancials: false,
    canSendCommunications: false,
    role: 'unauthorized'
  }
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_EVENT_DATA':
      return { ...state, eventData: action.payload };
    case 'SET_SELECTED_SESSION':
      return { ...state, selectedSession: action.payload };
    case 'SET_SESSION_STATS':
      return { ...state, sessionStats: action.payload };
    case 'SET_ATTENDEES':
      return { ...state, attendees: action.payload };
    case 'SET_SESSION_ATTENDEES':
      return { ...state, sessionAttendees: action.payload };
    case 'SET_FILTERED_ATTENDEES':
      return { ...state, filteredAttendees: action.payload };
    case 'SET_TICKETS':
      return { ...state, tickets: action.payload };
    case 'SET_SESSION_TICKETS':
      return { ...state, sessionTickets: action.payload };
    case 'SET_ACTIVE_TAB':
      return { 
        ...state, 
        ui: { ...state.ui, activeTab: action.payload }
      };
    case 'SET_SIDEBAR_OPEN':
      return { 
        ...state, 
        ui: { ...state.ui, sidebarOpen: action.payload }
      };
    case 'SET_LOADING':
      return { 
        ...state, 
        ui: { ...state.ui, loading: action.payload }
      };
    case 'SET_ERROR':
      return { 
        ...state, 
        ui: { ...state.ui, error: action.payload }
      };
    case 'SET_SEARCH_TERM':
      return { 
        ...state, 
        filters: { ...state.filters, searchTerm: action.payload }
      };
    case 'SET_FILTER_STATUS':
      return { 
        ...state, 
        filters: { ...state.filters, filterStatus: action.payload }
      };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'SET_UI_STATE':
      return { 
        ...state, 
        ui: { ...state.ui, ...action.payload }
      };
    case 'SET_CHECKIN_STATE':
      return { 
        ...state, 
        checkIn: { ...state.checkIn, ...action.payload }
      };
    case 'SET_TICKET_MANAGEMENT_STATE':
      return { 
        ...state, 
        ticketManagement: { ...state.ticketManagement, ...action.payload }
      };
    case 'SET_PERMISSIONS':
      return { ...state, permissions: action.payload };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

interface DashboardContextValue {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}; 