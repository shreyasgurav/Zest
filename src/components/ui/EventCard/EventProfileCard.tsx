'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Clock, Music, Mic, PartyPopper, AlertCircle } from 'lucide-react';
import { useEventData } from '@/shared/hooks/useEventData';
import { EventCardBadge } from './EventCardBadge';
import styles from './EventProfileCard.module.css';

export interface EventProfileCardProps {
  eventId: string;
  tags?: Array<{
    type: 'collaboration' | 'featured' | 'soldout' | 'new' | 'popular';
    label?: string;
    metadata?: Record<string, any>;
  }>;
  eventData?: any;
  onClick?: (eventId: string) => void;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
}

const EventProfileCard: React.FC<EventProfileCardProps> = ({
  eventId,
  tags = [],
  eventData: prefetchedData,
  onClick,
  loading = 'lazy',
  priority = false
}) => {
  const router = useRouter();
  
  const { 
    event, 
    isLoading, 
    error, 
    retry 
  } = useEventData(eventId, {
    initialData: prefetchedData,
    enabled: !!eventId
  });

  const getEventTypeIcon = (eventType: string | undefined) => {
    if (!eventType) return <Calendar className={styles.eventTypeIcon} />;
    
    switch (eventType.toLowerCase()) {
      case "concert":
      case "music":
        return <Music className={styles.eventTypeIcon} />;
      case "comedy":
      case "standup":
        return <Mic className={styles.eventTypeIcon} />;
      case "party":
      case "festival":
      case "celebration":
      case "clubbing":
        return <PartyPopper className={styles.eventTypeIcon} />;
      default:
        return <Calendar className={styles.eventTypeIcon} />;
    }
  };

  const getEventTypeColor = (eventType: string | undefined): string => {
    if (!eventType) return "default";
    
    switch (eventType.toLowerCase()) {
      case "concert":
      case "music":
        return "music";
      case "comedy":
      case "standup":
        return "comedy";
      case "party":
      case "festival":
      case "celebration":
      case "clubbing":
        return "party";
      case "theater":
      case "drama":
        return "theater";
      default:
        return "default";
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(eventId);
    } else if (event) {
      router.push(`/event-profile/${event.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "No Date Available") return "TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const truncateText = (text: string, wordLimit: number): string => {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(" ") + "...";
    }
    return text;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.cardContainer}>
          <div className={styles.skeletonImageSection}></div>
          <div className={styles.skeletonContentSection}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonMeta}></div>
            <div className={styles.skeletonMeta}></div>
          </div>
        </div>
      </div>
    );
  }

  // Error or deleted event - return null to hide from profile
  if (error || !event) {
    return null;
  }

  // Extract event data
  const timeSlots = Array.isArray(event?.time_slots) ? event.time_slots : [];
  const firstDate = timeSlots.length > 0 ? timeSlots[0].date : "No Date Available";
  const firstTime = timeSlots.length > 0 ? timeSlots[0].start_time : "";
  
  const displayEventType = event.event_categories?.[0] || 
    event.eventCategories?.[0] || 
    event.eventType || 
    "event";

  const eventTitle = event.title || event.eventTitle || "";
  const eventVenue = event.event_venue || event.eventVenue || "";

  return (
    <article 
      className={styles.profileCard}
      onClick={handleClick}
      aria-label={`${eventTitle} - ${formatDate(firstDate)}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.cardContainer}>
        {/* Image Section */}
        <div className={styles.imageSection}>
          {event.event_image ? (
            <img
              src={event.event_image}
              alt={eventTitle}
              className={styles.eventImage}
              loading={loading}
              {...(priority && { fetchPriority: 'high' })}
            />
          ) : (
            <div className={styles.placeholderImage}>
              {getEventTypeIcon(displayEventType)}
            </div>
          )}

          {/* Tags/Badges Overlay */}
          <div className={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <EventCardBadge 
                key={`${tag.type}-${index}`}
                tag={tag}
                variant="default"
              />
            ))}
          </div>

          {/* Event Type Badge */}
          <div className={`${styles.eventTypeBadge} ${styles[getEventTypeColor(displayEventType)]}`}>
            {getEventTypeIcon(displayEventType)}
            <span>{displayEventType}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className={styles.contentSection}>
          {/* Title */}
          <h3 className={styles.eventTitle}>
            {truncateText(eventTitle, 20)}
          </h3>

          {/* Date & Time */}
          <div className={styles.metaRow}>
            <Clock className={styles.metaIcon} />
            <span className={styles.metaText}>
              {formatDate(firstDate)} {firstTime && `• ${firstTime}`}
            </span>
          </div>

          {/* Venue */}
          <div className={styles.metaRow}>
            <MapPin className={styles.metaIcon} />
            <span className={styles.metaText}>
              {truncateText(eventVenue, 25)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default EventProfileCard; 