'use client';

import React from 'react';
import styles from './ActivityProfile.module.css';

function ActivityProfileSkeleton() {
  return (
    <div className={styles.activityProfileContainer}>
      <div className={styles.activityContent}>
        <div className={`${styles.activityProfileImage} ${styles.skeleton}`} />
        <div className={styles.activityInfoBox}>
          <div className={styles.activityInfo}>
            <div className={`${styles.skeletonTitle} ${styles.skeleton}`} />
            <div className={`${styles.skeletonText} ${styles.skeleton}`} />
            <div className={`${styles.skeletonText} ${styles.skeleton}`} />
            <div className={`${styles.skeletonText} ${styles.skeleton}`} />
            <div className={`${styles.skeletonText} ${styles.skeleton}`} />
            <div className={`${styles.skeletonButton} ${styles.skeleton}`} />
          </div>
        </div>
      </div>
      
      <div className={styles.aboutActivity}>
        <div className={`${styles.skeletonTitle} ${styles.skeleton}`} />
        <div className={`${styles.skeletonParagraph} ${styles.skeleton}`} />
        <div className={`${styles.skeletonParagraph} ${styles.skeleton}`} />
      </div>
      
      <div className={styles.activityGuide}>
        <div className={`${styles.skeletonTitle} ${styles.skeleton}`} />
        <div className={styles.guideDetails}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.guideItem}>
              <div className={`${styles.skeletonIcon} ${styles.skeleton}`} />
              <div className={styles.guideInfo}>
                <div className={`${styles.skeletonText} ${styles.skeleton}`} />
                <div className={`${styles.skeletonText} ${styles.skeleton}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.scheduleSection}>
        <div className={`${styles.skeletonTitle} ${styles.skeleton}`} />
        <div className={styles.scheduleGrid}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className={styles.scheduleDay}>
              <div className={`${styles.skeletonText} ${styles.skeleton}`} />
              <div className={`${styles.skeletonText} ${styles.skeleton}`} />
              <div className={`${styles.skeletonText} ${styles.skeleton}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ActivityProfileSkeleton; 