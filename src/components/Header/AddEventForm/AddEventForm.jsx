import React, { useState, useEffect } from "react";
import { db, storage } from "../PersonLogo/components/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import "./AddEventForm.css"; // Make sure to import the CSS

const AddEventForm = ({ onClose }) => {
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("event"); // Default to "event"
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [aboutEvent, setAboutEvent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [orgName, setOrgName] = useState("");
  const [eventImage, setEventImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [eventCategory, setEventCategory] = useState("");
  const [eventLanguages, setEventLanguages] = useState("");
  const [eventDuration, setEventDuration] = useState("");
  const [eventAgeLimit, setEventAgeLimit] = useState("");

  // Fetch organization name from localStorage on component mount
  useEffect(() => {
    const storedOrgName = localStorage.getItem('orgName');
    if (storedOrgName) {
      setOrgName(storedOrgName);
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5242880) { // 5MB limit
        setMessage("Image size should be less than 5MB");
        return;
      }
      setEventImage(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    
    const fileExtension = file.name.split('.').pop();
    const fileName = `events/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!eventTitle.trim() || !eventType || !eventDateTime || !eventVenue) {
      setMessage("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      console.log("Current user:", user); // Debug log
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      let imageUrl = null;
      if (eventImage) {
        imageUrl = await uploadImage(eventImage);
      }

      const eventData = {
        title: eventTitle.trim(),
        event_type: eventType,
        event_category: eventCategory,
        hosting_club: orgName,
        event_date_time: eventDateTime,
        event_venue: eventVenue,
        event_registration_link: registrationLink,
        about_event: aboutEvent,
        event_image: imageUrl,
        event_languages: eventLanguages,
        event_duration: eventDuration,
        event_age_limit: eventAgeLimit,
        createdAt: serverTimestamp(),
        organizationId: user.uid,  // Make sure this matches what we check in EventBox
      };

      console.log("Saving event data:", eventData); // Debug log

      const eventsCollectionRef = collection(db, "events");
      await addDoc(eventsCollectionRef, eventData);
      
      setMessage("Event added successfully!");
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error("Error adding event:", error);
      setMessage(`Failed to add event: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-modal-overlay">
      <div className="event-form-popup">
        <h2 className="event-form-title">Add Event</h2>

        <div className="event-form-group">
            <label className="event-form-label">Event Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="event-form-input"
              disabled={loading}
            />
            {imagePreview && (
              <div className="image-preview">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '200px', 
                    maxHeight: '200px', 
                    objectFit: 'cover',
                    marginTop: '10px',
                    borderRadius: '8px'
                  }} 
                />
              </div>
            )}
          </div>

        <form onSubmit={handleSubmit}>
          <div className="event-form-group">
            <label className="event-form-label">Event Title:</label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="event-form-input"
              placeholder="Enter event title"
              disabled={loading}
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Event Type:</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="event-form-select"
              disabled={loading}
            >
              <option value="event">Event</option>
              <option value="workshop">Workshop</option>
              <option value="experiences">Experience</option>
            </select>
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Hosting Organization:</label>
            <input
              type="text"
              value={orgName}
              className="event-form-input"
              disabled={true}
              placeholder="Complete your organization profile first"
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Date and Time:</label>
            <input
              type="datetime-local"
              value={eventDateTime}
              onChange={(e) => setEventDateTime(e.target.value)}
              className="event-form-input"
              disabled={loading}
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Venue:</label>
            <input
              type="text"
              value={eventVenue}
              onChange={(e) => setEventVenue(e.target.value)}
              className="event-form-input"
              placeholder="Enter event venue"
              disabled={loading}
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Registration Link:</label>
            <input
              type="url"
              value={registrationLink}
              onChange={(e) => setRegistrationLink(e.target.value)}
              className="event-form-input"
              placeholder="Enter registration link"
              disabled={loading}
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">About Event:</label>
            <textarea
              value={aboutEvent}
              onChange={(e) => setAboutEvent(e.target.value)}
              className="event-form-textarea"
              placeholder="Enter event description"
              rows="4"
              disabled={loading}
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Event Category:</label>
            <input
              type="text"
              value={eventCategory}
              onChange={(e) => setEventCategory(e.target.value)}
              className="event-form-input"
              placeholder="e.g., Music Show, Speaker Session, Comedy Show"
              required
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Event Languages:</label>
            <input
              type="text"
              value={eventLanguages}
              onChange={(e) => setEventLanguages(e.target.value)}
              className="event-form-input"
              placeholder="e.g., Hindi, Punjabi"
              required
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Event Duration:</label>
            <input
              type="text"
              value={eventDuration}
              onChange={(e) => setEventDuration(e.target.value)}
              className="event-form-input"
              placeholder="e.g., 4 Hours"
              required
            />
          </div>

          <div className="event-form-group">
            <label className="event-form-label">Age Requirement:</label>
            <input
              type="text"
              value={eventAgeLimit}
              onChange={(e) => setEventAgeLimit(e.target.value)}
              className="event-form-input"
              placeholder="e.g., 16 yrs & above"
              required
            />
          </div>

          

          <div className="event-form-actions">
            <button
              type="submit"
              className="event-form-submit-btn"
              disabled={loading || !orgName}
            >
              {loading ? "Adding..." : "Add Event"}
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

          {message && (
            <div 
              className={
                message.includes("success") 
                  ? "event-form-success-message" 
                  : "event-form-error-message"
              }
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddEventForm;