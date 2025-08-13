'use client';

import { useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { db } from '@/infrastructure/firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { DashboardSecurity } from '@/shared/utils/security/dashboardSecurity';
import { useDashboard } from '../contexts/DashboardContext';

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
        dispatch({ type: 'SET_EVENT_DATA', payload: { ...data, id: eventDoc.id } });
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
        const attendeesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
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
        const ticketsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
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