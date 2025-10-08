'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';
import styles from './activities.module.css';
import { Calendar, MapPin, Clock, Building2, Music, PartyPopper, Palette, Beer, Mountain, Trophy, Users, Sun, Sparkles, User, Heart } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import ActivityBox from '@/domains/activities/components/ActivitySection/ActivityBox/ActivityBox';
import { matchVenueToCity } from '@/lib/utils/cityBoundaries';

// Activity type definition - matching ActivityBox component interface
interface WeeklySchedule {
  day: string;
  is_open: boolean;
  time_slots: Array<{
    start_time: string;
    end_time: string;
    capacity: number;
    available_capacity: number;
  }>;
}

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
  weekly_schedule: WeeklySchedule[];
  closed_dates?: string[];
  createdAt: any;
  // Legacy field support
  activityName?: string;
  activityLocation?: string;
  aboutActivity?: string;
  activity_category?: string;
}

// Filter type definition
type FilterType = 'all' | 'games' | 'adventure' | 'art' | 'indoor' | 'outdoor' | 'solo' | 'couple' | 'group';

const activityTypes = [
  { id: 'all', label: 'All Activities', icon: PartyPopper },
  { id: 'games', label: 'Games', icon: Trophy },
  { id: 'adventure', label: 'Adventure', icon: Mountain },
  { id: 'art', label: 'Art', icon: Palette },
  { id: 'indoor', label: 'Indoor', icon: Building2 },
  { id: 'outdoor', label: 'Outdoor', icon: Sun },
  { id: 'solo', label: 'Solo', icon: User },
  { id: 'couple', label: 'Couple', icon: Heart },
  { id: 'group', label: 'Group', icon: Users }
];

export default function ActivitiesPage() {
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCity, setSelectedCity] = useState<string>('Mumbai');
  const [loading, setLoading] = useState(true);
  const [isHeaderLoaded, setIsHeaderLoaded] = useState(false);

  // Listen for location changes from header
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
  const filterActivitiesByLocation = (activities: Activity[], city: string) => {
    if (!city || city === 'All Cities') return activities;
    
    return activities.filter(activity => {
      const location = activity.location || activity.activityLocation || '';
      // For activities, we'll need to implement coordinate storage later
      // For now, use coordinate-based matching with null coordinates (fallback to text)
      return matchVenueToCity(null, location, city);
    });
  };

  // Apply both location and type filters
  useEffect(() => {
    let filtered = filterActivitiesByLocation(allActivities, selectedCity);
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(activity => {
        const categories = activity.activity_categories || [];
        const categoryString = categories.join(' ').toLowerCase();
        
        // Handle special cases for indoor/outdoor
        if (activeFilter === 'indoor' && categoryString.includes('indoor')) return true;
        if (activeFilter === 'outdoor' && categoryString.includes('outdoor')) return true;
        // Handle special cases for participation type
        if (activeFilter === 'solo' && categoryString.includes('solo')) return true;
        if (activeFilter === 'couple' && categoryString.includes('couple')) return true;
        if (activeFilter === 'group' && categoryString.includes('group')) return true;
        // Handle other categories - check if any category matches the filter
        return categories.some(category => category.toLowerCase() === activeFilter);
      });
    }
    
    setFilteredActivities(filtered);
    console.log(`Filtered ${filtered.length} activities for ${selectedCity} and type ${activeFilter}`);
  }, [allActivities, selectedCity, activeFilter]);

  // Load header and filters first
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHeaderLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Load activities after header is loaded
  useEffect(() => {
    if (isHeaderLoaded) {
      const loadActivities = async () => {
        try {
          console.log('Activities page: Starting to fetch activities...');
          
          // Try without orderBy first to see if that's the issue
          const activitiesCollectionRef = collection(db(), "activities");
          const querySnapshot = await getDocs(activitiesCollectionRef);
          
          console.log(`Activities page: Found ${querySnapshot.docs.length} activity documents in Firestore`);
          
          const activitiesData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Activities page: Processing activity document:', doc.id, data);
            return {
              id: doc.id,
              ...data
            };
          }) as Activity[];
          
          console.log('Activities page: Mapped activities data:', activitiesData);
          
          // Sort activities by date (most recent first) - handle both timestamp and date objects
          const sortedActivities = activitiesData.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return bDate.getTime() - aDate.getTime();
          });
          
          setAllActivities(sortedActivities);
          setActivities(sortedActivities);
          
          // Add a small delay before showing activities for smooth transition
          setTimeout(() => {
            setLoading(false);
          }, 500);
        } catch (error) {
          console.error("Error loading activities:", error);
          setLoading(false);
        }
      };

      loadActivities();
    }
  }, [isHeaderLoaded]);

  const handleFilter = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const getActivityTypeIcon = (type: string) => {
    const IconComponent = activityTypes.find(t => t.id === type.toLowerCase())?.icon || PartyPopper;
    return <IconComponent className={styles.activityTypeIcon} />;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy • h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
              <div className={styles.spinnerSecondary}></div>
            </div>
            <p className={styles.loadingText}>Loading activities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header Section - Loads First */}
        <div className={`${styles.header} ${isHeaderLoaded ? styles.fadeIn : ''}`}>
          <h1 className={styles.title}>Discover Activities</h1>
          <p className={styles.subtitle}>
            {selectedCity !== 'All Cities' 
              ? `Find your perfect activity in ${selectedCity} - from solo adventures to group experiences`
              : "Find your perfect activity - from solo adventures to group experiences, indoor fun to outdoor excitement."
            }
          </p>
        </div>

        {/* Filters Section - Loads with Header */}
        {isHeaderLoaded && (
          <div className={styles.filters}>
            {activityTypes.map((type) => (
              <button
                key={type.id}
                className={`${styles.filterButton} ${activeFilter === type.id ? styles[`${type.id}Active`] : ''}`}
                onClick={() => handleFilter(type.id as FilterType)}
              >
                <type.icon className={styles.filterIcon} />
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Activities Grid - Loads Last */}
        {isHeaderLoaded && (
          <>
            {filteredActivities.length > 0 && (
              <div className={styles.activitiesCount}>
                Showing {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
                {selectedCity !== 'All Cities' && ` in ${selectedCity}`}
              </div>
            )}
            <div className={styles.activitiesGrid}>
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className={`${styles.activityCardWrapper} ${styles[`animationDelay${(index % 9) + 1}`]}`}
                  >
                    <ActivityBox activity={activity} />
                  </div>
                ))
              ) : (
                <div className={styles.noActivities}>
                  <div className={styles.noActivitiesIcon}>
                    <PartyPopper className={styles.noActivitiesIconSvg} />
                  </div>
                  <h2 className={styles.noActivitiesTitle}>No Activities Found</h2>
                  <p className={styles.noActivitiesText}>
                    {selectedCity !== 'All Cities' 
                      ? `No ${activeFilter === 'all' ? '' : activeFilter + ' '}activities found in ${selectedCity}. Try a different city or category.`
                      : activeFilter === 'all' 
                        ? "There are no activities available at the moment. Check back later!"
                        : `No ${activeFilter} activities found. Try a different category or check back later.`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 