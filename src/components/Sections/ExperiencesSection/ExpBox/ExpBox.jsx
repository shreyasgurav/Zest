import React from "react";
import "./ExpBox.css";
import { useNavigate } from "react-router-dom";

function ExpBox({ experiences }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/experiences-profile/${experiences.id}`);
  };

  const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
);

  if (!experiences) {
    return null;
  }

  const formatTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toUpperCase();
  };

  return (
    <div className="experiences-box-container" onClick={handleClick}>
      <div className="experiences-box">
        {experiences.eventImage && <img src={experiences.eventImage} alt="Experiences" />}

        <div className="experiences-info">
            <p className="hosting-club">By {experiences.hostingClub}</p>
             <h3>{experiences.eventTitle}</h3>
             <div className="datetime-container">
            <p>{new Date(experiences.eventDateTime).toLocaleDateString()}</p>
            <div className="datetime-divider"></div>
            <p>{formatTime(experiences.eventDateTime)}</p>
          </div>
          <div className="venue-container">
            <LocationIcon />
            <p>{experiences.eventVenue}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpBox;