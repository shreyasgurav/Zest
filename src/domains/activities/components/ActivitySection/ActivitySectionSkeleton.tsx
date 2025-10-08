import React from 'react';
import styles from './ActivitySection.module.css';

const ActivityBoxSkeleton = () => {
  return (
    <div className={`${styles.activityBoxWrapper} ${styles.skeletonLoading}`}>
      <div className={`${styles.activityBoxCard} ${styles.skeletonLoading}`}>
        {/* Image Section Skeleton */}
        <div className={styles.activityBoxImagePlaceholder}>
          <div className={styles.skeletonImage}></div>
          
          {/* Activity Type Badge Skeleton */}
          <div className={`${styles.activityTypeBadge} ${styles.skeletonTypeBadge}`}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonBadgeText}></div>
          </div>
        </div>

        {/* Content Section Skeleton */}
        <div className={styles.activityBoxInfo}>
          {/* Title Skeleton */}
          <div className={styles.skeletonActivityTitle}></div>
          
          {/* Location Row Skeleton */}
          <div className={styles.infoRow}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonText}></div>
          </div>
          
          {/* Date & Time Row Skeleton */}
          <div className={styles.infoRow}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonText}></div>
          </div>
          
          {/* Participants Row Skeleton */}
          <div className={styles.infoRow}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonText}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivitySectionSkeleton: React.FC = () => {
  return (
    <div className={`${styles.activitySection} ${styles.skeletonSection}`}>
      {/* Header Skeleton */}
      <div className={styles.activitySectionHeading}>
        <div className={styles.skeletonHeading}>
          <div className={styles.skeletonTitle}></div>
        </div>
        <div className={styles.skeletonSeeAll}>
          <div className={styles.skeletonButton}></div>
        </div>
      </div>

      {/* Carousel Skeleton */}
      <div className={styles.emblaContainer}>
        {/* Navigation Buttons Skeleton */}
        <div className={`${styles.emblaButton} ${styles.emblaButtonPrev} ${styles.skeletonNavButton}`}>
          <div className={styles.skeletonNavIcon}></div>
        </div>

        <div className={styles.embla}>
          <div className={styles.embla__viewport}>
            <div className={styles.embla__container}>
              {/* Generate skeleton activity boxes */}
              {[1, 2, 3, 4, 5].map((index) => (
                <div 
                  key={index} 
                  className={styles.embla__slide}
                >
                  <ActivityBoxSkeleton />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.emblaButton} ${styles.emblaButtonNext} ${styles.skeletonNavButton}`}>
          <div className={styles.skeletonNavIcon}></div>
        </div>
      </div>
    </div>
  );
};

export default ActivitySectionSkeleton; 