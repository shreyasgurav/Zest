'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaSearch, FaTimes } from 'react-icons/fa';
import styles from './LocationPicker.module.css';

interface LocationPickerProps {
  value?: string;
  onChange: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  value = '', 
  onChange, 
  placeholder = 'Search for a location...' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Maps API
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeServices;
      document.head.appendChild(script);
    } else {
      initializeServices();
    }
  }, []);

  const initializeServices = () => {
    if (window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      
      // Create a dummy map for PlacesService
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 0, lng: 0 },
        zoom: 1
      });
      placesService.current = new window.google.maps.places.PlacesService(map);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 2 && autocompleteService.current) {
      setIsLoading(true);
      autocompleteService.current.getPlacePredictions(
        {
          input: query,
          types: ['(cities)'], // Focus on cities and localities
        },
        (predictions: any, status: any) => {
          setIsLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPredictions(predictions.slice(0, 5)); // Limit to 5 results
          } else {
            setPredictions([]);
          }
        }
      );
    } else {
      setPredictions([]);
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (prediction: any) => {
    setIsLoading(true);
    
    if (placesService.current) {
      placesService.current.getDetails(
        { placeId: prediction.place_id },
        (place: any, status: any) => {
          setIsLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const locationName = place.formatted_address || prediction.description;
            const coordinates = place.geometry?.location ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            } : undefined;
            
            setSelectedLocation(locationName);
            setSearchQuery(locationName);
            onChange(locationName, coordinates);
            setIsOpen(false);
            setPredictions([]);
          }
        }
      );
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedLocation('');
    onChange('');
    setPredictions([]);
  };

  return (
    <div className={styles.locationPicker}>
      <div className={styles.inputContainer}>
        <div className={styles.iconContainer}>
          <FaMapMarkerAlt className={styles.locationIcon} />
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={styles.locationInput}
        />
        
        {searchQuery && (
          <button onClick={handleClear} className={styles.clearButton}>
            <FaTimes />
          </button>
        )}
        
        {isLoading && (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <div className={styles.predictionsDropdown}>
          {predictions.map((prediction, index) => (
            <div
              key={prediction.place_id || index}
              className={styles.predictionItem}
              onClick={() => handleLocationSelect(prediction)}
            >
              <FaMapMarkerAlt className={styles.predictionIcon} />
              <div className={styles.predictionText}>
                <div className={styles.mainText}>
                  {prediction.structured_formatting?.main_text || prediction.description}
                </div>
                <div className={styles.secondaryText}>
                  {prediction.structured_formatting?.secondary_text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden map for PlacesService */}
      <div ref={mapRef} style={{ display: 'none' }}></div>
    </div>
  );
};

export default LocationPicker; 