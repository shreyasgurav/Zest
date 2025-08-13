import React from 'react';
import styles from './PublicArtistProfile.module.css';

const PublicArtistProfileSkeleton = () => {
  return (
    <div className={styles.skeletonContainer}>
      {/* Banner Section */}
      <div className={styles.skeletonBanner}>
        <div className={styles.skeletonProfileSection}>
          <div className={styles.skeletonProfileImageContainer}>
            <div className={styles.skeletonProfileImage} />
          </div>
          <div className={styles.skeletonInfo}>
            <div className={styles.skeletonName} />
            <div className={styles.skeletonMeta}>
              <div className={styles.skeletonUsername} />
              <div className={styles.skeletonGenre} />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonBio}>
          <div className={styles.skeletonBioLine} />
          <div className={styles.skeletonBioLine} />
          <div className={styles.skeletonBioLine} />
        </div>
      </div>

      {/* Events Section */}
      <div className={styles.skeletonEvents}>
        <div className={styles.skeletonEventsHeading} />
        <div className={styles.skeletonEventsGrid}>
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className={styles.skeletonEventCard} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicArtistProfileSkeleton; 