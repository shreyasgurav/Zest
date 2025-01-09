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
        const typeText = 
          eventData.event_type === 'workshop' ? 'Workshop' : 
          eventData.event_type === 'experiences' ? 'Experiences' : 'Event';
        setSuccessMessage(`${typeText} added successfully!`);
        if (onSubmit) onSubmit();
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
  };

  return (
    <div className="event-modal-overlay">
      <div className="event-form-popup">
        <form onSubmit={handleEventSubmit}>
          <h2 className="event-form-title">Add Event</h2>

          {successMessage && <p className="event-form-success-message">{successMessage}</p>}
          {error && <p className="event-form-error-message">{error}</p>}

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_type">Event Type</label>
            <select
              id="event_type"
              name="event_type"
              value={eventData.event_type}
              onChange={handleEventChange}
              required
              className="event-form-select"
            >
              <option value="">Select Event Type</option>
              <option value="event">Event</option>
              <option value="workshop">Workshop</option>
              <option value="experiences">Experiences</option>
            </select>
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_image">Event Profile Image Link</label>
            <input
              type="url"
              id="event_image"
              name="event_image"
              value={eventData.event_image}
              onChange={handleEventChange}
              placeholder="Enter image link (e.g., https://example.com/image.jpg)"
              required
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_title">Event Title</label>
            <input
              type="text"
              id="event_title"
              name="event_title"
              value={eventData.event_title}
              onChange={handleEventChange}
              placeholder="Enter event title"
              required
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_date_time">Event Date and Time</label>
            <input
              type="datetime-local"
              id="event_date_time"
              name="event_date_time"
              value={eventData.event_date_time}
              onChange={handleEventChange}
              required
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_venue">Event Venue</label>
            <input
              type="text"
              id="event_venue"
              name="event_venue"
              value={eventData.event_venue}
              onChange={handleEventChange}
              placeholder="Enter event venue"
              required
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_registration_link">Event Registration Link</label>
            <input
              type="url"
              id="event_registration_link"
              name="event_registration_link"
              value={eventData.event_registration_link}
              onChange={handleEventChange}
              placeholder="https://example.com/register"
              required
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="hosting_club">Hosting Club</label>
            <input
              type="text"
              id="hosting_club"
              name="hosting_club"
              value={eventData.hosting_club}
              onChange={handleEventChange}
              placeholder="Enter hosting club"
              required
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="about_event">About Event</label>
            <textarea
              id="about_event"
              name="about_event"
              value={eventData.about_event}
              onChange={handleEventChange}
              placeholder="Write a brief description of the event..."
              rows="4"
              required
              className="event-form-textarea"
            ></textarea>
          </div>

          <div className="event-form-actions">
            <button type="submit" className="event-form-submit-btn" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </button>
            <button type="button" className="event-form-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEventForm;