import React from 'react';
import './CouncilProfile.css';
import { FaGraduationCap } from 'react-icons/fa';
import { FaUniversity } from 'react-icons/fa';
import Header from '../Header/header';

function CouncilProfile() {
    const council = {
        name: "E-Cell BloomBox KJSCE",
        username: "bloomboxkjsce",
        college: "KJ Somaiya College of Engineering",
        profilePhoto: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcV_ezdsSQwKkvHWeIPzjLptERpKN5bfYD2w&s",
        registeredEvents: [
            { id: 1, title: "Tech Workshop", date: "2024-03-20" },
            { id: 2, title: "Coding Competition", date: "2024-03-25" }
        ],
        council: "E-Cell Bloombox KJSCE"
    };

    return (
        <div className="page-container">
            <Header />
            <div className="council-profile-container">
                <div className="profile-header">
                    <div className="profile-avatar">
                        <img src={council.profilePhoto} alt="Profile" className="avatar-image" />
                    </div>
                    <h2>{council.name}</h2>
                    <p className="username">@{council.username}</p>
                </div>

                <div className="profile-info">
                    <div className="info-item">
                        <FaUniversity className="info-icon" />
                        <span>{council.college}</span>
                    </div>
                </div>

                <div className="registered-events">
                    <h3>Upcoming Events</h3>
                    <div className="events-list">
                        {council.registeredEvents.map(event => (
                            <div key={event.id} className="event-item">
                                <h4>{event.title}</h4>
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="registered-events">
                    <h3>Past Events</h3>
                    <div className="events-list">
                        {council.registeredEvents.map(event => (
                            <div key={event.id} className="event-item">
                                <h4>{event.title}</h4>
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CouncilProfile;
