// src/components/EventSection/EventBox/eventbox.jsx
import React from "react";
import "./eventbox.css";

function Eventbox({ event }) {
    // Check if event is defined and has the required properties
    if (!event || !event.eventTitle) {
        return null; // Return null if event data is not valid
    }

    console.log("Event Registration Link:", event.eventRegistrationLink); // Debugging line

    return (
        <div className="event-box-container">
            <div className="event-box">
                {event.eventImage && <img src={URL.createObjectURL(event.eventImage)} alt="Event" />} {/* Display the image */}
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