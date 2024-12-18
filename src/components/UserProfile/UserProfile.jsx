import React from 'react';
import './UserProfile.css';
import { FaUser, FaEnvelope, FaPhone, FaGraduationCap } from 'react-icons/fa';
import Header from '../Header/header';
import Footer from '../Footer/footer';

function UserProfile() {
    // This would typically come from your user data/state
    const user = {
        name: "Shreyas Gurav",
        email: "shrreyasgurav@gmail.com",
        phone: "+91 1234567890",
        branch: "AI and Data Science",
        year: "2nd Year",
        college: "KJ Somaiya College of Engineering",
        registeredEvents: [
            { id: 1, title: "Tech Workshop", date: "2024-03-20" },
            { id: 2, title: "Coding Competition", date: "2024-03-25" }
        ]
    };

    return (
        <div className="page-container">
            <Header />
            <div className="user-profile-container">
                <div className="profile-header">
                    <div className="profile-avatar">
                        <FaUser className="avatar-icon" />
                    </div>
                    <h2>{user.name}</h2>
                </div>

                <div className="profile-info">
                    <div className="info-item">
                        <FaEnvelope className="info-icon" />
                        <span>{user.email}</span>
                    </div>
                    <div className="info-item">
                        <FaPhone className="info-icon" />
                        <span>{user.phone}</span>
                    </div>
                    <div className="info-item">
                        <FaGraduationCap className="info-icon" />
                        <span>{user.college}</span>
                    </div>
                    <div className="info-item">
                        <FaGraduationCap className="info-icon" />
                        <span>{user.branch} - {user.year}</span>
                    </div>
                </div>

                <div className="registered-events">
                    <h3>Attended Events</h3>
                    <div className="events-list">
                        {user.registeredEvents.map(event => (
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

export default UserProfile;
