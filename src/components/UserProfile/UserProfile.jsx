import React from 'react';
import './UserProfile.css';
import { FaGraduationCap } from 'react-icons/fa';
import { FaUniversity } from 'react-icons/fa';
import Header from '../Header/header';

function UserProfile() {
    const user = {
        name: "Shreyas Gurav",
        username: "shreyasgurav",
        branch: "AI and Data Science",
        year: "2nd Year",
        college: "KJ Somaiya College of Engineering",
        profilePhoto: "https://media.licdn.com/dms/image/v2/D4D03AQH0vxBohqv0Zg/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1720697131207?e=2147483647&v=beta&t=K6JAxhUW4cciuh9u_nSXyi7XkKL9TsHXmiyycydwtS4",
        registeredEvents: [
            { id: 1, title: "Tech Workshop", date: "2024-03-20" },
            { id: 2, title: "Coding Competition", date: "2024-03-25" }
        ],
        council: "E-Cell Bloombox KJSCE",
        clubLogo: "https://media.licdn.com/dms/image/v2/C560BAQGWBJ0Emc_6Tg/company-logo_200_200/company-logo_200_200/0/1630610621644/bloombox_kjsce_logo?e=2147483647&v=beta&t=hIlPG-QzK8umt7iEIK_eA-nzZsQNo5mMagGXXx3jMIM",
    };

    return (
        <div className="page-container">
            <Header />
            <div className="user-profile-container">
                <div className="profile-header">
                    <div className="profile-avatar">
                        <img src={user.profilePhoto} alt="Profile" className="avatar-image" />
                    </div>
                    <h2>{user.name}</h2>
                    <p className="username">@{user.username}</p>
                </div>

                <div className="profile-info">
                    <div className="info-item">
                        <FaUniversity className="info-icon" />
                        <span>{user.college}</span>
                    </div>
                    <div className="info-item">
                        <FaGraduationCap className="info-icon" />
                        <span>{user.branch} - {user.year}</span>
                    </div>
                    <div className="info-item">
                        <img src={user.clubLogo} alt={`${user.council} logo`} className="club-logo" />
                        <span className="club-name">{user.council}</span>
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
