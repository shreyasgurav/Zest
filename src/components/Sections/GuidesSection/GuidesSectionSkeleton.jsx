import React from 'react';
import './GuidesSection.css';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const GuideBoxSkeleton = () => {
  return (
    <div className="guides-box-wrapper skeleton-loading">
      <div className="guides-box-card">
        <div className="guides-box-image-placeholder"></div>
        <div className="guides-box-info">
          <div className="skeleton-title"></div>
        </div>
      </div>
    </div>
  );
};

const GuidesSectionSkeleton = () => {
  return (
    <div className="experiences-section">
      <div className="experiences-section-heading">
        <h1 className="upcoming-experiences-heading">The Bombay Guide</h1>
        <span className="see-all-link">See All</span>
      </div>
      <div className="embla-container">
        <button className="embla-button embla-button-prev embla-button-disabled">
          <FiChevronLeft />
        </button>

        <section className="embla">
          <div className="embla__viewport">
            <div className="embla__container">
              {[1, 2, 3, 4].map((index) => (
                <div className="embla__slide" key={index}>
                  <GuideBoxSkeleton />
                </div>
              ))}
            </div>
          </div>
        </section>

        <button className="embla-button embla-button-next embla-button-disabled">
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

export default GuidesSectionSkeleton;
