'use client';

import React from "react";
import Link from 'next/link';
import styles from './OrganizationLogin.module.css';

function OrganizationLogin() {
  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <Link href="/" className={styles.backToHome}>
            ← Back to Home
          </Link>
          <h1 className={styles.loginTitle}>Organization Login</h1>
        </div>

        <div className={styles.messageContainer}>
          <div className={styles.notAvailableMessage}>
            <h2 className={styles.messageTitle}>Organization Profiles Not Available</h2>
            <p className={styles.messageText}>
              Creating organization profiles is not available right now. 
              Please check again soon for updates.
            </p>
            <p className={styles.contactText}>
              For more information, please contact us at:{' '}
              <a href="mailto:contact@zestlive.in" className={styles.contactEmail}>
                contact@zestlive.in
              </a>
            </p>
          </div>
        </div>

        <div className={styles.loginFooter}>
          <p className={styles.userLoginText}>
            Looking for user login? 
            <Link href="/login" className={styles.userLoginLink}>
              Go to User Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default OrganizationLogin; 