'use client';

import { useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { db } from '@/infrastructure/firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { DashboardSecurity } from '@/shared/utils/security/dashboardSecurity';
import { useDashboard } from '../contexts/DashboardContext';
import { EventData, Attendee, Ticket } from '../types/dashboard.types';

export const useDashboardData = () => {
  const { state, dispatch } = useDashboard();
  const params = useParams<{ id: string }>();
  const auth = getAuth();
  const eventId = params?.id;

  // Initialize dashboard
  const initializeDashboard = useCallback(async () => {
    if (!eventId) {
      dispatch({ type: 'SET_ERROR', payload: 'No event ID provided' });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await checkAuthorization();
      await fetchEventData();
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load dashboard' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [eventId]);

  // Check user authorization
  const checkAuthorization = useCallback(async () => {
    if (!auth.currentUser || !eventId) {
      dispatch({ type: 'SET_ERROR', payload: 'Please sign in to access this dashboard' });
      return;
    }

    try {
      const dashboardPermissions = await DashboardSecurity.verifyDashboardAccess(
        eventId, 
        auth.currentUser.uid
      );
      
      dispatch({ type: 'SET_PERMISSIONS', payload: dashboardPermissions });
      
      if (!dashboardPermissions.canView) {
        dispatch({ type: 'SET_ERROR', payload: 'You do not have permission to view this event dashboard' });
      }
    } catch (err) {
      console.error("Error checking authorization:", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to verify permissions' });
    }
  }, [auth.currentUser, eventId]);

  // Fetch event data
  const fetchEventData = useCallback(async () => {
    if (!eventId) return;

    try {
      const eventDoc = await getDoc(doc(db(), "events", eventId));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        
        // Transform the data to match EventData interface
        const eventData: EventData = {
          id: eventDoc.id,
          title: data.title || '',
          event_image: data.event_image || undefined,
          organizationId: data.organizationId || '',
          event_type: data.event_type || 'event',
          architecture: data.architecture || 'legacy',
          sessions: data.sessions || [],
          venue_type: data.venue_type || 'global',
          total_sessions: data.total_sessions || 0,
          total_capacity: data.total_capacity || 0,
          time_slots: data.time_slots || [],
          tickets: data.tickets || [],
          event_venue: data.event_venue || '',
          about_event: data.about_event || '',
          hosting_club: data.hosting_club || '',
          organization_username: data.organization_username || '',
          event_category: data.event_categories?.[0] || '',
          event_languages: data.event_languages || '',
          event_duration: data.event_duration || '',
          event_age_limit: data.event_age_limit || ''
        };
        
        dispatch({ type: 'SET_EVENT_DATA', payload: eventData });
      } else {
        dispatch({ type: 'SET_ERROR', payload: "Event not found" });
      }
    } catch (err) {
      console.error("Error fetching event data:", err);
      dispatch({ type: 'SET_ERROR', payload: "Failed to load event data" });
    }
  }, [eventId]);

  // Set up real-time attendees listener
  const setupAttendeesListener = useCallback(() => {
    if (!eventId || !state.permissions.canView) return;

    const attendeesRef = collection(db(), 'eventAttendees');
    let attendeesQuery;

    if (state.selectedSession && state.eventData?.architecture === 'session-centric') {
      attendeesQuery = query(
        attendeesRef,
        where('eventId', '==', eventId),
        where('sessionId', '==', state.selectedSession.id),
        orderBy('createdAt', 'desc')
      );
    } else {
      attendeesQuery = query(
        attendeesRef,
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(
      attendeesQuery,
      (snapshot) => {
        const attendeesList: Attendee[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            tickets: data.tickets || 0,
            selectedDate: data.selectedDate || '',
            selectedTimeSlot: data.selectedTimeSlot || { start_time: '', end_time: '' },
            selectedSession: data.selectedSession || undefined,
            sessionId: data.sessionId || undefined,
            createdAt: data.createdAt || '',
            status: data.status || 'confirmed',
            paymentStatus: data.paymentStatus || 'paid',
            checkedIn: data.checkedIn || false,
            checkInTime: data.checkInTime || undefined,
            ticketIds: data.ticketIds || undefined,
            userId: data.userId || undefined,
            eventId: data.eventId || undefined,
            ticketType: data.ticketType || undefined,
            ticketIndex: data.ticketIndex || undefined,
            totalTicketsInBooking: data.totalTicketsInBooking || undefined,
            individualAmount: data.individualAmount || undefined,
            originalBookingData: data.originalBookingData || undefined,
            attendeeId: data.attendeeId || undefined,
            canCheckInIndependently: data.canCheckInIndependently || undefined,
            checkInMethod: data.checkInMethod || undefined,
            checkedInBy: data.checkedInBy || undefined
          };
        });
        
        if (state.selectedSession && state.eventData?.architecture === 'session-centric') {
          dispatch({ type: 'SET_SESSION_ATTENDEES', payload: attendeesList });
        } else {
          dispatch({ type: 'SET_ATTENDEES', payload: attendeesList });
          dispatch({ type: 'SET_SESSION_ATTENDEES', payload: attendeesList });
        }
      },
      (error) => {
        console.error("Error in attendees listener:", error);
        dispatch({ type: 'SET_ERROR', payload: `Failed to load attendees: ${error.message}` });
      }
    );
  }, [eventId, state.permissions.canView, state.selectedSession, state.eventData?.architecture]);

  // Set up real-time tickets listener
  const setupTicketsListener = useCallback(() => {
    if (!eventId || !state.permissions.canView) return;

    const ticketsRef = collection(db(), 'tickets');
    let ticketsQuery;

    if (state.selectedSession && state.eventData?.architecture === 'session-centric') {
      ticketsQuery = query(
        ticketsRef,
        where('eventId', '==', eventId),
        where('sessionId', '==', state.selectedSession.id)
      );
    } else {
      ticketsQuery = query(
        ticketsRef,
        where('eventId', '==', eventId)
      );
    }

    return onSnapshot(
      ticketsQuery,
      (snapshot) => {
        const ticketsList: Ticket[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ticketNumber: data.ticketNumber || '',
            userName: data.userName || '',
            userEmail: data.userEmail || '',
            ticketType: data.ticketType || undefined,
            eventId: data.eventId || undefined,
            sessionId: data.sessionId || undefined,
            userId: data.userId || '',
            status: data.status || 'active',
            createdAt: data.createdAt || '',
            usedAt: data.usedAt || undefined,
            qrCode: data.qrCode || undefined,
            type: data.type || 'event',
            title: data.title || '',
            venue: data.venue || '',
            selectedDate: data.selectedDate || '',
            selectedTimeSlot: data.selectedTimeSlot || { start_time: '', end_time: '' },
            amount: data.amount || 0,
            bookingId: data.bookingId || ''
          };
        });
        
        dispatch({ type: 'SET_TICKETS', payload: ticketsList });
      },
      (error) => {
        console.error("Error in tickets listener:", error);
      }
    );
  }, [eventId, state.permissions.canView, state.selectedSession, state.eventData?.architecture]);

  // Initialize on mount
  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  // Set up listeners when permissions and event data are available
  useEffect(() => {
    if (state.eventData && state.permissions.canView) {
      const unsubscribeAttendees = setupAttendeesListener();
      const unsubscribeTickets = setupTicketsListener();

      return () => {
        unsubscribeAttendees?.();
        unsubscribeTickets?.();
      };
    }
  }, [state.eventData, state.permissions.canView, setupAttendeesListener, setupTicketsListener]);

  return {
    ...state,
    initializeDashboard,
    fetchEventData,
    checkAuthorization
  };
}; 