'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import styles from './LocationSelector.module.css';

interface LocationSelectorProps {
    selectedCity: string;
    onLocationClick: () => void;
    buttonClassName?: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ selectedCity, onLocationClick, buttonClassName }) => {
    return (
        <button className={`${styles.locationButton} ${buttonClassName || ''}`} onClick={onLocationClick}>
            <MapPin className={styles.mapPinIcon} />
            <span className={styles.selectedCity}>{selectedCity}</span>
        </button>
    );
};

export default LocationSelector;

