import React, { useState } from "react";
import "./AddEventForm.css";

const AddEventForm = ({ onClose, onSubmit }) => {
  const [eventData, setEventData] = useState({
    event_type: "",
    event_image: "",
    event_title: "",
    event_date_time: "",
    event_venue: "",
    event_registration_link: "",
    hosting_club: "",
    about_event: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventData({
      ...eventData,
      [name]: value,
    });
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
        const response = await fetch("http://localhost:5000/api/add-event", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(eventData),
        });

        const data = await response.json();

        if (response.ok) {
            setSuccessMessage("Event added successfully!");
            if (onSubmit) onSubmit(); // Call the callback to refresh events
            onClose();
        } else {
            setError(data.message || "Failed to add event");
        }
    } catch (error) {
        console.error("Error:", error);
        setError("Connection error. Please try again.");
    } finally {
        setLoading(false);
    }
        // Notify the parent to add the event
        onSubmit(eventData);

        // Reset the form
        setEventData({
          event_type: "",
          event_image: "",
          event_title: "",
          event_date_time: "",
          event_venue: "",
          event_registration_link: "",
          hosting_club: "",
          about_event: "",
        });
        
        onClose();

  };

  return (
    <div className="modal-overlay">
      <div className="event-form-popup">
        <form onSubmit={handleEventSubmit}>
          <h2 className="modal-title">Add Event</h2>

          {successMessage && <p className="success-message">{successMessage}</p>}
          {error && <p className="error-message">{error}</p>}

          <div className="form-group">
            <label htmlFor="event_type">Event Type</label>
            <select
              id="event_type"
              name="event_type"
              value={eventData.event_type}
              onChange={handleEventChange}
              required
            >
              <option value="">Select Event Type</option>
              <option value="event">Event</option>
              <option value="workshop">Workshop</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="event_image">Event Profile Image Link</label>
            <input
              type="url"
              id="event_image"
              name="event_image"
              value={eventData.event_image}
              onChange={handleEventChange}
              placeholder="Enter image link (e.g., https://example.com/image.jpg)"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event_title">Event Title</label>
            <input
              type="text"
              id="event_title"
              name="event_title"
              value={eventData.event_title}
              onChange={handleEventChange}
              placeholder="Enter event title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event_date_time">Event Date and Time</label>
            <input
              type="datetime-local"
              id="event_date_time"
              name="event_date_time"
              value={eventData.event_date_time}
              onChange={handleEventChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event_venue">Event Venue</label>
            <input
              type="text"
              id="event_venue"
              name="event_venue"
              value={eventData.event_venue}
              onChange={handleEventChange}
              placeholder="Enter event venue"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event_registration_link">Event Registration Link</label>
            <input
              type="url"
              id="event_registration_link"
              name="event_registration_link"
              value={eventData.event_registration_link}
              onChange={handleEventChange}
              placeholder="https://example.com/register"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="hosting_club">Hosting Club</label>
            <input
              type="text"
              id="hosting_club"
              name="hosting_club"
              value={eventData.hosting_club}
              onChange={handleEventChange}
              placeholder="Enter hosting club"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="about_event">About Event</label>
            <textarea
              id="about_event"
              name="about_event"
              value={eventData.about_event}
              onChange={handleEventChange}
              placeholder="Write a brief description of the event..."
              rows="4"
              required
            ></textarea>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
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
