import React from 'react';
import styles from './PublicVenueProfile.module.css';

const PublicVenueProfileSkeleton = () => {
  return (
    <div className={styles.loadingContainer}>
      {/* Banner Section */}
      <div className={styles.skeletonBanner}>
        <div className={styles.bannerOverlay} />
      </div>

      {/* Profile Image */}
      <div className={styles.skeletonProfileImage} />

      {/* Content Section */}
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonName} />
        <div className={styles.skeletonUsername} />
        <div className={styles.skeletonBio} />
      </div>

      {/* Events Section */}
      <div className={styles.eventsSection}>
        <div className={styles.skeletonName} style={{ width: '200px', margin: '0 0 24px 0' }} />
        <div className={styles.eventsGrid}>
          {[1, 2, 3, 4].map((index) => (
            <div 
              key={index} 
              style={{
                height: '300px',
                background: 'linear-gradient(90deg, #374151 0%, #4b5563 50%, #374151 100%)',
                animation: 'shimmer 2s infinite linear',
                backgroundSize: '1000px 100%',
                borderRadius: '12px'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicVenueProfileSkeleton; 