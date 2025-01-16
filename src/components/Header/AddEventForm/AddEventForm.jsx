// AddEventForm.jsx
import React, { useState } from "react";
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import './AddEventForm.css';

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
      const eventDataWithTimestamp = {
        ...eventData,
        created_at: new Date().toISOString(),
        event_date_time: new Date(eventData.event_date_time).toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Changed "Events" to "events" to match your collection name
      const eventsCollectionRef = collection(db, "events");
      const docRef = await addDoc(eventsCollectionRef, eventDataWithTimestamp);

      const typeText = 
        eventData.event_type === 'workshop' ? 'Workshop' : 
        eventData.event_type === 'experiences' ? 'Experiences' : 'Event';
      
      setSuccessMessage(`${typeText} added successfully!`);

      // Reset form
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

      if (onSubmit) {
        onSubmit({ id: docRef.id, ...eventDataWithTimestamp });
      }
      
      onClose();
    } catch (error) {
      console.error("Error adding document: ", error);
      setError(error.message || "Failed to add event. Please try again.");
    } finally {
      setLoading(false);
    }
};









  return (
    <div className="event-modal-overlay">
      <div className="event-form-popup">
        <form onSubmit={handleEventSubmit} className="event-form">
          <h2 className="event-form-title">Add Event</h2>

          {successMessage && (
            <div className="event-form-success-message">
              <span>✓</span> {successMessage}
            </div>
          )}
          
          {error && (
            <div className="event-form-error-message">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_type">
              Event Type <span className="required">*</span>
            </label>
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
            <label className="event-form-label" htmlFor="event_image">
              Event Profile Image Link
            </label>
            <input
              type="url"
              id="event_image"
              name="event_image"
              value={eventData.event_image}
              onChange={handleEventChange}
              placeholder="Enter image link (e.g., https://example.com/image.jpg)"
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="event_title">
              Event Title <span className="required">*</span>
            </label>
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
            <label className="event-form-label" htmlFor="event_date_time">
              Event Date and Time <span className="required">*</span>
            </label>
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
            <label className="event-form-label" htmlFor="event_venue">
              Event Venue <span className="required">*</span>
            </label>
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
            <label className="event-form-label" htmlFor="event_registration_link">
              Event Registration Link
            </label>
            <input
              type="url"
              id="event_registration_link"
              name="event_registration_link"
              value={eventData.event_registration_link}
              onChange={handleEventChange}
              placeholder="https://example.com/register"
              className="event-form-input"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label" htmlFor="hosting_club">
              Hosting Club <span className="required">*</span>
            </label>
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
            <label className="event-form-label" htmlFor="about_event">
              About Event <span className="required">*</span>
            </label>
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
            <button 
              type="submit" 
              className="event-form-submit-btn" 
              disabled={loading}
            >
              {loading ? (
                <span className="loading-spinner">
                  <span className="spinner"></span> Submitting...
                </span>
              ) : (
                "Submit"
              )}
            </button>
            <button 
              type="button" 
              className="event-form-cancel-btn" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEventForm;