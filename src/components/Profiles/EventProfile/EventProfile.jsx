import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../Header/PersonLogo/components/firebase'; // Adjust path as needed
import { doc, getDoc } from 'firebase/firestore';
import './EventProfile.css';
import { FaBookmark, FaCalendarAlt, FaMapMarkerAlt, FaLanguage, FaClock, FaUsers } from 'react-icons/fa';

function EventProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const eventDoc = doc(db, "events", id);
                const eventSnapshot = await getDoc(eventDoc);
                
                if (eventSnapshot.exists()) {
                    const data = eventSnapshot.data();
                    console.log("Fetched event data:", data); // Debug log
                    
                    setEvent({
                        id: eventSnapshot.id,
                        eventTitle: data.title,
                        type: data.event_type,
                        eventDateTime: data.event_date_time,
                        eventVenue: data.event_venue,
                        eventRegistrationLink: data.event_registration_link,
                        hostingClub: data.hosting_club,
                        aboutEvent: data.about_event,
                        eventImage: data.event_image,
                        event_category: data.event_category,
                        event_languages: data.event_languages,
                        event_duration: data.event_duration,
                        event_age_limit: data.event_age_limit,
                        time_slots: data.time_slots
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

    if (loading) {
        return <div className="loading-message">Loading event details...</div>;
    }

    if (error || !event) {
        return <div className="error-message">{error || "Event not found"}</div>;
    }

    const { eventImage, eventTitle, type, eventDateTime, eventVenue, eventRegistrationLink, hostingClub, aboutEvent, time_slots } = event;

    const handleBookNow = () => {
        navigate(`/book-event/${id}`);
    };

    // Format all dates for display
    const formattedDates = Array.isArray(time_slots) ? time_slots.map(slot => (
        <div key={slot.date}>
            <p>{slot.date}</p> {/* Show only the date */}
        </div>
    )) : null;

    // Determine the date text for the profile
    const dateText = time_slots.length > 1 ? `${time_slots[0].date} onwards` : time_slots[0]?.date;

    return (
        <div className="event-profile-container">
            <div className="event-content">
                <div className="event-profile-image">
                    {eventImage ? (
                        <img src={eventImage} alt={eventTitle} />
                    ) : (
                        <div className="no-image">No Image Available</div>
                    )}
                </div>
                <div className="event-info-box">
                    <div className="event-info">
                        <h2>{eventTitle}</h2>
                        <div className="hosting-club">By {hostingClub}</div>
                        <div className="event-detail">
                            <FaBookmark /> {event.event_category}
                        </div>
                        <div className="event-detail">
                            <FaCalendarAlt /> {dateText}
                        </div>
                        <div className="event-detail">
                            <FaMapMarkerAlt /> {eventVenue}
                        </div>
                        <div className="event-price">
                            <button 
                                className="book-now-button" 
                                onClick={handleBookNow}
                                disabled={!eventRegistrationLink}
                            >
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="about-event">
                <h3>About the Event</h3>
                <p>
                    {aboutEvent || "Join us for an engaging event designed to enhance your skills and creativity. Don't miss out on this opportunity!"}
                </p>
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
            <div className="event-dates">
                <h3>Event Dates</h3>
                <p>{dateText}</p> {/* Show date with "onwards" if multiple dates */}
                {formattedDates}
            </div>
        </div>
    );
}

export default EventProfile;
