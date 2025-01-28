import React, { useState, useEffect } from "react";
import { db, storage } from "../../Header/PersonLogo/components/firebase";
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
  const [eventSlots, setEventSlots] = useState([
    { date: '', startTime: '', endTime: '' }
  ]);
  const [overallCapacity, setOverallCapacity] = useState(""); // State for overall capacity
  const auth = getAuth();

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

  const addTimeSlot = () => {
    setEventSlots([...eventSlots, { date: '', startTime: '', endTime: '' }]);
  };

  const removeTimeSlot = (index) => {
    const newSlots = eventSlots.filter((_, i) => i !== index);
    setEventSlots(newSlots);
  };

  const handleSlotChange = (index, field, value) => {
    const newSlots = [...eventSlots];
    newSlots[index][field] = value;
    setEventSlots(newSlots);
  };

  const validateSlots = () => {
    return eventSlots.every(slot => 
      slot.date && slot.startTime && slot.endTime && 
      new Date(`${slot.date} ${slot.endTime}`) > new Date(`${slot.date} ${slot.startTime}`)
    );
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
    
    if (!eventTitle.trim() || !eventVenue.trim() || !validateSlots() || !overallCapacity) {
      setMessage("Please fill in all required fields and ensure valid time slots");
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
        time_slots: eventSlots.map(slot => ({
          date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          available: true
        })),
        event_venue: eventVenue.trim(),
        about_event: aboutEvent.trim(),
        event_image: imageUrl,
        organizationId: auth.currentUser.uid,
        hosting_club: orgName,
        event_category: eventCategory.trim(),
        event_languages: eventLanguages.trim(),
        event_duration: eventDuration.trim(),
        event_age_limit: eventAgeLimit.trim(),
        overall_capacity: overallCapacity, // Store overall capacity
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
                placeholder="e.g., Music, Comedy, Tech"
                required
              />
            </div>

            <div className="form-group">
              <label>Maximum Capacity</label>
              <input
                type="number"
                value={overallCapacity}
                onChange={(e) => setOverallCapacity(e.target.value)}
                placeholder="Enter max attendees"
                min="1" // Ensure positive integer
                required
              />
            </div>
          </div>

          {/* Time Slots Section */}
          <div className="form-section">
            <h2>Event Schedule</h2>
            {eventSlots.map((slot, index) => (
              <div key={index} className="date-slot">
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                      required
                    />
                  </div>
                  {eventSlots.length > 1 && (
                    <button
                      type="button"
                      className="remove-date-button"
                      onClick={() => removeTimeSlot(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="add-date-button"
              onClick={addTimeSlot}
            >
              Add Another Time Slot
            </button>
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