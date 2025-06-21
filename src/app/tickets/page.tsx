'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FaTicketAlt, FaFilter, FaSort, FaSearch, FaCalendarAlt } from 'react-icons/fa';
import TicketCard from '@/components/TicketCard/TicketCard';
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
  const auth = getAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'cancelled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'activity'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/');
        return;
      }
      fetchTickets(user.uid);
    });

    return () => unsubscribe();
  }, [auth, router]);

  const fetchTickets = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setTickets(data.tickets);
        setFilteredTickets(data.tickets);
      } else {
        setError(data.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...tickets];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.selectedDate).getTime() - new Date(b.selectedDate).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredTickets(filtered);
  }, [tickets, searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  const getTicketCounts = () => {
    return {
      total: tickets.length,
      active: tickets.filter(t => t.status === 'active').length,
      used: tickets.filter(t => t.status === 'used').length,
      cancelled: tickets.filter(t => t.status === 'cancelled').length,
      events: tickets.filter(t => t.type === 'event').length,
      activities: tickets.filter(t => t.type === 'activity').length,
    };
  };

  const counts = getTicketCounts();

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
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <FaTicketAlt className={styles.titleIcon} />
            <h1>My Tickets</h1>
          </div>
          <div className={styles.statsSection}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{counts.total}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{counts.active}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{counts.used}</span>
              <span className={styles.statLabel}>Used</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.filtersSection}>
          <div className={styles.filterGroup}>
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="event">Events</option>
              <option value="activity">Activities</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={styles.filterSelect}
            >
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="status">Status</option>
            </select>
          </div>

          <button
            className={styles.sortOrderButton}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <FaSort />
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className={styles.ticketsContainer}>
        {filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <FaTicketAlt className={styles.emptyIcon} />
            <h3>No tickets found</h3>
            <p>
              {tickets.length === 0 
                ? "You haven't booked any events or activities yet."
                : "No tickets match your current filters."
              }
            </p>
            {tickets.length === 0 && (
              <button 
                className={styles.browseButton}
                onClick={() => router.push('/events')}
              >
                Browse Events
              </button>
            )}
          </div>
        ) : (
          <div className={styles.ticketsList}>
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => {
                  // Optional: Navigate to ticket details or event/activity page
                  if (ticket.type === 'event') {
                    router.push(`/event-profile/${ticket.eventId || ''}`);
                  } else {
                    router.push(`/activity-profile/${ticket.activityId || ''}`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage; 