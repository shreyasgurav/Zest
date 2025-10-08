import { Attendee } from '../types/dashboard.types';

export const formatDate = (date: string): string => {
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return date;
  }
};

export const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return time;
  }
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const exportAttendeesToCSV = (
  attendees: Attendee[], 
  eventTitle: string, 
  sessionName: string
): void => {
  if (attendees.length === 0) {
    alert('No attendees to export');
    return;
  }

  const headers = [
    'Name',
    'Email',
    'Phone',
    'Ticket Type',
    'Amount',
    'Status',
    'Check-in Status',
    'Booking Date',
    'Check-in Time'
  ];

  const csvData = attendees.map(attendee => [
    attendee.name || '',
    attendee.email || '',
    attendee.phone || '',
    attendee.ticketType || 'Standard',
    attendee.individualAmount?.toString() || '0',
    attendee.status || 'confirmed',
    attendee.checkedIn ? 'Checked In' : 'Pending',
    formatDate(attendee.createdAt),
    attendee.checkInTime ? formatDate(attendee.checkInTime) : ''
  ]);

  const csvContent = [
    [`Event: ${eventTitle} - Session: ${sessionName}`],
    [`Exported on: ${formatDate(new Date().toISOString())}`],
    [`Total Attendees: ${attendees.length}`],
    [],
    headers,
    ...csvData
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${eventTitle}-${sessionName}-attendees.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 