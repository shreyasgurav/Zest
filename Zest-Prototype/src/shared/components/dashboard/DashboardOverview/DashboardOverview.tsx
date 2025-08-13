'use client';

import React from 'react';
import { 
  FaMoneyBillWave, 
  FaUsers, 
  FaCheckCircle, 
  FaChartLine,
  FaTicketAlt,
  FaPercentage,
  FaClock,
  FaArrowUp,
  FaCalendarDay,
  FaEye
} from 'react-icons/fa';
import styles from './DashboardOverview.module.css';

interface EventSession {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  tickets: Array<{
    name: string;
    capacity: number;
    price: number;
  }>;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  checkedIn?: boolean;
  ticketType?: string;
  individualAmount?: number;
  tickets?: Record<string, number> | number;
  createdAt: string;
}

interface DashboardOverviewProps {
  selectedSession: EventSession;
  sessionAttendees: Attendee[];
  calculateSessionRevenue: (attendees: Attendee[], session: EventSession) => number;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  selectedSession,
  sessionAttendees,
  calculateSessionRevenue,
  formatDate,
  formatTime
}) => {
  const totalRevenue = calculateSessionRevenue(sessionAttendees, selectedSession);
  const totalAttendees = sessionAttendees.length;
  const checkedInCount = sessionAttendees.filter(a => a.checkedIn).length;
  const totalCapacity = selectedSession.tickets.reduce((sum, t) => sum + t.capacity, 0);
  const capacityPercentage = totalCapacity > 0 ? (totalAttendees / totalCapacity) * 100 : 0;
  
  // Calculate ticket sales breakdown
  const ticketBreakdown = selectedSession.tickets.map(ticket => {
    const soldCount = sessionAttendees.filter(attendee => 
      attendee.ticketType === ticket.name ||
      (typeof attendee.tickets === 'object' && attendee.tickets && attendee.tickets[ticket.name] > 0)
    ).length;
    const revenue = soldCount * ticket.price;
    const percentage = (soldCount / ticket.capacity) * 100;
    
    return {
      ...ticket,
      soldCount,
      revenue,
      percentage,
      available: ticket.capacity - soldCount
    };
  });

  const totalPotentialRevenue = selectedSession.tickets.reduce((sum, t) => sum + (t.capacity * t.price), 0);
  const revenuePercentage = totalPotentialRevenue > 0 ? (totalRevenue / totalPotentialRevenue) * 100 : 0;

  return (
    <div className={styles.overview}>
      {/* Header */}
      <div className={styles.overviewHeader}>
        <div className={styles.headerContent}>
          <h2>Session Overview</h2>
          <div className={styles.sessionDetails}>
            <div className={styles.sessionDate}>
              <FaCalendarDay />
              <span>{formatDate(selectedSession.date)}</span>
            </div>
            <div className={styles.sessionTime}>
              <FaClock />
              <span>{formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</span>
            </div>
          </div>
        </div>
        <div className={styles.liveIndicator}>
          <div className={styles.liveDot}></div>
          <span>Live Data</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className={styles.statsGrid}>
        {/* Revenue Card */}
        <div className={`${styles.statCard} ${styles.revenueCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon}>
              <FaMoneyBillWave />
            </div>
            <div className={styles.statTrend}>
              <FaArrowUp />
            </div>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>₹{totalRevenue.toLocaleString()}</div>
            <div className={styles.statLabel}>Total Revenue</div>
            <div className={styles.statSubtext}>
              {revenuePercentage.toFixed(1)}% of potential (₹{totalPotentialRevenue.toLocaleString()})
            </div>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Attendees Card */}
        <div className={`${styles.statCard} ${styles.attendeesCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon}>
              <FaUsers />
            </div>
            <div className={styles.capacityBadge}>
              {capacityPercentage.toFixed(0)}%
            </div>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalAttendees}</div>
            <div className={styles.statLabel}>Total Attendees</div>
            <div className={styles.statSubtext}>
              {totalCapacity - totalAttendees} spots remaining
            </div>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${styles.attendeesProgress}`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Check-in Card */}
        <div className={`${styles.statCard} ${styles.checkinCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon}>
              <FaCheckCircle />
            </div>
            <div className={styles.checkinPercentage}>
              {totalAttendees > 0 ? ((checkedInCount / totalAttendees) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{checkedInCount}</div>
            <div className={styles.statLabel}>Checked In</div>
            <div className={styles.statSubtext}>
              {totalAttendees - checkedInCount} pending check-ins
            </div>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${styles.checkinProgress}`}
              style={{ width: `${totalAttendees > 0 ? (checkedInCount / totalAttendees) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div className={`${styles.statCard} ${styles.conversionCard}`}>
          <div className={styles.statHeader}>
            <div className={styles.statIcon}>
              <FaChartLine />
            </div>
            <div className={styles.conversionBadge}>
              <FaEye />
            </div>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{capacityPercentage.toFixed(1)}%</div>
            <div className={styles.statLabel}>Capacity Filled</div>
            <div className={styles.statSubtext}>
              {totalCapacity} total capacity
            </div>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${styles.conversionProgress}`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Ticket Breakdown */}
      <div className={styles.ticketSection}>
        <h3>Ticket Sales Breakdown</h3>
        <div className={styles.ticketGrid}>
          {ticketBreakdown.map((ticket, index) => (
            <div key={index} className={styles.ticketCard}>
              <div className={styles.ticketHeader}>
                <h4>{ticket.name}</h4>
                <span className={styles.ticketPrice}>₹{ticket.price.toLocaleString()}</span>
              </div>
              
              <div className={styles.ticketStats}>
                <div className={styles.ticketStat}>
                  <span className={styles.ticketStatValue}>{ticket.soldCount}</span>
                  <span className={styles.ticketStatLabel}>Sold</span>
                </div>
                <div className={styles.ticketStat}>
                  <span className={styles.ticketStatValue}>{ticket.available}</span>
                  <span className={styles.ticketStatLabel}>Available</span>
                </div>
                <div className={styles.ticketStat}>
                  <span className={styles.ticketStatValue}>₹{ticket.revenue.toLocaleString()}</span>
                  <span className={styles.ticketStatLabel}>Revenue</span>
                </div>
              </div>

              <div className={styles.ticketProgress}>
                <div className={styles.ticketProgressBar}>
                  <div 
                    className={styles.ticketProgressFill}
                    style={{ width: `${Math.min(ticket.percentage, 100)}%` }}
                  ></div>
                </div>
                <span className={styles.ticketPercentage}>
                  {ticket.percentage.toFixed(1)}% sold
                </span>
              </div>

              {ticket.percentage >= 90 && (
                <div className={styles.ticketAlert}>
                  <FaPercentage />
                  <span>Almost Sold Out!</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

export default DashboardOverview; 