import React from 'react';
import './CouncilProfile.css'; // Ensure this is the correct path
import { FaUniversity } from 'react-icons/fa';

function CouncilProfile() {
    const council = {
        name: "E-Cell BloomBox KJSCE",
        username: "bloomboxkjsce",
        profilePhoto: "https://media.licdn.com/dms/image/v2/C560BAQGWBJ0Emc_6Tg/company-logo_200_200/company-logo_200_200/0/1630610621644/bloombox_kjsce_logo?e=2147483647&v=beta&t=hIlPG-QzK8umt7iEIK_eA-nzZsQNo5mMagGXXx3jMIM", // Replace with a valid image URL
        college: "KJ Somaiya College of Engineering",
        clubType: "Technical Club",
        upcomingEvents: [
            { id: 1, title: "AI Workshop", date: "2024-04-15" },
            { id: 2, title: "Data Science Hackathon", date: "2024-05-20" },
        ],
        pastEvents: [
            { id: 1, title: "Intro to AI", date: "2024-01-10" },
            { id: 2, title: "Machine Learning Basics", date: "2024-02-05" },
        ],
    };

    return (
        <div className="council-profile-container">
            <div className="council-profile-header">
                <div className="council-profile-avatar">
                    <img src={council.profilePhoto} alt="Profile" className="council-avatar-image" />
                </div>
                <h2 className="council-name">{council.name}</h2>
                <p className="council-username">@{council.username}</p>
            </div>

            <div className="council-profile-info">
                <div className="council-info-item">
                    <FaUniversity className="council-info-icon" />
                    <span>{council.college}</span>
                </div>
                <div className="council-info-item">
                    <span>{council.clubType}</span>
                </div>
            </div>

            <h3 className="council-events-title">Upcoming Events</h3>
            <div className="council-registered-events">
                <div className="council-events-list">
                    {council.upcomingEvents.map(event => (
                        <div key={event.id} className="council-event-item">
                            <h4>{event.title}</h4>
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            <h3 className="council-events-title">Past Events</h3>
            <div className="council-registered-events">
                <div className="council-events-list">
                    {council.pastEvents.map(event => (
                        <div key={event.id} className="council-event-item">
                            <h4>{event.title}</h4>
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CouncilProfile;
