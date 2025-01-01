import React from 'react';
import './UserProfile.css';
import { FaGraduationCap, FaUniversity } from 'react-icons/fa';


function UserProfile() {


    return (
        <div className="page-container">
            <div className="user-profile-container">
                <div className="profile-header">
                    <div className="profile-avatar">
                        <img 
                            src={"https://via.placeholder.com/150"} 
                            alt="Profile" 
                            className="avatar-image" 
                        />
                    </div>

                        <h2>Guest User</h2>
               
                    <p className="username">{"guest"}</p>
                </div>

                    
                <div className="profile-info">
                    <div className="info-item">
                        <FaUniversity className="info-icon" />
                        <span>{"College name"}</span>
                    </div>


                    <div className="info-item">
                        <FaGraduationCap className="info-icon" />
                        <span>Course name - Year of study</span>
                    </div>
                </div>

                <div className="registered-events">
                    <h3>Attended Events</h3>
                    <div className="events-list">
                        {[
                            { id: 1, title: "Tech Workshop", date: "2024-03-20" },
                            { id: 2, title: "Coding Competition", date: "2024-03-25" }
                        ].map(event => (
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
