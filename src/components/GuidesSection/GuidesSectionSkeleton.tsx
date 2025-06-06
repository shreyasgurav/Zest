import React from 'react';
import styles from './GuidesSection.module.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const GuideBoxSkeleton = () => {
  return (
    <div className={`${styles['guides-box-wrapper']} ${styles['skeleton-loading']}`}>
      <div className={styles['guides-box-card']}>
        <div className={styles['guides-box-image-placeholder']}></div>
        <div className={styles['guides-box-info']}>
          <div className={styles['skeleton-title']}></div>
        </div>
      </div>
    </div>
  );
};

const GuidesSectionSkeleton = () => {
  return (
    <div className={styles['experiences-section']}>
      <div className={styles['experiences-section-heading']}>
        <h1 className={styles['upcoming-experiences-heading']}>The Bombay Guide</h1>
        <span className={styles['see-all-link']}>See All</span>
      </div>
      <div className={styles['embla-container']}>
        <button className={`${styles['embla-button']} ${styles['embla-button-prev']} ${styles['embla-button-disabled']}`}>
          <FiChevronLeft />
        </button>

        <section className={styles.embla}>
          <div className={styles['embla__viewport']}>
            <div className={styles['embla__container']}>
              {[1, 2, 3, 4].map((index) => (
                <div className={styles['embla__slide']} key={index}>
                  <GuideBoxSkeleton />
                </div>
              ))}
            </div>
          </div>
        </section>

        <button className={`${styles['embla-button']} ${styles['embla-button-next']} ${styles['embla-button-disabled']}`}>
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

export default GuidesSectionSkeleton; 