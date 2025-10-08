'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { db } from '@/infrastructure/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { MapPin, Calendar, Trash2, Users, Clock, Tag, Dumbbell, Palette, Music, Trophy, Heart, ChefHat, Code, BookOpen, Camera } from 'lucide-react';
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

  // Get the first category from categories array for display
  const displayActivityType = categories.length > 0 ? categories[0] : 'activity';

  const getActivityTypeIcon = (activityType: string | undefined) => {
    if (!activityType) return <Calendar className={styles.activityTypeIcon} />;
    
    switch (activityType.toLowerCase()) {
      case "fitness":
        return <Dumbbell className={styles.activityTypeIcon} />;
      case "art":
      case "crafts":
        return <Palette className={styles.activityTypeIcon} />;
      case "music":
        return <Music className={styles.activityTypeIcon} />;
      case "sports":
        return <Trophy className={styles.activityTypeIcon} />;
      case "dance":
        return <Users className={styles.activityTypeIcon} />;
      case "cooking":
        return <ChefHat className={styles.activityTypeIcon} />;
      case "technology":
        return <Code className={styles.activityTypeIcon} />;
      case "education":
        return <BookOpen className={styles.activityTypeIcon} />;
      case "wellness":
        return <Heart className={styles.activityTypeIcon} />;
      case "photography":
        return <Camera className={styles.activityTypeIcon} />;
      default:
        return <Calendar className={styles.activityTypeIcon} />;
    }
  };

  const getActivityTypeColor = (activityType: string | undefined) => {
    if (!activityType) return "default";
    
    switch (activityType.toLowerCase()) {
      case "fitness":
        return "fitness";
      case "art":
      case "crafts":
        return "art";
      case "music":
        return "music";
      case "sports":
        return "sports";
      case "dance":
        return "dance";
      case "cooking":
        return "cooking";
      case "technology":
        return "technology";
      case "education":
        return "education";
      case "wellness":
        return "wellness";
      case "photography":
        return "photography";
      default:
        return "default";
    }
  };

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
        await deleteDoc(doc(db(), "activities", activity.id));
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
              {getActivityTypeIcon(displayActivityType)}
            </div>
          )}

          {/* Activity Type Badge */}
          <div className={`${styles.activityTypeBadge} ${styles[getActivityTypeColor(displayActivityType)]}`}>
            {getActivityTypeIcon(displayActivityType)}
            <span>{displayActivityType}</span>
          </div>

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

          {/* Next Available Slot */}
          <div className={styles.infoRow}>
            <Clock className={styles.timeIcon} />
            <span>{nextSlot.displayText}</span>
          </div>

          {/* Location */}
          <div className={styles.infoRow}>
            <MapPin className={styles.locationIcon} />
            <span>{formatLocation(activityLocation, activity.city)}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 