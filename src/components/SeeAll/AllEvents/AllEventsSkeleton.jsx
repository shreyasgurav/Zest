// AllEventsSkeleton.jsx
import React from 'react';
import './AllEvents.css';

const EventBoxSkeleton = () => {
  return (
    <div className="event-box-container skeleton-loading" style={{ width: '100%', maxWidth: '400px' }}>
      <div className="event-box" style={{ width: '100%' }}>
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

const AllEventsSkeleton = () => {
  return (
    <div className="all-events-container skeleton-section">
      <div className="all-events-content">
        <h1 className="all-events-title skeleton-line skeleton-heading"></h1>
        <div className="events-grid">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="event-item" style={{ opacity: 1 - (index * 0.1) }}>
              <EventBoxSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllEventsSkeleton;
