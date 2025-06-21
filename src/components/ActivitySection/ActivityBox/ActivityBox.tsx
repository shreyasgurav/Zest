'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { MapPin, Calendar, Trash2, Users, Clock, Tag } from 'lucide-react';
import styles from './ActivityBox.module.css';

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

interface ActivityBoxProps {
  activity: Activity;
  onDelete?: (id: string) => void;
}

export default function ActivityBox({ activity, onDelete }: ActivityBoxProps) {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isActivityCreator = currentUser && currentUser.uid === activity?.organizationId;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle both new and legacy field names
  const activityName = activity.name || activity.activityName || 'Untitled Activity';
  const activityLocation = activity.location || activity.activityLocation || 'Location TBA';
  const aboutActivity = activity.about_activity || activity.aboutActivity || '';
  const categories = activity.activity_categories || (activity.activity_category ? [activity.activity_category] : []);

  // Get the next available time slot from weekly schedule
  const getNextAvailableSlot = () => {
    const today = new Date();
    const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Find today's schedule first
    const todaySchedule = activity.weekly_schedule?.find(day => day.day === todayDay && day.is_open);
    if (todaySchedule && todaySchedule.time_slots.length > 0) {
      const firstSlot = todaySchedule.time_slots[0];
      return {
        day: todayDay,
        time: firstSlot.start_time,
        displayText: `Today • ${firstSlot.start_time}`
      };
    }

    // Find next available day
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayIndex = daysOfWeek.indexOf(todayDay);
    
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7;
      const nextDay = daysOfWeek[nextDayIndex];
      const daySchedule = activity.weekly_schedule?.find(day => day.day === nextDay && day.is_open);
      
      if (daySchedule && daySchedule.time_slots.length > 0) {
        const firstSlot = daySchedule.time_slots[0];
        const dayLabel = i === 1 ? 'Tomorrow' : nextDay;
        return {
          day: nextDay,
          time: firstSlot.start_time,
          displayText: `${dayLabel} • ${firstSlot.start_time}`
        };
      }
    }

    return {
      day: 'TBA',
      time: '',
      displayText: 'Schedule TBA'
    };
  };

  const nextSlot = getNextAvailableSlot();

  const truncateText = (text: string, wordLimit: number): string => {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '...';
    }
    return text;
  };

  const formatLocation = (location: string, city?: string): string => {
    if (!location) return 'Location TBA';
    
    // If city is provided and not already in location, show both
    if (city && !location.toLowerCase().includes(city.toLowerCase())) {
      return `${truncateText(location, 15)}, ${city}`;
    }
    
    return truncateText(location, 20);
  };

  const formatCategories = (categories: string[]): string => {
    if (!categories || categories.length === 0) return '';
    if (categories.length === 1) return categories[0];
    if (categories.length === 2) return categories.join(' & ');
    return `${categories[0]} +${categories.length - 1}`;
  };

  const handleClick = () => {
    router.push(`/activity-profile/${activity.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActivityCreator) return;

    try {
      if (window.confirm("Are you sure you want to delete this activity?")) {
        await deleteDoc(doc(db, "activities", activity.id));
        if (onDelete) {
          onDelete(activity.id);
        }
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      alert("Failed to delete activity. Please try again.");
    }
  };

  return (
    <div 
      className={styles.activityBoxWrapper} 
      onClick={handleClick}
    >
      <div className={styles.activityBoxCard}>
        {/* Delete Button */}
        {isActivityCreator && (
          <button 
            className={styles.deleteButton}
            onClick={handleDelete}
            aria-label="Delete activity"
          >
            <Trash2 className={styles.deleteIcon} />
          </button>
        )}

        {/* Image Section */}
        <div className={styles.imageSection}>
          {activity.activity_image && !imageError ? (
            <>
              <img
                src={activity.activity_image}
                alt={activityName}
                className={`${styles.activityImage} ${imageLoaded ? styles.imageLoaded : styles.imageLoading}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {!imageLoaded && <div className={styles.imagePlaceholder} />}
            </>
          ) : (
            <div className={styles.noImagePlaceholder}>
              <Calendar className={styles.placeholderIcon} />
            </div>
          )}

          {/* Price Badge */}
          {activity.price_per_slot && (
            <div className={styles.priceBadge}>
              <span>₹{activity.price_per_slot}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className={styles.activityBoxInfo}>
          {/* Title */}
          <h3>{truncateText(activityName, 20)}</h3>

          {/* Categories */}
          {categories.length > 0 && (
            <div className={styles.infoRow}>
              <Tag className={styles.categoryIcon} />
              <span className={styles.categoryText}>{formatCategories(categories)}</span>
            </div>
          )}

          {/* Location */}
          <div className={styles.infoRow}>
            <MapPin className={styles.locationIcon} />
            <span>{formatLocation(activityLocation, activity.city)}</span>
          </div>

          {/* Next Available Slot */}
          <div className={styles.infoRow}>
            <Clock className={styles.timeIcon} />
            <span>{nextSlot.displayText}</span>
          </div>

          {/* About/Duration */}
          <div className={styles.infoRow}>
            <Users className={styles.aboutIcon} />
            <span>
              {activity.activity_duration 
                ? `${activity.activity_duration} sessions`
                : truncateText(aboutActivity, 15)
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 