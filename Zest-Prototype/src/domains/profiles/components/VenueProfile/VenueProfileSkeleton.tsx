import React from 'react';
import styles from './VenueProfile.module.css';

const VenueProfileSkeleton: React.FC = () => {
  return (
    <div className={styles.venueProfileContainer}>
      {/* Banner Skeleton */}
      <div className={styles.venueBannerSection}>
        <div className={`${styles.venueBanner} ${styles.skeletonBanner} ${styles.animatePulse}`}>
          <div className={styles.skeletonImage} />
        </div>
        <div className={`${styles.venueProfileImageContainer} ${styles.skeletonProfileImage} ${styles.animatePulse}`} />
      </div>

      {/* Venue Details Skeleton */}
      <div className={styles.venueDetailsSection}>
        <div className={`${styles.skeletonName} ${styles.animatePulse}`} />
        <div className={`${styles.skeletonUsername} ${styles.animatePulse}`} />
        
        {/* Bio Skeleton */}
        <div className={styles.skeletonBio}>
          <div className={`${styles.skeletonLine} ${styles.animatePulse}`} />
          <div className={`${styles.skeletonLine} ${styles.w3_4} ${styles.animatePulse}`} />
          <div className={`${styles.skeletonLine} ${styles.animatePulse}`} />
        </div>

        {/* Stats Skeleton */}
        <div className={styles.venueStats}>
          <div className={styles.statItem}>
            <div className={`${styles.skeletonStatNumber} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonStatLabel} ${styles.animatePulse}`} />
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.skeletonStatNumber} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonStatLabel} ${styles.animatePulse}`} />
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.skeletonStatNumber} ${styles.animatePulse}`} />
            <div className={`${styles.skeletonStatLabel} ${styles.animatePulse}`} />
          </div>
        </div>
      </div>

      {/* Dashboard Skeleton */}
      <div className={styles.skeletonDashboard}>
        <div className={`${styles.skeletonCard} ${styles.animatePulse}`} />
        <div className={`${styles.skeletonCard} ${styles.animatePulse}`} />
        <div className={`${styles.skeletonCard} ${styles.animatePulse}`} />
        <div className={`${styles.skeletonCard} ${styles.animatePulse}`} />
      </div>
    </div>
  );
};

export default VenueProfileSkeleton; 