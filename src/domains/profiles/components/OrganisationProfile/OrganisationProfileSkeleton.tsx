import React from 'react';
import styles from './OrganisationProfile.module.css';

const OrganisationProfileSkeleton: React.FC = () => {
  return (
    <div className={styles.orgProfileContainer}>
      {/* Banner and Profile Image Skeleton */}
      <div className={styles.orgBannerSection}>
        <div className={`${styles.orgBanner} ${styles.skeletonBanner} ${styles.animatePulse}`}>
          <div className={styles.skeletonImage}></div>
        </div>
        <div className={`${styles.orgProfileImageContainer} ${styles.skeletonProfileImage} ${styles.animatePulse}`}>
        </div>
      </div>

      {/* Profile Details Skeleton */}
      <div className={styles.orgDetailsSection}>
        <div className={`${styles.skeletonName} ${styles.animatePulse}`}></div>
        <div className={`${styles.skeletonUsername} ${styles.animatePulse}`}></div>
        <div className={styles.skeletonBio}>
          <div className={`${styles.skeletonLine} ${styles.animatePulse}`}></div>
          <div className={`${styles.skeletonLine} ${styles.animatePulse}`}></div>
          <div className={`${styles.skeletonLine} ${styles.animatePulse} ${styles.w3_4}`}></div>
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className={styles.orgStats}>
        {[1, 2, 3].map((item) => (
          <div key={item} className={styles.statItem}>
            <div className={`${styles.skeletonStatNumber} ${styles.animatePulse}`}></div>
            <div className={`${styles.skeletonStatLabel} ${styles.animatePulse}`}></div>
          </div>
        ))}
      </div>

      {/* Dashboard Section Skeleton */}
      <div className={styles.orgDashboardSection}>
        <div className={`${styles.skeletonDashboard} ${styles.animatePulse}`}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className={styles.skeletonCard}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrganisationProfileSkeleton; 