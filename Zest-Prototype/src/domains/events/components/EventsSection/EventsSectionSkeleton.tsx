import React from 'react';
import styles from './EventsSection.module.css';

const EventCardSkeleton: React.FC = () => {
  return (
    <div className={styles.eventCardSkeleton}>
      <div className={styles.skeletonImageSection}></div>
      <div className={styles.skeletonContentSection}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonMeta}></div>
        <div className={styles.skeletonMeta}></div>
      </div>
    </div>
  );
};

const EventsSectionSkeleton: React.FC = () => {
  return (
    <div className={styles.eventsSection}>
      {/* Header Skeleton */}
      <div className={styles.eventsSectionHeading}>
        <div className={styles.skeletonHeadingTitle}></div>
        <div className={styles.skeletonSeeAllButton}></div>
      </div>

      {/* Carousel Skeleton */}
      <div className={styles.emblaContainer}>
        {/* Navigation Buttons Skeleton */}
        <div className={styles.skeletonNavButton}>
          <div className={styles.skeletonNavIcon}></div>
        </div>

        <div className={styles.embla}>
          <div className={styles.embla__viewport}>
            <div className={styles.embla__container}>
              {/* Generate skeleton event boxes for different screen sizes */}
              {[1, 2, 3, 4, 5].map((index) => (
                <div 
                  key={index} 
                  className={styles.embla__slide}
                >
                  <EventCardSkeleton />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.skeletonNavButton}>
          <div className={styles.skeletonNavIcon}></div>
        </div>
      </div>
    </div>
  );
};

export default EventsSectionSkeleton; 