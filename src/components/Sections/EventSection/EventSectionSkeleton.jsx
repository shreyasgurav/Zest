import React from 'react';
import './EventSection.css';
import './eventbox.css';

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
    <div className="event-section">
      <div className="event-section-heading">
        <h1 className="upcoming-events-heading">Upcoming Events</h1>
        <a href="/all-events" className="see-all-link">
          See All
        </a>
      </div>
      <section className="embla">
        <div className="embla__viewport">
          <div className="embla__container">
            {[...Array(3)].map((_, index) => (
              <div className="embla__slide" key={index}>
                <EventBoxSkeleton />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default EventSectionSkeleton;