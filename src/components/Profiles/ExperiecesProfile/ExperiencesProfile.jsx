import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../EventProfile/EventProfile.css';
import { FaBookmark, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';

function ExperiencesProfile({ experiences }) {
    const { id } = useParams();
    const experience = experiences?.find(exp => exp.id === parseInt(id));
    
    const [isFooterVisible, setIsFooterVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const footer = document.querySelector('.footer');
            if (footer) {
                const footerTop = footer.getBoundingClientRect().top;
                setIsFooterVisible(footerTop < window.innerHeight);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!experience) {
        return <div>Experience not found</div>;
    }

    // Using the same property names as defined in App.jsx fetchEvents
    const { 
        eventImage,
        eventTitle,
        type,
        eventDateTime,
        eventVenue,
        eventRegistrationLink,
        hostingClub,
        aboutEvent
    } = experience;

    return (
        <div className="event-profile-container">
            <div className="event-content">
                <div className="event-image">
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
                            <FaBookmark /> {type}
                        </div>
                        <div className="event-detail">
                            <FaCalendarAlt /> {new Date(eventDateTime).toLocaleString()}
                        </div>
                        <div className="event-detail">
                            <FaMapMarkerAlt /> {eventVenue}
                        </div>
                        <div className="event-price">
                            <button 
                                className="book-now-button" 
                                onClick={() => window.open(eventRegistrationLink, "_blank")}
                            >
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="about-event">
                <h3>About the Experience</h3>
                <p>
                    {aboutEvent || "Join us for an amazing experience that you'll never forget. Don't miss out on this opportunity!"}
                </p>
            </div>
        </div>
    );
}

export default ExperiencesProfile;