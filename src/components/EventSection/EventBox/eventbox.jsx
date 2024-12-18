// src/components/EventSection/EventBox/eventbox.jsx
import React from "react";
import "./eventbox.css";
import { useNavigate } from "react-router-dom"; // Import useNavigate

function Eventbox({ event }) {
    const navigate = useNavigate(); // Initialize navigate

    const handleSelect = () => {
        navigate(`/event/${event.id}`); // Navigate to the event profile page
    };

    return (
        <div className="event-box-container" onClick={handleSelect}>
            <div className="event-box">
                {event.eventImage && <img src={URL.createObjectURL(event.eventImage)} alt="Event" />}
                <div className="event-info">
                    <h3>{event.eventTitle}</h3>
                    <p>Date: {new Date(event.eventDateTime).toLocaleDateString()}</p>
                    <p>Time: {new Date(event.eventDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p>Venue: {event.eventVenue}</p>
                </div>
                <button className="book-now-btn" onClick={() => window.open(event.eventRegistrationLink, "_blank")}>Book Now</button>
            </div>
        </div>
    );
}

export default Eventbox;