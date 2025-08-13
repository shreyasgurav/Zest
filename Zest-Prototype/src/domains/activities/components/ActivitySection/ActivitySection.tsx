"use client";

import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/infrastructure/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import useEmblaCarousel from "embla-carousel-react";
import ActivityBox from "./ActivityBox/ActivityBox";
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from "./ActivitySection.module.css";
import Link from 'next/link';
import ActivitySectionSkeleton from './ActivitySectionSkeleton';

interface Activity {
  id: string;
  name: string;
  location: string;
  city?: string;
  about_activity: string;
  activity_image: string;
  organizationId: string;
  hosting_organization: string;
  activity_categories: string[];
  activity_languages?: string;
  activity_duration?: string;
  activity_age_limit?: string;
  price_per_slot: number;
  weekly_schedule: any[];
  closed_dates?: string[];
  createdAt: any;
  // Legacy field support
  activityName?: string;
  activityLocation?: string;
  aboutActivity?: string;
  activity_category?: string;
}

const ActivitySection = () => {
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const [forceShow, setForceShow] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Listen for location changes
  useEffect(() => {
    // Get initial city from localStorage
    const storedCity = localStorage.getItem('selectedCity');
    if (storedCity) {
      setSelectedCity(storedCity);
    }

    // Listen for location changes from header
    const handleLocationChange = (event: CustomEvent) => {
      setSelectedCity(event.detail.city);
    };

    window.addEventListener('locationChanged', handleLocationChange as EventListener);
    
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange as EventListener);
    };
  }, []);

  // Filter activities based on selected city
  const filterActivitiesByLocation = useCallback((activities: Activity[], city: string) => {
    if (!city || city === 'All Cities') return activities;
    
    return activities.filter(activity => {
      const location = activity.location || activity.activityLocation || '';
      const activityCity = activity.city || '';
      // Check if location or city contains the city name (case insensitive)
      return location.toLowerCase().includes(city.toLowerCase()) || 
             activityCity.toLowerCase().includes(city.toLowerCase());
    });
  }, []);

  // Update filtered activities when city or all activities change
  useEffect(() => {
    const filtered = filterActivitiesByLocation(allActivities, selectedCity);
    setFilteredActivities(filtered);
    console.log(`Filtered ${filtered.length} activities for ${selectedCity}`);
  }, [allActivities, selectedCity, filterActivitiesByLocation]);

  // Preload images with timeout and fallback
  const preloadImages = async (activitiesData: Activity[]) => {
    try {
      const imagePromises = activitiesData
        .filter(activity => activity.activity_image)
        .slice(0, 6) // Only preload first 6 images for performance
        .map(activity => {
          return new Promise((resolve) => {
            const img = new window.Image();
            
            // Set a timeout for each image
            const timeout = setTimeout(() => {
              resolve('timeout');
            }, 1000); // 1 second timeout per image
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve('loaded');
            };
            img.onerror = () => {
              clearTimeout(timeout);
              resolve('error');
            };
            img.src = activity.activity_image;
          });
        });

      // If no images to preload, set as loaded immediately
      if (imagePromises.length === 0) {
        setImagesLoaded(true);
        return;
      }

      // Wait for images with a global timeout
      const globalTimeout = new Promise(resolve => 
        setTimeout(() => resolve('global_timeout'), 2000) // 2 second global timeout
      );
      
      await Promise.race([
        Promise.all(imagePromises),
        globalTimeout
      ]);
      
      setImagesLoaded(true);
    } catch (err) {
      console.error('Error preloading images:', err);
      setImagesLoaded(true); // Always continue even if preloading fails
    }
  };

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        console.log('Starting to fetch activities...');
        
        // Disable cache temporarily for debugging
        // const cachedActivities = sessionStorage.getItem('cachedActivities');
        // const cacheTimestamp = sessionStorage.getItem('activitiesTimestamp');
        // const now = Date.now();
        
        // Use cache if it's less than 5 minutes old
        // if (cachedActivities && cacheTimestamp && (now - parseInt(cacheTimestamp)) < 300000) {
        //   console.log('Using cached activities data');
        //   const activitiesData = JSON.parse(cachedActivities);
        //   setAllActivities(activitiesData);
        //   setImagesLoaded(true);
        //   setLoading(false);
        //   return;
        // }

        if (!db) throw new Error('Firebase is not initialized');

        console.log('Fetching activities from Firestore...');
        const activitiesCollectionRef = collection(db(), "activities");
        // Try without orderBy first to see if that's the issue
        const querySnapshot = await getDocs(activitiesCollectionRef);
        
        console.log(`Found ${querySnapshot.docs.length} activity documents in Firestore`);
        
        const activitiesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Processing activity document:', doc.id, data);
          return {
            id: doc.id,
            name: data.name || data.activityName || '',
            location: data.location || data.activityLocation || '',
            city: data.city || '',
            about_activity: data.about_activity || data.aboutActivity || '',
            activity_image: data.activity_image || '',
            organizationId: data.organizationId || '',
            hosting_organization: data.hosting_organization || '',
            activity_categories: data.activity_categories || (data.activity_category ? [data.activity_category] : []),
            activity_languages: data.activity_languages || '',
            activity_duration: data.activity_duration || '',
            activity_age_limit: data.activity_age_limit || '',
            price_per_slot: data.price_per_slot || 0,
            weekly_schedule: data.weekly_schedule || [],
            closed_dates: data.closed_dates || [],
            createdAt: data.createdAt,
            // Legacy field support
            activityName: data.name || data.activityName || '',
            activityLocation: data.location || data.activityLocation || '',
            aboutActivity: data.about_activity || data.aboutActivity || '',
            activity_category: data.activity_category || ''
          };
        }) as Activity[];
        
        console.log('Mapped activities data:', activitiesData);
        
        // Cache the data
        sessionStorage.setItem('cachedActivities', JSON.stringify(activitiesData));
        sessionStorage.setItem('activitiesTimestamp', Date.now().toString());
        
        setAllActivities(activitiesData);
        preloadImages(activitiesData);
        setError(null);
      } catch (error) {
        console.error('Error fetching activities - Full error object:', error);
        console.error('Error fetching activities - Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Error fetching activities - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        setError(error instanceof Error ? error.message : 'Failed to fetch activities');
        setImagesLoaded(true); // Set images as loaded even on error
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Backup timer to force show content after 8 seconds
  useEffect(() => {
    const backupTimer = setTimeout(() => {
      if (!imagesLoaded) {
        console.log('Backup timer: Force showing activities content');
        setForceShow(true);
        setImagesLoaded(true);
      }
    }, 3000); // 3 second backup timer

    return () => clearTimeout(backupTimer);
  }, [imagesLoaded]);

  const handleActivityDelete = (activityId: string) => {
    setAllActivities(prevActivities => prevActivities.filter(activity => activity.id !== activityId));
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  // Show content immediately, even while loading
  if (loading && allActivities.length === 0) {
    return <ActivitySectionSkeleton />;
  }

  if (!filteredActivities.length) {
    return (
      <div className={styles.activitySection}>
        <div className={styles.activitySectionHeading}>
          <h1 className={styles.upcomingActivitiesHeading}>Fun Activities</h1>
          <Link href="/activities" className={styles.seeAllLink}>See All</Link>
        </div>
        <div className={styles.noActivitiesMessage}>No activities available.</div>
      </div>
    );
  }

  return (
    <div className={styles.activitySection}>
      <div className={styles.activitySectionHeading}>
        <h1 className={styles.upcomingActivitiesHeading}>Fun Activities</h1>
        <Link href="/activities" className={styles.seeAllLink}>See All</Link>
      </div>

      <div className={styles.emblaContainer}>
        <button 
          className={`${styles.emblaButton} ${styles.emblaButtonPrev} ${!prevBtnEnabled ? styles.emblaButtonDisabled : ''}`}
          onClick={scrollPrev}
          disabled={!prevBtnEnabled}
        >
          <FiChevronLeft />
        </button>

        <div className={styles.embla}>
          <div className={styles.embla__viewport} ref={emblaRef}>
            <div className={styles.embla__container}>
              {filteredActivities.map((activity) => (
                <div className={styles.embla__slide} key={activity.id}>
                  <ActivityBox activity={activity} onDelete={handleActivityDelete} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          className={`${styles.emblaButton} ${styles.emblaButtonNext} ${!nextBtnEnabled ? styles.emblaButtonDisabled : ''}`}
          onClick={scrollNext}
          disabled={!nextBtnEnabled}
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
};

export default ActivitySection; 