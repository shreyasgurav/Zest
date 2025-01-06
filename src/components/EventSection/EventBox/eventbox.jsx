import React from "react";
import "./eventbox.css";
import { useNavigate } from "react-router-dom";

function Eventbox({ event }) {
    const navigate = useNavigate();

    const handleSelect = () => {
        navigate(`/event-profile/${event.id}`);
    };

    const LocationIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
    );

    const formatTime = (dateTime) => {
        const date = new Date(dateTime);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).toUpperCase(); // Makes AM/PM uppercase
    };

    return (
        <div className="event-box-container" onClick={handleSelect}>
            <div className="event-box">
                {event.eventImage ? (
                    <img src={event.eventImage} alt="Event" />
                ) : (
                    <img src="/path/to/placeholder.jpg" alt="Placeholder" />
                )}

                <div className="event-info">
                    <p className="hosting-club">By {event.hostingClub}</p>
                    <h3>{event.eventTitle}</h3>
                    <div className="datetime-container">
                        <p>{new Date(event.eventDateTime).toLocaleDateString()}</p>
                        <div className="datetime-divider"></div>
                        <p>{formatTime(event.eventDateTime)}</p>
                    </div>
                    <div className="venue-container">
                        <LocationIcon />
                        <p>{event.eventVenue}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Eventbox;