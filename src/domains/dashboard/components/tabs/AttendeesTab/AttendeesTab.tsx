'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { 
  FaDownload, 
  FaSearch, 
  FaFilter, 
  FaUsers, 
  FaCheckCircle, 
  FaClock,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEye,
  FaChartBar
} from 'react-icons/fa';
import { useDashboard } from '../../../contexts/DashboardContext';
import { Attendee, FilterOptions } from '../../../types/dashboard.types';
import { exportAttendeesToCSV, formatDate, formatTime } from '../../../utils/formatting';
import { getEmptyStateMessage } from '../../../utils/helpers';
import AttendeesList from './AttendeesList';
import AttendeeFilters from './AttendeeFilters';
import AttendeeStats from './AttendeeStats';
import styles from './AttendeesTab.module.css';

const AttendeesTab: React.FC = () => {
  const { state, dispatch } = useDashboard();
  const { sessionAttendees, filters, eventData, selectedSession } = state;
  
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Attendee;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Memoized filtered and sorted attendees
  const filteredAndSortedAttendees = useMemo(() => {
    let filtered = sessionAttendees.filter(attendee => {
      // Search filter
      const matchesSearch = !filters.searchTerm || 
        attendee.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        attendee.phone.includes(filters.searchTerm);
      
      // Status filter
      const matchesStatus = filters.filterStatus === 'all' ||
        (filters.filterStatus === 'checked-in' && attendee.checkedIn) ||
        (filters.filterStatus === 'not-checked-in' && !attendee.checkedIn) ||
        (filters.filterStatus === 'confirmed' && attendee.status === 'confirmed');
      
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle undefined values
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
        
        if (aValue === bValue) return 0;
        
        const result = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'desc' ? result * -1 : result;
      });
    }

    return filtered;
  }, [sessionAttendees, filters, sortConfig]);

  // Attendee statistics
  const attendeeStats = useMemo(() => {
    const total = filteredAndSortedAttendees.length;
    const checkedIn = filteredAndSortedAttendees.filter(a => a.checkedIn).length;
    const pending = total - checkedIn;
    const checkInPercentage = total > 0 ? (checkedIn / total) * 100 : 0;

    return {
      total,
      checkedIn,
      pending,
      checkInPercentage,
      totalRevenue: calculateTotalRevenue(filteredAndSortedAttendees)
    };
  }, [filteredAndSortedAttendees]);

  // Calculate revenue for attendees
  const calculateTotalRevenue = useCallback((attendees: Attendee[]): number => {
    return attendees.reduce((total, attendee) => {
      if (attendee.individualAmount && typeof attendee.individualAmount === 'number') {
        return total + attendee.individualAmount;
      }
      
      if (typeof attendee.tickets === 'object' && selectedSession) {
        const attendeeRevenue = Object.entries(attendee.tickets).reduce((sum, [ticketName, quantity]) => {
          const ticket = selectedSession.tickets.find(t => t.name === ticketName);
          const count = Number(quantity);
          if (ticket && !isNaN(count) && count > 0) {
            return sum + (ticket.price * count);
          }
          return sum;
        }, 0);
        return total + attendeeRevenue;
      }
      
      return total;
    }, 0);
  }, [selectedSession]);

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    dispatch({ 
      type: 'SET_SEARCH_TERM', 
      payload: searchTerm 
    });
  }, [dispatch]);

  // Handle filter change
  const handleFilterChange = useCallback((filterStatus: FilterOptions['filterStatus']) => {
    dispatch({ 
      type: 'SET_FILTER_STATUS', 
      payload: filterStatus 
    });
  }, [dispatch]);

  // Handle sort
  const handleSort = useCallback((key: keyof Attendee) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    if (!selectedSession && eventData?.architecture === 'session-centric') {
      alert('Please select a session first');
      return;
    }

    const eventTitle = eventData?.title || 'Event';
    const sessionName = selectedSession ? selectedSession.name : 'all';
    
    exportAttendeesToCSV(filteredAndSortedAttendees, eventTitle, sessionName);
  }, [filteredAndSortedAttendees, eventData, selectedSession]);

  // Get sort icon
  const getSortIcon = useCallback((key: keyof Attendee) => {
    if (sortConfig?.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  }, [sortConfig]);

  return (
    <div className={styles.attendeesTab}>
      {/* Header Section */}
      <div className={styles.attendeesHeader}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>
              <FaUsers className={styles.titleIcon} />
              Attendees Data ({filteredAndSortedAttendees.length})
            </h2>
            <p className={styles.subtitle}>
              Manage and monitor all event attendees
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.exportButton}
              onClick={handleExport}
              disabled={filteredAndSortedAttendees.length === 0}
            >
              <FaDownload />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <AttendeeFilters
          searchTerm={filters.searchTerm}
          filterStatus={filters.filterStatus}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Statistics Cards */}
      <AttendeeStats stats={attendeeStats} />

      {/* Attendees List */}
      <div className={styles.attendeesContent}>
        {filteredAndSortedAttendees.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <FaUsers />
            </div>
            <h3>No attendees found</h3>
            <p className={styles.emptyStateMessage}>
              {getEmptyStateMessage(filters.searchTerm, filters.filterStatus)}
            </p>
            {(filters.searchTerm || filters.filterStatus !== 'all') ? (
              <button 
                className={styles.clearFiltersButton}
                onClick={() => {
                  dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
                  dispatch({ type: 'SET_FILTER_STATUS', payload: 'all' });
                }}
              >
                Clear Filters
              </button>
            ) : (
              <button 
                className={styles.viewOverviewButton}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'overview' })}
              >
                <FaChartBar /> View Overview
              </button>
            )}
          </div>
        ) : (
          <AttendeesList
            attendees={filteredAndSortedAttendees}
            onSort={handleSort}
            getSortIcon={getSortIcon}
            selectedSession={selectedSession}
          />
        )}
      </div>
    </div>
  );
};

export default AttendeesTab; 