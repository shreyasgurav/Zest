'use client';

import React, { useState } from 'react';
import { FaEnvelope, FaPhone, FaCheck, FaCopy } from 'react-icons/fa';
import styles from './Contact.module.css';

export default function Contact() {
    const [emailCopied, setEmailCopied] = useState(false);
    const [phoneCopied, setPhoneCopied] = useState(false);

    const handleCopy = (text: string, type: 'email' | 'phone') => {
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
        <div className={styles.contactUsContainer}>
            <div className={styles.contactUsContent}>
                <h2>Contact Us</h2>
                <div className={styles.contactItems}>
                    <div className={styles.contactItem} onClick={() => handleCopy('contact@zestlive.in', 'email')}>
                        <div className={styles.contactIcon}>
                            <FaEnvelope />
                        </div>
                        <div className={styles.contactInfo}>
                            <h3>Email</h3>
                            <p>contact@zestlive.in</p>
                        </div>
                        <button className={styles.copyButton}>
                            {emailCopied ? <FaCheck /> : <FaCopy />}
                        </button>
                    </div>

                    <div className={styles.contactItem} onClick={() => handleCopy('+91 70586 44548', 'phone')}>
                        <div className={styles.contactIcon}>
                            <FaPhone />
                        </div>
                        <div className={styles.contactInfo}>
                            <h3>Phone</h3>
                            <p>+91 70586 44548</p>
                        </div>
                        <button className={styles.copyButton}>
                            {phoneCopied ? <FaCheck /> : <FaCopy />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 