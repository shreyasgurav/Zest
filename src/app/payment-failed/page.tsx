'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaExclamationTriangle, FaHome, FaRedo } from 'react-icons/fa';
import styles from './PaymentFailed.module.css';

const PaymentFailedContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams?.get('eventId') || null;
  const activityId = searchParams?.get('activityId') || null;
  const error = searchParams?.get('error') || 'Payment was unsuccessful';

  const handleRetry = () => {
    if (eventId) {
      router.push(`/book-event/${eventId}`);
    } else if (activityId) {
      router.push(`/book-activity/${activityId}`);
    } else {
      router.push('/');
    }
  };

  return (
    <div className={styles.paymentFailed}>
      <div className={styles.failureCard}>
        <div className={styles.failureHeader}>
          <div className={styles.failureIcon}>
            <FaExclamationTriangle />
          </div>
          <h1 className={styles.failureTitle}>Payment Failed</h1>
          <p className={styles.failureMessage}>
            {error}
          </p>
        </div>

        <div className={styles.failureDetails}>
          <h2 className={styles.detailsTitle}>What happened?</h2>
          <ul className={styles.reasonsList}>
            <li>Payment was cancelled by you</li>
            <li>Insufficient funds in your account</li>
            <li>Network connectivity issues</li>
            <li>Bank or payment method declined the transaction</li>
          </ul>
        </div>

        <div className={styles.failureActions}>
          <button 
            onClick={handleRetry}
            className={`${styles.actionButton} ${styles.primary}`}
          >
            <FaRedo className={styles.buttonIcon} />
            Try Again
          </button>
          
          <Link 
            href="/" 
            className={`${styles.actionButton} ${styles.secondary}`}
          >
            <FaHome className={styles.buttonIcon} />
            Back to Home
          </Link>
        </div>

        <div className={styles.helpSection}>
          <h3>Need Help?</h3>
          <p>If you continue to experience issues, please contact our support team.</p>
          <Link href="/contact" className={styles.supportLink}>
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

const PaymentFailed = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentFailedContent />
    </Suspense>
  );
};

export default PaymentFailed; 