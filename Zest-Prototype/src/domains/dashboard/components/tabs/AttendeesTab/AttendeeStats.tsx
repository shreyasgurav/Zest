'use client';

import React from 'react';
import { 
  FaUsers, 
  FaCheckCircle, 
  FaClock, 
  FaMoneyBillWave,
  FaPercentage
} from 'react-icons/fa';
import { formatCurrency } from '../../../utils/formatting';
import { calculatePercentage } from '../../../utils/helpers';
import styles from './AttendeeStats.module.css';

interface AttendeeStatsData {
  total: number;
  checkedIn: number;
  pending: number;
  checkInPercentage: number;
  totalRevenue: number;
}

interface AttendeeStatsProps {
  stats: AttendeeStatsData;
}

const AttendeeStats: React.FC<AttendeeStatsProps> = ({ stats }) => {
  const statCards = [
    {
      id: 'total',
      title: 'Total Attendees',
      value: stats.total,
      icon: FaUsers,
      color: 'blue',
      description: 'Registered attendees'
    },
    {
      id: 'checked-in',
      title: 'Checked In',
      value: stats.checkedIn,
      icon: FaCheckCircle,
      color: 'green',
      description: 'Successfully checked in',
      percentage: calculatePercentage(stats.checkedIn, stats.total)
    },
    {
      id: 'pending',
      title: 'Pending Check-in',
      value: stats.pending,
      icon: FaClock,
      color: 'orange',
      description: 'Awaiting check-in',
      percentage: calculatePercentage(stats.pending, stats.total)
    },
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: FaMoneyBillWave,
      color: 'purple',
      description: 'From all attendees',
      isRevenue: true
    }
  ];

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;
          
          return (
            <div key={card.id} className={`${styles.statCard} ${styles[card.color]}`}>
              <div className={styles.statHeader}>
                <div className={styles.statIcon}>
                  <Icon />
                </div>
                {card.percentage !== undefined && (
                  <div className={styles.percentageBadge}>
                    <FaPercentage />
                    {card.percentage}%
                  </div>
                )}
              </div>
              
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {card.isRevenue ? card.value : card.value.toLocaleString()}
                </div>
                <div className={styles.statTitle}>{card.title}</div>
                <div className={styles.statDescription}>{card.description}</div>
              </div>
              
              {card.percentage !== undefined && (
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ 
                      width: `${Math.min(card.percentage, 100)}%`,
                      backgroundColor: `var(--color-${card.color})`
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Overall Progress Indicator */}
      <div className={styles.overallProgress}>
        <div className={styles.progressHeader}>
          <span className={styles.progressTitle}>Check-in Progress</span>
          <span className={styles.progressValue}>
            {stats.checkInPercentage.toFixed(1)}% Complete
          </span>
        </div>
        <div className={styles.overallProgressBar}>
          <div 
            className={styles.overallProgressFill}
            style={{ width: `${Math.min(stats.checkInPercentage, 100)}%` }}
          />
        </div>
        <div className={styles.progressLabels}>
          <span>{stats.checkedIn} checked in</span>
          <span>{stats.pending} remaining</span>
        </div>
      </div>
    </div>
  );
};

export default AttendeeStats; 