'use client';

import React from 'react';
import styles from './About.module.css';

export default function About() {
  return (
    <div className={styles.aboutUsContainer}>
      <div className={styles.aboutUsContent}>
        <h2>WTF is Zest?</h2>
        <p>
          Zest is all about making it easier to find fun things to do in Mumbai! Whether you're looking for the best go-karting tracks, bowling alleys, trampoline parks, or other exciting spots, we've got you covered with detailed guides to help you plan your outings.
        </p>
        <p>
          Right now, Zest focuses on city guides, but soon, we'll also be adding updates on fun events, curated itineraries, and more ways to explore Mumbai. Stay tuned—there's a lot more coming!
        </p>
      </div>
    </div>
  );
} 