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
        hostingClub: '',
        aboutEvent: '',
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
        if (eventData.type === 'workshop') {
            onSubmit({
                ...eventData,
                isWorkshop: true
            });
        } else {
            onSubmit(eventData);
        }
        onClose();
    };

    return (
        <div className="event-form-popup">
            <form onSubmit={handleEventSubmit}>
                <h2>Add Event/Workshop</h2>
                <label>
                    <p>Type:</p>
                    <select 
                        name="type" 
                        value={eventData.type} 
                        onChange={handleEventChange}
                        required
                    >
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
                <label>
                    <p>Hosting Club:</p>
                    <input 
                        type="text" 
                        name="hostingClub" 
                        value={eventData.hostingClub} 
                        onChange={handleEventChange} 
                        required 
                    />
                </label>
                <label>
                    <p>About Event</p>
                    <textarea
                        name="aboutEvent"
                        value={eventData.aboutEvent}
                        onChange={handleEventChange}
                        required
                        placeholder="Write a description about your event..."
                        rows="4"
                    />
                </label>
                <button type="submit">Submit</button>
                <button type="button" onClick={onClose}>Cancel</button>
            </form>
        </div>
    );
};

export default AddEventForm;