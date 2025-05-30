import React from 'react';
import './EventSection.css';

const EventBoxSkeleton = () => {
  return (
    <div className="event-box-container skeleton-loading">
      <div className="event-box">
        <div className="event-image-placeholder skeleton-background"></div>
        <div className="event-info">
          <div className="skeleton-line skeleton-hosting-club"></div>
          <div className="skeleton-line skeleton-title"></div>
          <div className="datetime-container">
            <div className="skeleton-line skeleton-date"></div>
            <div className="datetime-divider"></div>
            <div className="skeleton-line skeleton-time"></div>
          </div>
          <div className="venue-container">
            <div className="skeleton-line skeleton-venue"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventSectionSkeleton = () => {
  return (
    <div className="event-section skeleton-section">
      <div className="upcoming-events-heading">
        <div className="skeleton-line skeleton-heading"></div>
      </div>
      <div className="embla">
        <div className="embla__viewport">
          <div className="embla__container">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="embla__slide" style={{ opacity: 1 - (index * 0.2) }}>
                <EventBoxSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSectionSkeleton;