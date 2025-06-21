import React from 'react';
import styles from './EventProfile.module.css';

const EventProfileSkeleton: React.FC = () => {
  return (
    <div className={styles.skeletonContainer}>
      <div className={styles.skeletonContent}>
        {/* Image and Info Section */}
        <div className={styles.skeletonMain}>
          {/* Image Skeleton */}
          <div className={`${styles.skeletonImage} ${styles.pulse}`}></div>

          {/* Info Box Skeleton */}
          <div className={styles.skeletonInfoBox}>
            <div className={`${styles.skeletonTitle} ${styles.pulse}`}></div>
            <div className={`${styles.skeletonHostingClub} ${styles.pulse}`}></div>
            
            {/* Event Details */}
            <div className={`${styles.skeletonDetail} ${styles.pulse}`}></div>
            <div className={`${styles.skeletonDetail} ${styles.pulse}`}></div>
            <div className={`${styles.skeletonDetail} ${styles.pulse}`}></div>
            
            {/* Button */}
            <div className={`${styles.skeletonButton} ${styles.pulse}`}></div>
          </div>
        </div>

        {/* About Event Section */}
        <div className={styles.skeletonAbout}>
          <div className={`${styles.skeletonAboutTitle} ${styles.pulse}`}></div>
          <div className={`${styles.skeletonAboutContent} ${styles.pulse}`}></div>
        </div>

        {/* Event Guide Section */}
        <div className={styles.skeletonGuide}>
          <div className={`${styles.skeletonGuideTitle} ${styles.pulse}`}></div>
          <div className={styles.skeletonGuideDetails}>
            {/* Guide Items */}
            {[1, 2, 3].map((item) => (
              <div key={item} className={styles.skeletonGuideItem}>
                <div className={`${styles.skeletonGuideIcon} ${styles.pulse}`}></div>
                <div className={styles.skeletonGuideInfo}>
                  <div className={`${styles.skeletonGuideLabel} ${styles.pulse}`}></div>
                  <div className={`${styles.skeletonGuideValue} ${styles.pulse}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventProfileSkeleton; 