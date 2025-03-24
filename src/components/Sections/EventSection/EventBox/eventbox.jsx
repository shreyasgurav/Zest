// EventBox.jsx
import React, { useEffect } from "react";
import "./EventBox.css";
import { useNavigate } from "react-router-dom";
import { db } from "../../../firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { FaTrash } from 'react-icons/fa';
import { getAuth } from 'firebase/auth';

function EventBox({ event, onDelete }) {
    const navigate = useNavigate();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const isEventCreator = currentUser && currentUser.uid === event?.organizationId;

    useEffect(() => {
        // Check if event has passed
        const checkEventTime = () => {
            if (!event?.event_date || !event?.event_time) return;

            const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
            const now = new Date();

            if (eventDateTime < now) {
                handleEventDeletion();
            }
        };

        checkEventTime();
        // Check every minute
        const interval = setInterval(checkEventTime, 60000);

        return () => clearInterval(interval);
    }, [event]);

    const handleEventDeletion = async () => {
        try {
            await deleteDoc(doc(db, "events", event.id));
            if (onDelete) {
                onDelete(event.id);
            }
        } catch (error) {
            console.error("Error deleting expired event:", error);
        }
    };

    const truncateText = (text, wordLimit) => {
        if (!text) return "";
        const words = text.trim().split(/\s+/);
        if (words.length > wordLimit) {
            return words.slice(0, wordLimit).join(' ') + '...';
        }
        return text;
    };

    const handleSelect = () => {
        navigate(`/event-profile/${event.id}`);
    };

    const handleManualDelete = async (e) => {
        e.stopPropagation();
        if (!isEventCreator) return;

        try {
            if (window.confirm("Are you sure you want to delete this event?")) {
                await handleEventDeletion();
            }
        } catch (error) {
            console.error("Error deleting event:", error);
            alert("Failed to delete event. Please try again.");
        }
    };

    const LocationIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
    );

    const formatDate = (dateString) => {
        if (!dateString) return "No Date Available";
        
        try {
            const [year, month, day] = dateString.split('-');
            const date = new Date(year, month - 1, day);
            
            if (isNaN(date.getTime())) {
                return "Invalid Date";
            }
            
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error("Error formatting date:", error);
            return "Date Format Error";
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return "";
        return new Date(`2000/01/01 ${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const formattedDate = formatDate(event?.event_date);
    const formattedTime = formatTime(event?.event_time);
    const dateTimeDisplay = formattedTime ? `${formattedDate}` : formattedDate;

    return (
        <div className="event-box-container" onClick={handleSelect}>
            <div className="event-box">
                {isEventCreator && (
                    <div className="delete-button" onClick={handleManualDelete}>
                        <FaTrash />
                    </div>
                )}
                {event.event_image ? (
                    <img 
                        src={event.event_image} 
                        alt={event.eventTitle}
                        className="event-image"
                    />
                ) : (
                    <div className="event-image-placeholder">
                        No Image Available
                    </div>
                )}

                <div className="event-info">
                    <h3>{truncateText(event.title || event.eventTitle, 20)}</h3>
                    
                    <div className="datetime-container">
                        <p>{dateTimeDisplay}</p>
                    </div>

                    <div className="venue-container">
                        <LocationIcon />
                        <p>{truncateText(event.event_venue || event.eventVenue, 14)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventBox;