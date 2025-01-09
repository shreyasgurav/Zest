import React from 'react';
import './AboutUs.css'; // Create this CSS file for styling

function AboutUs() {
    return (
        <div className="about-us-container">
            <div className="about-us-content">
                <h2>About Us</h2>
                <p>
                Zest started as a small project born out of personal experiences. I missed out on joining college clubs and attending events simply because I didn’t know about deadlines or details in time. It was frustrating to see so many opportunities slip by just because the information wasn’t organized or easily accessible.
                </p>
                <p>
                I also noticed that friends from other colleges often wanted to participate in events at my college—competitions, workshops, or even dance clubs or college band. However, they had no idea these opportunities existed or how to get involved.
                </p>
                <p>
                That’s where Zest comes in. It’s a simple platform designed to bring all college events, workshops, activities, and opportunities into one place. The idea is to make it easy for students to explore what’s happening on campus and even allow others from outside the college to join certain activities when possible.
                </p>
                <p>
                It’s just about solving a problem I faced and hoping it can help others too. It’s a small step toward making college life a bit easier and more connected.
                </p>
            </div>
        </div>
    );
}

export default AboutUs;
