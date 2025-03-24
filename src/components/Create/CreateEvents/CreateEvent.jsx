// CreateEvent.jsx
import React, { useState, useEffect } from "react";
import { db, storage } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./CreateEvent.css";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState("");
  const [eventVenue, setEventVenue] = useState("");
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
  const [eventExternalLink, setEventExternalLink] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      setIsAuthorized(user?.email === 'shrreyasgurav@gmail.com');
    };

    checkAuth();
    const unsubscribe = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const storedOrgName = localStorage.getItem('orgName');
    if (storedOrgName) {
      setOrgName(storedOrgName);
    }
  }, []);

  if (!isAuthorized) {
    return (
      <div className="unauthorized-message-container">
        <div className="unauthorized-message">
          <h1>Unauthorized Access</h1>
          <p>You can't create anything because you are not Shreyas.</p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
    
    if (!eventTitle.trim() || !eventVenue.trim() || !eventExternalLink.trim() || !eventDate || !eventTime) {
      setMessage("Please fill in all required fields");
      return;
    }
  
    setLoading(true);
    setMessage("");
  
    try {
      let imageUrl = null;
      if (eventImage) {
        imageUrl = await uploadImage(eventImage);
      }
  
      const eventData = {
        title: eventTitle.trim(),
        event_type: "event",
        event_venue: eventVenue.trim(),
        about_event: aboutEvent.trim(),
        event_image: imageUrl,
        organizationId: auth.currentUser.uid,
        hosting_club: orgName,
        event_category: eventCategory.trim(),
        event_languages: eventLanguages.trim(),
        event_duration: eventDuration.trim(),
        event_age_limit: eventAgeLimit.trim(),
        event_external_link: eventExternalLink.trim(),
        event_date: eventDate,
        event_time: eventTime,
        createdAt: serverTimestamp(),
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
          {/* Image Upload Section */}
          <div className="form-section">
            <h2>Event Image</h2>
            <p className="image-tip">Please upload a square image for best results (max 5MB)</p>
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

          {/* Event Details */}
          <div className="form-section">
            <h2>Event Details</h2>
            <div className="form-group">
              <label>Event Name</label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event name"
                required
              />
            </div>

            <div className="form-group">
              <label>Event Category</label>
              <input
                type="text"
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
                placeholder="e.g., Music, Comedy, Tech"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Event Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Time</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>External Booking Link</label>
              <input
                type="url"
                value={eventExternalLink}
                onChange={(e) => setEventExternalLink(e.target.value)}
                placeholder="e.g., https://bookmyshow.com/event/..."
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className="form-section">
            <h2>Location</h2>
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
          </div>

          {/* About Event */}
          <div className="form-section">
            <h2>About Event</h2>
            <div className="form-group">
              <textarea
                value={aboutEvent}
                onChange={(e) => setAboutEvent(e.target.value)}
                placeholder="Enter event description"
                rows="4"
                required
              />
            </div>
          </div>

          {/* Event Guide */}
          <div className="form-section">
            <h2>Event Guide</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Duration</label>
                <input
                  type="text"
                  value={eventDuration}
                  onChange={(e) => setEventDuration(e.target.value)}
                  placeholder="e.g., 2 Hours"
                  required
                />
              </div>

              <div className="form-group">
                <label>Age Requirement</label>
                <input
                  type="text"
                  value={eventAgeLimit}
                  onChange={(e) => setEventAgeLimit(e.target.value)}
                  placeholder="e.g., 16+ years"
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Languages</label>
                <input
                  type="text"
                  value={eventLanguages}
                  onChange={(e) => setEventLanguages(e.target.value)}
                  placeholder="e.g., English, Hindi"
                  required
                />
              </div>
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