import React, { useState } from 'react';
import { FaEnvelope, FaPhone, FaCheck, FaCopy } from 'react-icons/fa';
import './ContactUs.css'; // Create this CSS file for styling

function ContactUs() {
    const [emailCopied, setEmailCopied] = useState(false);
    const [phoneCopied, setPhoneCopied] = useState(false);

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        if (type === 'email') {
            setEmailCopied(true);
            setTimeout(() => setEmailCopied(false), 2000);
        } else {
            setPhoneCopied(true);
            setTimeout(() => setPhoneCopied(false), 2000);
        }
    };

    return (
        <div className="contact-us-container">
            <div className="contact-us-content">
                <h2>Contact Us</h2>
                <div className="contact-items">
                    <div className="contact-item" onClick={() => handleCopy('contact@zestlive.in', 'email')}>
                        <div className="contact-icon">
                            <FaEnvelope />
                        </div>
                        <div className="contact-info">
                            <h3>Email</h3>
                            <p>contact@zestlive.in</p>
                        </div>
                        <button className="copy-button">
                            {emailCopied ? <FaCheck /> : <FaCopy />}
                        </button>
                    </div>

                    <div className="contact-item" onClick={() => handleCopy('+91 70586 44548', 'phone')}>
                        <div className="contact-icon">
                            <FaPhone />
                        </div>
                        <div className="contact-info">
                            <h3>Phone</h3>
                            <p>+91 70586 44548</p>
                        </div>
                        <button className="copy-button">
                            {phoneCopied ? <FaCheck /> : <FaCopy />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ContactUs;
