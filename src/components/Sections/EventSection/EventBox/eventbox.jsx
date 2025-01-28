import React, { useState, useEffect } from "react";
import "./EventBox.css";
import { useNavigate } from "react-router-dom";
import { db } from "../../../Header/PersonLogo/components/firebase";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { FaTrash } from 'react-icons/fa';
import { getAuth } from 'firebase/auth';

function EventBox({ event, onDelete }) {
    const navigate = useNavigate();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    // Simple check: is the current user the creator of this event?
    const isEventCreator = currentUser && currentUser.uid === event?.organizationId;
    
    console.log({
        currentUserId: currentUser?.uid,
        eventCreatorId: event?.organizationId,
        isMatch: isEventCreator
    });

    // Check if time_slots is defined and is an array
    const timeSlots = Array.isArray(event?.time_slots) ? event.time_slots : [];
    
    // Get the first date and determine if there are multiple dates
    const firstDate = timeSlots.length > 0 ? timeSlots[0].date : "No Date Available";
    const dateText = timeSlots.length > 1 ? `${firstDate} onwards` : firstDate;

    const handleSelect = () => {
        navigate(`/event-profile/${event.id}`);
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!isEventCreator) return; // Only allow if it's their event

        try {
            if (window.confirm("Are you sure you want to delete this event?")) {
                await deleteDoc(doc(db, "events", event.id));
                if (onDelete) {
                    onDelete(event.id);
                }
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
                {/* Only show delete button if current user created this event */}
                {isEventCreator && (
                    <div className="delete-button" onClick={handleDelete}>
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
                    <p className="hosting-club">By {event.hostingClub}</p>
                    <h3>{event.eventTitle}</h3>
                    <div className="datetime-container">
                        <p>{dateText}</p>
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

export default EventBox;