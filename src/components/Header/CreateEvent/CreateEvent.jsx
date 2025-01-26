import React, { useState, useEffect } from "react";
import { db, storage } from "../../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./CreateEvent.css";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("event");
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

  useEffect(() => {
    const storedOrgName = localStorage.getItem('orgName');
    if (storedOrgName) {
      setOrgName(storedOrgName);
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5242880) {
        setMessage("Image size should be less than 5MB");
        return;
      }
      setEventImage(file);
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
    return await getDownloadURL(storageRef);
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
        organizationId: user.uid,
      };

      const eventsCollectionRef = collection(db, "events");
      await addDoc(eventsCollectionRef, eventData);
      
      setMessage("Event created successfully!");
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error("Error creating event:", error);
      setMessage(`Failed to create event: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      <div className="create-event-container">
        <h1 className="page-title">Create Event</h1>
        
        <form onSubmit={handleSubmit} className="create-event-form">
          <div className="form-grid">
            {/* Left Column */}
            <div className="form-column">
              <div className="form-section">
                <h2>Event Details</h2>
                <div className="form-group">
                  <label>Event Title</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Event Category</label>
                  <input
                    type="text"
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value)}
                    placeholder="e.g., Music Show, Speaker Session, Comedy Show"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    required
                  >
                    <option value="event">Event</option>
                    <option value="workshop">Workshop</option>
                    <option value="experiences">Experience</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h2>Date & Time</h2>
                <div className="form-group">
                  <label>Event Date & Time</label>
                  <input
                    type="datetime-local"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Duration</label>
                  <input
                    type="text"
                    value={eventDuration}
                    onChange={(e) => setEventDuration(e.target.value)}
                    placeholder="e.g., 4 Hours"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="form-column">
              <div className="form-section">
                <h2>Location & Access</h2>
                <div className="form-group">
                  <label>Venue</label>
                  <input
                    type="text"
                    value={eventVenue}
                    onChange={(e) => setEventVenue(e.target.value)}
                    placeholder="Enter event venue"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Registration Link</label>
                  <input
                    type="url"
                    value={registrationLink}
                    onChange={(e) => setRegistrationLink(e.target.value)}
                    placeholder="Enter registration link"
                  />
                </div>

                <div className="form-group">
                  <label>Age Requirement</label>
                  <input
                    type="text"
                    value={eventAgeLimit}
                    onChange={(e) => setEventAgeLimit(e.target.value)}
                    placeholder="e.g., 16 yrs & above"
                    required
                  />
                </div>
              </div>

              <div className="form-section">
                <h2>Additional Information</h2>
                <div className="form-group">
                  <label>Event Languages</label>
                  <input
                    type="text"
                    value={eventLanguages}
                    onChange={(e) => setEventLanguages(e.target.value)}
                    placeholder="e.g., Hindi, Punjabi"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>About Event</label>
                  <textarea
                    value={aboutEvent}
                    onChange={(e) => setAboutEvent(e.target.value)}
                    placeholder="Enter event description"
                    rows="4"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section image-section">
            <h2>Event Image</h2>
            <div className="form-group">
              <label>Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className={`message ${message.includes("success") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Creating Event..." : "Create Event"}
            </button>
            <button 
              type="button" 
              className="cancel-button" 
              onClick={() => navigate('/')}
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

export default CreateEvent;