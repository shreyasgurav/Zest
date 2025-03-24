import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './EventProfile.css';
import { FaBookmark, FaMapMarkerAlt, FaLanguage, FaClock, FaUsers, FaCalendarAlt } from 'react-icons/fa';
import EventProfileSkeleton from './EventProfileSkeleton';

function EventProfile() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const eventDoc = doc(db, "events", id);
                const eventSnapshot = await getDoc(eventDoc);
                
                if (eventSnapshot.exists()) {
                    setEvent({
                        id: eventSnapshot.id,
                        ...eventSnapshot.data()
                    });
                } else {
                    setError("Event not found");
                }
            } catch (err) {
                console.error("Error fetching event:", err);
                setError("Error loading event");
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    const handleBookNow = () => {
        if (event?.event_external_link) {
            window.open(event.event_external_link, '_blank');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "No Date Available";
        
        try {
          // Parse the date string
          const [year, month, day] = dateString.split('-');
          const date = new Date(year, month - 1, day);
          
          // Check if the date is valid
          if (isNaN(date.getTime())) {
            return "Invalid Date";
          }
          
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } catch (error) {
          console.error("Error formatting date:", error);
          return "Date Format Error";
        }
      };

    const formatTime = (timeString) => {
        return new Date(`2000/01/01 ${timeString}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    if (loading) {
        return <EventProfileSkeleton />;
    }

    if (error || !event) {
        return <div className="error-message">{error || "Event not found"}</div>;
    }

    return (
        <div className="event-profile-container">
            <div className="event-content">
                <div className="event-profile-image">
                    {event.event_image ? (
                        <img src={event.event_image} alt={event.title} />
                    ) : (
                        <div className="no-image">No Image Available</div>
                    )}
                </div>
                <div className="event-info-box">
                    <div className="event-info">
                        <h2>{event.title}</h2>
                        <div className="event-detail">
                            <FaBookmark /> {event.event_category}
                        </div>
                        <div className="event-detail">
                            <FaCalendarAlt /> {formatDate(event.event_date)} from {formatTime(event.event_time)}
                        </div>
                        <div className="event-detail">
                            <FaMapMarkerAlt /> {event.event_venue}
                        </div>
                        <div className="event-price">
                            <button 
                                className="book-now-button" 
                                onClick={handleBookNow}
                            >
                                Find Tickets
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="about-event">
                <h3>About the Event</h3>
                <p>{event.about_event || "Join us for an engaging event designed to enhance your skills and creativity. Don't miss out on this opportunity!"}</p>
            </div>
            
            <div className="event-guide">
                <h3>Event Guide</h3>
                <div className="guide-details">
                    <div className="guide-item">
                        <div className="guide-icon">
                            <FaLanguage />
                        </div>
                        <div className="guide-info">
                            <span className="guide-label">Language</span>
                            <span className="guide-value">{event.event_languages}</span>
                        </div>
                    </div>
                    
                    <div className="guide-item">
                        <div className="guide-icon">
                            <FaClock />
                        </div>
                        <div className="guide-info">
                            <span className="guide-label">Duration</span>
                            <span className="guide-value">{event.event_duration}</span>
                        </div>
                    </div>
                    
                    <div className="guide-item">
                        <div className="guide-icon">
                            <FaUsers />
                        </div>
                        <div className="guide-info">
                            <span className="guide-label">Best Suited For Ages</span>
                            <span className="guide-value">{event.event_age_limit}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventProfile;