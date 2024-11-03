// src/components/Header/AddEventForm/AddEventForm.jsx
import React, { useState } from 'react';
import "./AddEventForm.css";

const AddEventForm = ({ onClose, onSubmit }) => {
    const [eventData, setEventData] = useState({
        eventImage: null,
        eventTitle: '',
        eventDateTime: '',
        eventVenue: '',
        eventRegistrationLink: '',
        type: 'event', // Default type
    });

    const handleEventChange = (e) => {
        const { name, value } = e.target;
        setEventData({
            ...eventData,
            [name]: value
        });
    };

    const handleEventSubmit = (e) => {
        e.preventDefault();
        onSubmit(eventData); // Pass the event data to the parent component
        onClose(); // Close the form after submission
    };

    return (
        <div className="event-form-popup">
            <form onSubmit={handleEventSubmit}>
                <h2>Add Event/Workshop</h2>
                <label>
                    <p>Select Type:</p>
                    <select name="type" value={eventData.type} onChange={handleEventChange}>
                        <option value="event">Event</option>
                        <option value="workshop">Workshop</option>
                    </select>
                </label>
                <label>
                    <p>Event Profile Image:</p>
                    <input type="file" name="eventImage" onChange={(e) => setEventData({ ...eventData, eventImage: e.target.files[0] })} required />
                </label>
                <label>
                    <p>Event Title:</p>
                    <input type="text" name="eventTitle" value={eventData.eventTitle} onChange={handleEventChange} required />
                </label>
                <label>
                    <p>Event Date and Time:</p>
                    <input type="datetime-local" name="eventDateTime" value={eventData.eventDateTime} onChange={handleEventChange} required />
                </label>
                <label>
                    <p>Event Venue:</p>
                    <input type="text" name="eventVenue" value={eventData.eventVenue} onChange={handleEventChange} required />
                </label>
                <label>
                    <p>Event Registration Link:</p>
                    <input 
                        type="url" 
                        name="eventRegistrationLink" 
                        value={eventData.eventRegistrationLink} 
                        onChange={handleEventChange} 
                        required 
                        placeholder="https://example.com/register" 
                    />
                </label>
                <button type="submit">Submit</button>
                <button type="button" onClick={onClose}>Cancel</button>
            </form>
        </div>
    );
};

export default AddEventForm;