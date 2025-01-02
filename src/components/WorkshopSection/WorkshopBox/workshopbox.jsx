import React from "react";
import "./workshopbox.css";
import { useNavigate } from "react-router-dom";

function WorkshopBox({ workshop }) {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/workshop/${workshop.id}`);
    };

    if (!workshop || !workshop.eventTitle) {
        return null; // Return null if workshop data is not valid
    }

    return (
        <div className="workshop-box-container" onClick={handleClick}>
            <div className="workshop-box">
                {workshop.eventImage && <img src={URL.createObjectURL(workshop.eventImage)} alt="Workshop" />}
                <div className="workshop-info">
                    <h3>{workshop.eventTitle}</h3>
                    <p>Date: {new Date(workshop.eventDateTime).toLocaleDateString()}</p>
                    <p>Time: {new Date(workshop.eventDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p>Venue: {workshop.eventVenue}</p>
                </div>
                <button className="book-now-btn" onClick={() => window.open(workshop.eventRegistrationLink, "_blank")}>Book Now</button>
            </div>
        </div>
    );
}

export default WorkshopBox;
