'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/infrastructure/firebase';
import { doc, getDoc } from 'firebase/firestore';
import styles from './ActivityProfile.module.css';
import { FaBookmark, FaMapMarkerAlt, FaLanguage, FaClock, FaUsers, FaCalendarAlt, FaMoneyBillWave, FaTags } from 'react-icons/fa';
import ActivityProfileSkeleton from './ActivityProfileSkeleton';

interface WeeklySchedule {
  day: string;
  is_open: boolean;
  time_slots: {
    start_time: string;
    end_time: string;
    capacity: number;
    available_capacity: number;
  }[];
}

interface ActivityData {
  id: string;
  name: string;
  activity_type: string;
  location: string;
  city?: string;
  about_activity: string;
  activity_image: string;
  organizationId: string;
  hosting_organization: string;
  organization_username?: string;
  activity_categories: string[];
  activity_languages: string;
  activity_duration: string;
  activity_age_limit: string;
  price_per_slot: number;
  weekly_schedule: WeeklySchedule[];
  closed_dates: string[];
  activity_guides?: { [key: string]: string };
  createdAt: string;
  // Legacy field support
  activityName?: string;
  activityLocation?: string;
  aboutActivity?: string;
  activity_category?: string;
}

function ActivityProfile() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!params?.id) return;

      try {
        const activityDoc = doc(db(), "activities", params.id);
        const activitySnapshot = await getDoc(activityDoc);
        
        if (activitySnapshot.exists()) {
          const data = activitySnapshot.data();
          setActivity({
            id: activitySnapshot.id,
            ...data
          } as ActivityData);
        } else {
          setError("Activity not found");
        }
      } catch (err) {
        console.error("Error fetching activity:", err);
        setError("Error loading activity");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [params?.id]);

  const handleBookNow = () => {
    router.push(`/book-activity/${params?.id}`);
  };

  const handleOrganizationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (activity?.organization_username) {
      router.push(`/organisation/${activity.organization_username}`);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const formatCategories = (categories: string[]): string => {
    if (!categories || categories.length === 0) return '';
    return categories.join(', ');
  };

  const formatLocation = (location: string, city?: string): string => {
    if (!location) return 'Location TBA';
    if (city && !location.toLowerCase().includes(city.toLowerCase())) {
      return `${location}, ${city}`;
    }
    return location;
  };

  const getAvailableDays = (): string[] => {
    if (!activity?.weekly_schedule) return [];
    return activity.weekly_schedule
      .filter(day => day.is_open && day.time_slots.length > 0)
      .map(day => day.day);
  };

  const getOperatingHours = (): string => {
    if (!activity?.weekly_schedule) return 'TBA';
    
    const openDays = activity.weekly_schedule.filter(day => day.is_open && day.time_slots.length > 0);
    if (openDays.length === 0) return 'Closed';
    
    // Get earliest start time and latest end time
    let earliestStart = '23:59';
    let latestEnd = '00:00';
    
    openDays.forEach(day => {
      day.time_slots.forEach(slot => {
        if (slot.start_time < earliestStart) earliestStart = slot.start_time;
        if (slot.end_time > latestEnd) latestEnd = slot.end_time;
      });
    });
    
    return `${earliestStart} - ${latestEnd}`;
  };

  if (loading) {
    return <ActivityProfileSkeleton />;
  }

  if (error || !activity) {
    return <div className={styles.errorMessage}>{error || "Activity not found"}</div>;
  }

  // Handle both new and legacy field names
  const activityName = activity.name || activity.activityName || 'Untitled Activity';
  const activityLocation = activity.location || activity.activityLocation || 'Location TBA';
  const aboutActivity = activity.about_activity || activity.aboutActivity || '';
  const categories = activity.activity_categories || (activity.activity_category ? [activity.activity_category] : []);

  return (
    <div className={styles.activityProfileContainer}>
      <div className={styles.activityContent}>
        <div className={styles.activityProfileImage}>
          {activity.activity_image && !imageError ? (
            <Image
              src={activity.activity_image}
              alt={activityName}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              style={{ objectFit: 'cover' }}
              onError={handleImageError}
              priority
            />
          ) : (
            <div className={styles.noImage}>No Image Available</div>
          )}
        </div>
        <div className={styles.activityInfoBox}>
          <div className={styles.activityInfo}>
            <h2>{activityName}</h2>
            <div 
              className={styles.organizationName} 
              onClick={handleOrganizationClick}
              style={{ cursor: 'pointer' }}
            >
              By <span className={styles.organizationLink}>{activity.hosting_organization}</span>
            </div>
            
            {categories.length > 0 && (
              <div className={styles.activityDetail}>
                <FaTags /> {formatCategories(categories)}
              </div>
            )}
            
            <div className={styles.activityDetail}>
              <FaMapMarkerAlt /> {formatLocation(activityLocation, activity.city)}
            </div>
            
            <div className={styles.activityDetail}>
              <FaClock /> {getOperatingHours()}
            </div>
            
            <div className={styles.activityDetail}>
              <FaCalendarAlt /> Available: {getAvailableDays().join(', ') || 'TBA'}
            </div>
            
            <div className={styles.activityPrice}>
              <span>Starting at ₹{activity.price_per_slot}</span>
              <button 
                className={styles.bookNowButton} 
                onClick={handleBookNow}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.aboutActivity}>
        <h3>About the Activity</h3>
        <p>{aboutActivity || "Join us for an engaging activity designed to enhance your skills and creativity. Don't miss out on this opportunity!"}</p>
      </div>
      
      <div className={styles.activityGuide}>
        <h3>Activity Information</h3>
        <div className={styles.guideDetails}>
          {activity.activity_languages && (
            <div className={styles.guideItem}>
              <div className={styles.guideIcon}>
                <FaLanguage />
              </div>
              <div className={styles.guideInfo}>
                <span className={styles.guideLabel}>Language</span>
                <span className={styles.guideValue}>{activity.activity_languages}</span>
              </div>
            </div>
          )}
          
          {activity.activity_duration && (
            <div className={styles.guideItem}>
              <div className={styles.guideIcon}>
                <FaClock />
              </div>
              <div className={styles.guideInfo}>
                <span className={styles.guideLabel}>Duration per Session</span>
                <span className={styles.guideValue}>{activity.activity_duration}</span>
              </div>
            </div>
          )}
          
          {activity.activity_age_limit && (
            <div className={styles.guideItem}>
              <div className={styles.guideIcon}>
                <FaUsers />
              </div>
              <div className={styles.guideInfo}>
                <span className={styles.guideLabel}>Best Suited For Ages</span>
                <span className={styles.guideValue}>{activity.activity_age_limit}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information from Activity Guides */}
      {activity.activity_guides && Object.keys(activity.activity_guides).length > 0 && (
        <div className={styles.activityGuide}>
          <h3>Additional Information</h3>
          <div className={styles.guideDetails}>
            {Object.entries(activity.activity_guides).map(([key, value]) => {
              if (!value) return null;
              
              const formatLabel = (key: string): string => {
                return key.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
              };
              
              return (
                <div key={key} className={styles.guideItem}>
                  <div className={styles.guideIcon}>
                    <FaBookmark />
                  </div>
                  <div className={styles.guideInfo}>
                    <span className={styles.guideLabel}>{formatLabel(key)}</span>
                    <span className={styles.guideValue}>{value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Schedule Display */}
      {activity.weekly_schedule && activity.weekly_schedule.length > 0 && (
        <div className={styles.activityGuide}>
          <h3>Weekly Schedule</h3>
          <div className={styles.scheduleGrid}>
            {activity.weekly_schedule.map((daySchedule) => (
              <div key={daySchedule.day} className={styles.scheduleDay}>
                <h4>{daySchedule.day}</h4>
                {daySchedule.is_open && daySchedule.time_slots.length > 0 ? (
                  <div className={styles.timeSlots}>
                    {daySchedule.time_slots.map((slot, index) => (
                      <div key={index} className={styles.timeSlot}>
                        <span>{slot.start_time} - {slot.end_time}</span>
                        <span className={styles.capacity}>
                          {slot.available_capacity}/{slot.capacity} spots
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.closedDay}>
                    <span className={styles.closedText}>Closed</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed Dates */}
      {activity.closed_dates && activity.closed_dates.length > 0 && (
        <div className={styles.activityGuide}>
          <h3>Specific Closed Dates</h3>
          <div className={styles.closedDatesList}>
            {activity.closed_dates.map((date, index) => (
              <div key={index} className={styles.closedDate}>
                {new Date(date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityProfile; 