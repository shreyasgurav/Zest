import React from 'react';
import './UserProfile.css';
import { FaGraduationCap, FaUniversity } from 'react-icons/fa';
import { useAuth0 } from "@auth0/auth0-react";

function UserProfile() {
    const { user, isAuthenticated, isLoading } = useAuth0();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="page-container">
            <div className="user-profile-container">
                <div className="profile-header">
                    <div className="profile-avatar">
                        <img 
                            src={user?.picture || "https://via.placeholder.com/150"} 
                            alt="Profile" 
                            className="avatar-image" 
                        />
                    </div>
                    {isAuthenticated ? (
                        <h2>{user.name}</h2>
                    ) : (
                        <h2>Guest User</h2>
                    )}
                    <p className="username">@{user?.nickname || "guest"}</p>
                </div>

                <div className="profile-info">
                    <div className="info-item">
                        <FaUniversity className="info-icon" />
                        <span>College Name</span>
                    </div>
                    <div className="info-item">
                        <FaGraduationCap className="info-icon" />
                        <span>Course name - Year of study</span>
                    </div>
                    <div className="info-item">
                        <img 
                            src="https://media.licdn.com/dms/image/v2/C560BAQGWBJ0Emc_6Tg/company-logo_200_200/company-logo_200_200/0/1630610621644/bloombox_kjsce_logo?e=2147483647&v=beta&t=hIlPG-QzK8umt7iEIK_eA-nzZsQNo5mMagGXXx3jMIM" 
                            alt="E-Cell Bloombox KJSCE logo" 
                            className="club-logo" 
                        />
                        <span className="club-name">Council you are in.</span>
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
