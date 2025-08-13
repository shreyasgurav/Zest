import React from 'react';
import styles from './EventCardSkeleton.module.css';

interface EventCardSkeletonProps {
  variant?: 'default' | 'compact' | 'wide' | 'dashboard';
}

export const EventCardSkeleton: React.FC<EventCardSkeletonProps> = ({
  variant = 'default'
}) => {
  return (
    <div className={styles.eventCardSkeleton} aria-label="Loading event">
      <div className={styles.skeletonImageSection}></div>
      <div className={styles.skeletonContentSection}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonMeta}></div>
        <div className={styles.skeletonMeta}></div>
      </div>
    </div>
  );
}; 