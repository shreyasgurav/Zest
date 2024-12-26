import React, { useState } from "react";
import "./AddEventForm.css";

const AddEventForm = ({ onClose, onSubmit }) => {
    const [eventData, setEventData] = useState({
        eventImage: null,
        eventTitle: "",
        eventDateTime: "",
        eventVenue: "",
        eventRegistrationLink: "",
        type: "event", // Default type
        hostingClub: "",
        aboutEvent: "",
    });

    const handleEventChange = (e) => {
        const { name, value } = e.target;
        setEventData({
            ...eventData,
            [name]: value,
        });
    };

    const handleEventSubmit = (e) => {
        e.preventDefault();
        const eventDetails = eventData.type === "workshop" ? { ...eventData, isWorkshop: true } : eventData;
        onSubmit(eventDetails);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="event-form-popup">
                <form onSubmit={handleEventSubmit}>
                    <h2 className="modal-title">Add Event or Workshop</h2>

                    <div className="form-group">
                        <label htmlFor="type">Type</label>
                        <select
                            id="type"
                            name="type"
                            value={eventData.type}
                            onChange={handleEventChange}
                            required
                        >
                            <option value="event">Event</option>
                            <option value="workshop">Workshop</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="eventImage">Event Profile Image</label>
                        <input
                            type="file"
                            id="eventImage"
                            name="eventImage"
                            onChange={(e) => setEventData({ ...eventData, eventImage: e.target.files[0] })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="eventTitle">Event Title</label>
                        <input
                            type="text"
                            id="eventTitle"
                            name="eventTitle"
                            value={eventData.eventTitle}
                            onChange={handleEventChange}
                            placeholder="Enter event title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="eventDateTime">Event Date and Time</label>
                        <input
                            type="datetime-local"
                            id="eventDateTime"
                            name="eventDateTime"
                            value={eventData.eventDateTime}
                            onChange={handleEventChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="eventVenue">Event Venue</label>
                        <input
                            type="text"
                            id="eventVenue"
                            name="eventVenue"
                            value={eventData.eventVenue}
                            onChange={handleEventChange}
                            placeholder="Enter event venue"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="eventRegistrationLink">Event Registration Link</label>
                        <input
                            type="url"
                            id="eventRegistrationLink"
                            name="eventRegistrationLink"
                            value={eventData.eventRegistrationLink}
                            onChange={handleEventChange}
                            placeholder="https://example.com/register"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="hostingClub">Hosting Club</label>
                        <input
                            type="text"
                            id="hostingClub"
                            name="hostingClub"
                            value={eventData.hostingClub}
                            onChange={handleEventChange}
                            placeholder="Enter hosting club"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="aboutEvent">About Event</label>
                        <textarea
                            id="aboutEvent"
                            name="aboutEvent"
                            value={eventData.aboutEvent}
                            onChange={handleEventChange}
                            placeholder="Write a brief description of the event..."
                            rows="4"
                            required
                        ></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn">
                            Submit
                        </button>
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEventForm;
