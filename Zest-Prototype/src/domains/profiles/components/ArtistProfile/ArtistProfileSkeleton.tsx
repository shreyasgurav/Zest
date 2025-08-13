import React from 'react';
import styles from './ArtistProfile.module.css';

const ArtistProfileSkeleton: React.FC = () => {
  return (
    <div className={styles.artistProfileContainer}>
      {/* Banner Skeleton */}
      <div className={styles.artistBannerSection}>
        <div className={`${styles.artistBanner} ${styles.skeletonBanner} ${styles.animatePulse}`}>
          <div className={styles.skeletonImage} />
        </div>
        <div className={`${styles.artistProfileImageContainer} ${styles.skeletonProfileImage} ${styles.animatePulse}`} />
      </div>

      {/* Artist Details Skeleton */}
      <div className={styles.artistDetailsSection}>
        <div className={`${styles.skeletonName} ${styles.animatePulse}`} />
        <div className={`${styles.skeletonUsername} ${styles.animatePulse}`} />
        
        {/* Bio Skeleton */}
        <div className={styles.skeletonBio}>
          <div className={`${styles.skeletonLine} ${styles.animatePulse}`} />
          <div className={`${styles.skeletonLine} ${styles.w3_4} ${styles.animatePulse}`} />
          <div className={`${styles.skeletonLine} ${styles.animatePulse}`} />
        </div>

        {/* Stats Skeleton */}
        <div className={styles.artistStats}>
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

export default ArtistProfileSkeleton; 