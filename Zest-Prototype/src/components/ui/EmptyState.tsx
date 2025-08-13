/**
 * 📭 EMPTY STATE COMPONENT
 * 
 * A reusable component to display helpful empty states
 * throughout the dashboard when there's no data to show.
 */

import React from 'react';
import { 
  FaUsers, 
  FaTicketAlt, 
  FaCalendarAlt, 
  FaSearch, 
  FaExclamationTriangle,
  FaPlus,
  FaShare,
  FaChartBar
} from 'react-icons/fa';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  type: 'attendees' | 'tickets' | 'sessions' | 'search' | 'error' | 'loading';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  action,
  icon,
  className = ''
}) => {
  // Default configurations for each type
  const getDefaultConfig = () => {
    switch (type) {
      case 'attendees':
        return {
          icon: <FaUsers />,
          title: 'No attendees yet',
          description: 'Attendees will appear here once they register for this event.',
          defaultAction: null
        };
      
      case 'tickets':
        return {
          icon: <FaTicketAlt />,
          title: 'No tickets configured',
          description: 'Add ticket types to start accepting registrations.',
          defaultAction: null
        };
      
      case 'sessions':
        return {
          icon: <FaCalendarAlt />,
          title: 'No sessions available',
          description: 'This event has no sessions configured.',
          defaultAction: null
        };
      
      case 'search':
        return {
          icon: <FaSearch />,
          title: 'No results found',
          description: 'Try adjusting your search terms or filters.',
          defaultAction: null
        };
      
      case 'error':
        return {
          icon: <FaExclamationTriangle />,
          title: 'Unable to load data',
          description: 'There was an error loading the information. Please try again.',
          defaultAction: null
        };
      
      case 'loading':
        return {
          icon: <div className={styles.spinner}></div>,
          title: 'Loading...',
          description: 'Please wait while we fetch the data.',
          defaultAction: null
        };
      
      default:
        return {
          icon: <FaChartBar />,
          title: 'No data available',
          description: 'There\'s nothing to show here right now.',
          defaultAction: null
        };
    }
  };

  const config = getDefaultConfig();
  const displayIcon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayAction = action || config.defaultAction;

  return (
    <div className={`${styles.emptyState} ${styles[type]} ${className}`}>
      <div className={styles.emptyStateContent}>
        <div className={styles.emptyStateIcon}>
          {displayIcon}
        </div>
        
        <h3 className={styles.emptyStateTitle}>
          {displayTitle}
        </h3>
        
        <p className={styles.emptyStateDescription}>
          {displayDescription}
        </p>
        
        {displayAction && displayAction.onClick && (
          <button 
            onClick={displayAction.onClick}
            className={`${styles.emptyStateAction} ${styles[displayAction.variant || 'primary']}`}
          >
            {displayAction.label}
          </button>
        )}
      </div>
    </div>
  );
};

// Loading skeleton for tables
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 6 
}) => {
  return (
    <div className={styles.tableSkeleton}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.skeletonRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className={styles.skeletonCell}
              style={{ width: colIndex === 0 ? '25%' : '15%' }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Quick stats skeleton
export const StatsSkeleton: React.FC = () => {
  return (
    <div className={styles.statsSkeleton}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={styles.skeletonStat}>
          <div className={styles.skeletonStatIcon}></div>
          <div className={styles.skeletonStatContent}>
            <div className={styles.skeletonStatValue}></div>
            <div className={styles.skeletonStatLabel}></div>
          </div>
        </div>
      ))}
    </div>
  );
}; 