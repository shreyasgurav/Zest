'use client';

import React from 'react';
import { FaCheckCircle, FaClock, FaSort } from 'react-icons/fa';
import { Attendee, EventSession } from '../../../types/dashboard.types';
import { formatDate, formatCurrency } from '../../../utils/formatting';
import { truncateText } from '../../../utils/helpers';
import styles from './AttendeesList.module.css';

interface AttendeesListProps {
  attendees: Attendee[];
  onSort: (key: keyof Attendee) => void;
  getSortIcon: (key: keyof Attendee) => React.ReactElement;
  selectedSession: EventSession | null;
}

const AttendeesList: React.FC<AttendeesListProps> = ({
  attendees,
  onSort,
  getSortIcon,
  selectedSession
}) => {
  // Calculate revenue for an attendee
  const calculateAttendeeRevenue = (attendee: Attendee): number => {
    if (attendee.individualAmount && typeof attendee.individualAmount === 'number') {
      return attendee.individualAmount;
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
      return attendeeRevenue;
    }
    
    return 0;
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.attendeesTable}>
          <thead className={styles.tableHead}>
            <tr>
              <th 
                className={styles.sortableHeader}
                onClick={() => onSort('name')}
              >
                <span>Name</span>
                {getSortIcon('name')}
              </th>
              <th 
                className={styles.sortableHeader}
                onClick={() => onSort('email')}
              >
                <span>Email</span>
                {getSortIcon('email')}
              </th>
              <th className={styles.tableHeader}>Phone</th>
              <th className={styles.tableHeader}>Ticket Type</th>
              <th 
                className={styles.sortableHeader}
                onClick={() => onSort('individualAmount')}
              >
                <span>Amount</span>
                {getSortIcon('individualAmount')}
              </th>
              <th 
                className={styles.sortableHeader}
                onClick={() => onSort('checkedIn')}
              >
                <span>Status</span>
                {getSortIcon('checkedIn')}
              </th>
              <th 
                className={styles.sortableHeader}
                onClick={() => onSort('createdAt')}
              >
                <span>Booking Date</span>
                {getSortIcon('createdAt')}
              </th>
              <th className={styles.tableHeader}>Check-in Time</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {attendees.map((attendee, index) => (
              <tr 
                key={attendee.id} 
                className={`${styles.tableRow} ${
                  attendee.checkedIn ? styles.checkedInRow : styles.pendingRow
                }`}
              >
                <td className={styles.nameCell}>
                  <div className={styles.nameContent}>
                    <strong className={styles.attendeeName}>
                      {truncateText(attendee.name, 25)}
                    </strong>
                    {attendee.ticketIndex && attendee.totalTicketsInBooking && attendee.totalTicketsInBooking > 1 && (
                      <span className={styles.groupIndicator}>
                        #{attendee.ticketIndex} of {attendee.totalTicketsInBooking}
                      </span>
                    )}
                  </div>
                </td>
                <td className={styles.emailCell}>
                  <span title={attendee.email}>
                    {truncateText(attendee.email, 30)}
                  </span>
                </td>
                <td className={styles.phoneCell}>
                  {attendee.phone}
                </td>
                <td className={styles.ticketTypeCell}>
                  <span className={styles.ticketTypeTag}>
                    {attendee.ticketType || 'Standard'}
                  </span>
                </td>
                <td className={styles.amountCell}>
                  <span className={styles.amount}>
                    {formatCurrency(calculateAttendeeRevenue(attendee))}
                  </span>
                </td>
                <td className={styles.statusCell}>
                  {attendee.checkedIn ? (
                    <span className={`${styles.statusBadge} ${styles.checkedIn}`}>
                      <FaCheckCircle />
                      <span>Checked In</span>
                    </span>
                  ) : (
                    <span className={`${styles.statusBadge} ${styles.pending}`}>
                      <FaClock />
                      <span>Pending</span>
                    </span>
                  )}
                </td>
                <td className={styles.dateCell}>
                  <span className={styles.date}>
                    {formatDate(attendee.createdAt)}
                  </span>
                </td>
                <td className={styles.checkInTimeCell}>
                  {attendee.checkedIn && attendee.checkInTime ? (
                    <span className={styles.checkInTime}>
                      {new Date(attendee.checkInTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  ) : (
                    <span className={styles.noCheckIn}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Card View */}
      <div className={styles.mobileView}>
        {attendees.map((attendee) => (
          <div 
            key={attendee.id} 
            className={`${styles.attendeeCard} ${
              attendee.checkedIn ? styles.checkedInCard : styles.pendingCard
            }`}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardName}>
                <strong>{attendee.name}</strong>
                {attendee.ticketIndex && attendee.totalTicketsInBooking && attendee.totalTicketsInBooking > 1 && (
                  <span className={styles.groupIndicator}>
                    #{attendee.ticketIndex} of {attendee.totalTicketsInBooking}
                  </span>
                )}
              </div>
              <div className={styles.cardStatus}>
                {attendee.checkedIn ? (
                  <span className={`${styles.statusBadge} ${styles.checkedIn}`}>
                    <FaCheckCircle />
                    Checked In
                  </span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.pending}`}>
                    <FaClock />
                    Pending
                  </span>
                )}
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Email:</span>
                <span className={styles.cardValue}>{attendee.email}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Phone:</span>
                <span className={styles.cardValue}>{attendee.phone}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Ticket:</span>
                <span className={styles.ticketTypeTag}>
                  {attendee.ticketType || 'Standard'}
                </span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Amount:</span>
                <span className={styles.amount}>
                  {formatCurrency(calculateAttendeeRevenue(attendee))}
                </span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Booked:</span>
                <span className={styles.cardValue}>
                  {formatDate(attendee.createdAt)}
                </span>
              </div>
              {attendee.checkedIn && attendee.checkInTime && (
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Checked In:</span>
                  <span className={styles.checkInTime}>
                    {new Date(attendee.checkInTime).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendeesList; 