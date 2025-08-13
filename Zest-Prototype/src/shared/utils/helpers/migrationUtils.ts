/**
 * Migration utilities for adding coordinates to existing events
 */

import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export interface MigrationResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

/**
 * Geocode an address using Google Maps API
 */
async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formatted_address: string;
  city?: string;
  country?: string;
} | null> {
  return new Promise((resolve) => {
    if (!window.google || !window.google.maps) {
      resolve(null);
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any[], status: any) => {
      if (status === 'OK' && results[0]) {
        const result = results[0];
        
        // Extract city and country from address components
        let city: string | undefined;
        let country: string | undefined;
        
        for (const component of result.address_components) {
          if (component.types.includes('locality') || 
              component.types.includes('administrative_area_level_1')) {
            city = component.long_name;
          }
          if (component.types.includes('country')) {
            country = component.long_name;
          }
        }

        resolve({
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          formatted_address: result.formatted_address,
          city,
          country
        });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Migrate events to include coordinate data
 */
export async function migrateEventsCoordinates(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('Starting events coordinate migration...');
    
    // Check if Google Maps is loaded
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not loaded. Please load it first.');
    }

    // Fetch events without coordinates
    const eventsRef = collection(db(), 'events');
    const eventsQuery = query(eventsRef, where('venue_coordinates', '==', null));
    const snapshot = await getDocs(eventsQuery);
    
    result.total = snapshot.docs.length;
    console.log(`Found ${result.total} events without coordinates`);

    for (const eventDoc of snapshot.docs) {
      const data = eventDoc.data();
      const venue = data.event_venue || data.eventVenue;
      
      if (!venue) {
        result.failed++;
        result.errors.push(`Event ${eventDoc.id}: No venue information`);
        continue;
      }

      try {
        console.log(`Geocoding venue: ${venue}`);
        const coordinates = await geocodeAddress(venue);
        
        if (coordinates) {
          // Update the event with coordinates
          await updateDoc(doc(db(), 'events', eventDoc.id), {
            venue_coordinates: coordinates
          });
          
          result.successful++;
          console.log(`✅ Updated event ${eventDoc.id} with coordinates`);
        } else {
          result.failed++;
          result.errors.push(`Event ${eventDoc.id}: Failed to geocode "${venue}"`);
          console.log(`❌ Failed to geocode: ${venue}`);
        }
        
        // Add delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        result.failed++;
        result.errors.push(`Event ${eventDoc.id}: ${error}`);
        console.error(`Error processing event ${eventDoc.id}:`, error);
      }
    }

    console.log('Migration completed:', result);
    return result;

  } catch (error) {
    console.error('Migration failed:', error);
    result.errors.push(`Migration failed: ${error}`);
    return result;
  }
}

/**
 * Get events that need coordinate migration
 */
export async function getEventsNeedingMigration(): Promise<{
  count: number;
  sampleVenues: string[];
}> {
  try {
    const eventsRef = collection(db(), 'events');
    const snapshot = await getDocs(eventsRef);
    
    const eventsNeedingMigration = snapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.venue_coordinates && (data.event_venue || data.eventVenue);
    });

    const sampleVenues = eventsNeedingMigration
      .slice(0, 5)
      .map(doc => {
        const data = doc.data();
        return data.event_venue || data.eventVenue || 'No venue';
      });

    return {
      count: eventsNeedingMigration.length,
      sampleVenues
    };

  } catch (error) {
    console.error('Error checking migration status:', error);
    return { count: 0, sampleVenues: [] };
  }
}

/**
 * Load Google Maps API for migration
 */
export function loadGoogleMapsForMigration(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Maps loaded for migration');
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });
} 