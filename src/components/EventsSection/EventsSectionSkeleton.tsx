import React from 'react';
import styles from './EventsSection.module.css';
import eventBoxStyles from './EventBox/EventBox.module.css';

const EventBoxSkeleton: React.FC = () => {
  return (
    <div className={`${eventBoxStyles.eventBoxWrapper} ${styles.skeletonLoading}`}>
      <div className={`${eventBoxStyles.eventBoxCard} ${styles.skeletonLoading}`}>
        {/* Image Section Skeleton */}
        <div className={eventBoxStyles.imageSection}>
          <div className={styles.skeletonImage}></div>
          
          {/* Event Type Badge Skeleton */}
          <div className={`${eventBoxStyles.eventTypeBadge} ${styles.skeletonTypeBadge}`}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonBadgeText}></div>
          </div>
        </div>

        {/* Content Section Skeleton */}
        <div className={eventBoxStyles.eventBoxInfo}>
          {/* Title Skeleton */}
          <div className={styles.skeletonEventTitle}></div>
          
          {/* Date & Time Row Skeleton */}
          <div className={eventBoxStyles.infoRow}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonText}></div>
          </div>
          
          {/* Venue Row Skeleton */}
          <div className={eventBoxStyles.infoRow}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonText}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventsSectionSkeleton: React.FC = () => {
  return (
    <div className={`${styles.eventsSection} ${styles.skeletonSection}`}>
      {/* Header Skeleton */}
      <div className={styles.eventsSectionHeading}>
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
              {/* Generate skeleton event boxes for different screen sizes */}
              {[1, 2, 3, 4, 5].map((index) => (
                <div 
                  key={index} 
                  className={styles.embla__slide}
                >
                  <EventBoxSkeleton />
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

export default EventsSectionSkeleton; 