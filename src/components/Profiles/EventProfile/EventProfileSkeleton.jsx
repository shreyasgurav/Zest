import React from 'react';
import './EventProfile.css';

const EventProfileSkeleton = () => {
  return (
    <div className="skeleton-container">
      <div className="skeleton-content">
        {/* Image and Info Section */}
        <div className="skeleton-main">
          {/* Image Skeleton */}
          <div className="skeleton-image pulse"></div>

          {/* Info Box Skeleton */}
          <div className="skeleton-info-box">
            <div className="skeleton-title pulse"></div>
            <div className="skeleton-hosting-club pulse"></div>
            
            {/* Event Details */}
            <div className="skeleton-detail pulse"></div>
            <div className="skeleton-detail pulse"></div>
            <div className="skeleton-detail pulse"></div>
            
            {/* Button */}
            <div className="skeleton-button pulse"></div>
          </div>
        </div>

        {/* About Event Section */}
        <div className="skeleton-about">
          <div className="skeleton-about-title pulse"></div>
          <div className="skeleton-about-content pulse"></div>
        </div>

        {/* Event Guide Section */}
        <div className="skeleton-guide">
          <div className="skeleton-guide-title pulse"></div>
          <div className="skeleton-guide-details">
            {/* Guide Items */}
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton-guide-item">
                <div className="skeleton-guide-icon pulse"></div>
                <div className="skeleton-guide-info">
                  <div className="skeleton-guide-label pulse"></div>
                  <div className="skeleton-guide-value pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventProfileSkeleton;