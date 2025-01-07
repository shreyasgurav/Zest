import React from "react";
import "./workshopbox.css";
import { useNavigate } from "react-router-dom";

function WorkshopBox({ workshop }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/workshop-profile/${workshop.id}`);
  };

  const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
);

  if (!workshop) {
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
    <div className="workshop-box-container" onClick={handleClick}>
      <div className="workshop-box">
        {workshop.eventImage && <img src={workshop.eventImage} alt="Workshop" />}

        <div className="workshop-info">
            <p className="hosting-club">By {workshop.hostingClub}</p>
             <h3>{workshop.eventTitle}</h3>
             <div className="datetime-container">
            <p>{new Date(workshop.eventDateTime).toLocaleDateString()}</p>
            <div className="datetime-divider"></div>
            <p>{formatTime(workshop.eventDateTime)}</p>
          </div>
          <div className="venue-container">
            <LocationIcon />
            <p>{workshop.eventVenue}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkshopBox;