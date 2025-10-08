/**
 * 🎯 DASHBOARD HELPER FUNCTIONS
 * 
 * Essential utility functions for the event dashboard
 * to handle calculations, formatting, and data processing safely.
 */

import { formatDate, formatTime } from '../formatting/formatting';

// Re-export formatting functions for dashboard convenience
export { formatDate, formatTime };

export interface SafeCalculationResult {
  value: number;
  display: string;
  percentage: string;
  isValid: boolean;
}

/**
 * 🔥 CRITICAL: Safe division to prevent crashes
 * Prevents division by zero and handles edge cases
 */
export function safeDivision(numerator: number, denominator: number): SafeCalculationResult {
  // Handle edge cases
  if (typeof numerator !== 'number' || typeof denominator !== 'number') {
    return {
      value: 0,
      display: '0',
      percentage: '0%',
      isValid: false
    };
  }

  if (denominator === 0) {
    return {
      value: 0,
      display: '0',
      percentage: '0%',
      isValid: false
    };
  }

  if (numerator === 0) {
    return {
      value: 0,
      display: '0',
      percentage: '0%',
      isValid: true
    };
  }

  const result = numerator / denominator;
  const percentage = Math.min(Math.round(result * 100), 100); // Cap at 100%

  return {
    value: result,
    display: result.toFixed(2),
    percentage: `${percentage}%`,
    isValid: true
  };
}

/**
 * Calculate check-in rate safely
 */
export function calculateCheckInRate(checkedIn: number, total: number): SafeCalculationResult {
  return safeDivision(checkedIn, total);
}

/**
 * Calculate revenue safely
 */
export function calculateRevenue(attendees: any[], sessionContext?: any): number {
  if (!Array.isArray(attendees) || attendees.length === 0) {
    return 0;
  }

  try {
    return attendees.reduce((total, attendee) => {
      // Handle different revenue calculation methods
      if (typeof attendee.individualAmount === 'number') {
        return total + attendee.individualAmount;
      }

      if (typeof attendee.amount === 'number') {
        return total + attendee.amount;
      }

      // Handle ticket-based calculation
      if (sessionContext && sessionContext.tickets && typeof attendee.tickets === 'object') {
        let attendeeRevenue = 0;
        sessionContext.tickets.forEach((ticket: any) => {
          const quantity = attendee.tickets[ticket.name] || 0;
          attendeeRevenue += quantity * ticket.price;
        });
        return total + attendeeRevenue;
      }

      return total;
    }, 0);
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return 0;
  }
}

// formatDate and formatTime are imported from formatting module

/**
 * Calculate ticket statistics safely
 */
export function calculateTicketStats(attendees: any[], tickets: any[]) {
  if (!Array.isArray(attendees) || !Array.isArray(tickets)) {
    return {
      totalSold: 0,
      totalCapacity: 0,
      totalRevenue: 0,
      availableTickets: 0,
      ticketBreakdown: []
    };
  }

  try {
    const ticketBreakdown = tickets.map(ticket => {
      const soldCount = attendees.filter(attendee => {
        // Check different attendee formats
        if (attendee.ticketType === ticket.name) return true;
        if (typeof attendee.tickets === 'object' && attendee.tickets[ticket.name] > 0) return true;
        return false;
      }).length;

      const available = Math.max(0, ticket.capacity - soldCount);
      const revenue = soldCount * ticket.price;

      return {
        name: ticket.name,
        sold: soldCount,
        capacity: ticket.capacity,
        available,
        revenue,
        price: ticket.price,
        percentage: safeDivision(soldCount, ticket.capacity).percentage
      };
    });

    const totalSold = ticketBreakdown.reduce((sum, ticket) => sum + ticket.sold, 0);
    const totalCapacity = ticketBreakdown.reduce((sum, ticket) => sum + ticket.capacity, 0);
    const totalRevenue = ticketBreakdown.reduce((sum, ticket) => sum + ticket.revenue, 0);
    const availableTickets = ticketBreakdown.reduce((sum, ticket) => sum + ticket.available, 0);

    return {
      totalSold,
      totalCapacity,
      totalRevenue,
      availableTickets,
      ticketBreakdown
    };
  } catch (error) {
    console.error('Error calculating ticket stats:', error);
    return {
      totalSold: 0,
      totalCapacity: 0,
      totalRevenue: 0,
      availableTickets: 0,
      ticketBreakdown: []
    };
  }
}

/**
 * Filter attendees safely with search and status filters
 */
export function filterAttendees(
  attendees: any[], 
  searchTerm: string = '', 
  filterStatus: string = 'all'
): any[] {
  if (!Array.isArray(attendees)) return [];

  try {
    return attendees.filter(attendee => {
      // Search filter
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          (attendee.name || '').toLowerCase().includes(search) ||
          (attendee.email || '').toLowerCase().includes(search) ||
          (attendee.phone || '').includes(search) ||
          (attendee.ticketType || '').toLowerCase().includes(search);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterStatus && filterStatus !== 'all') {
        switch (filterStatus) {
          case 'checked-in':
            return attendee.checkedIn === true;
          case 'not-checked-in':
            return !attendee.checkedIn;
          case 'confirmed':
            return attendee.status === 'confirmed';
          case 'pending':
            return attendee.status === 'pending';
          default:
            return true;
        }
      }

      return true;
    });
  } catch (error) {
    console.error('Error filtering attendees:', error);
    return attendees;
  }
}

/**
 * Export attendees to CSV safely
 */
export function exportAttendeesToCSV(attendees: any[], eventTitle: string, sessionName?: string): void {
  try {
    if (!Array.isArray(attendees) || attendees.length === 0) {
      alert('No attendees to export');
      return;
    }

    const headers = [
      'Name',
      'Email', 
      'Phone',
      'Ticket Type',
      'Check-in Status',
      'Check-in Time',
      'Registration Date',
      'Amount Paid',
      'Status'
    ];

    const csvRows = attendees.map(attendee => [
      `"${(attendee.name || 'N/A').replace(/"/g, '""')}"`,
      `"${(attendee.email || 'N/A').replace(/"/g, '""')}"`,
      `"${(attendee.phone || 'N/A').replace(/"/g, '""')}"`,
      `"${(attendee.ticketType || 'Standard').replace(/"/g, '""')}"`,
      `"${attendee.checkedIn ? 'Checked In' : 'Not Checked In'}"`,
      `"${attendee.checkInTime ? formatDate(attendee.checkInTime) : 'N/A'}"`,
      `"${attendee.createdAt ? formatDate(attendee.createdAt) : 'N/A'}"`,
      `"${attendee.individualAmount || attendee.amount || 'N/A'}"`,
      `"${attendee.status || 'confirmed'}"`
    ].join(','));

    const csvContent = [
      headers.join(','),
      ...csvRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${eventTitle}_${sessionName || 'all'}_attendees.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting attendees:', error);
    alert('Failed to export attendees. Please try again.');
  }
}

/**
 * Validate attendee check-in eligibility
 */
export function validateCheckInEligibility(attendee: any): { canCheckIn: boolean; reason?: string } {
  if (!attendee) {
    return { canCheckIn: false, reason: 'Invalid attendee data' };
  }

  if (attendee.checkedIn) {
    return { canCheckIn: false, reason: 'Already checked in' };
  }

  if (attendee.status && attendee.status !== 'confirmed') {
    return { canCheckIn: false, reason: `Ticket status: ${attendee.status}` };
  }

  return { canCheckIn: true };
}

/**
 * Get empty state messages for search and filter
 */
export function getEmptyStateMessage(searchTerm: string, filterStatus: string): string {
  if (searchTerm) {
    return 'No attendees match your search criteria. Try adjusting your search terms.';
  }
  
  switch (filterStatus) {
    case 'checked-in':
      return 'No attendees have checked in yet.';
    case 'not-checked-in':
      return 'All attendees have been checked in!';
    case 'confirmed':
      return 'No confirmed attendees found.';
    default:
      return 'Attendees will appear here once they register for this session.';
  }
}

/**
 * Get empty state messages for context
 */
export function getContextEmptyState(context: 'attendees' | 'tickets' | 'sessions'): {
  title: string;
  description: string;
  action?: string;
} {
  switch (context) {
    case 'attendees':
      return {
        title: 'No attendees yet',
        description: 'Attendees will appear here once they register for this event.',
        action: 'Share your event to get more registrations!'
      };
    case 'tickets':
      return {
        title: 'No tickets configured',
        description: 'Add ticket types to start accepting registrations.',
        action: 'Add your first ticket type'
      };
    case 'sessions':
      return {
        title: 'No sessions available',
        description: 'This event has no sessions configured.',
        action: 'Contact the event organizer'
      };
    default:
      return {
        title: 'No data available',
        description: 'There\'s nothing to show here right now.'
      };
  }
} 