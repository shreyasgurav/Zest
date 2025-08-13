'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Clock, Music, Mic, PartyPopper, AlertCircle } from 'lucide-react';
import { useEventData } from '@/shared/hooks/useEventData';
import { EventCardBadge } from './EventCardBadge';
import { EventCardSkeleton } from './EventCardSkeleton';
import styles from './EventCard.module.css';

// Industry-inspired props interface following Airbnb/Netflix patterns
export interface EventCardProps {
  // Core data
  eventId: string;
  
  // Visual variants (like Airbnb's property card variants)
  variant?: 'default' | 'compact' | 'wide' | 'dashboard';
  
  // Context awareness (for different sections)
  context?: 'profile' | 'dashboard' | 'search' | 'collaboration';
  
  // Tag system (inspired by e-commerce filtering)
  tags?: Array<{
    type: 'collaboration' | 'featured' | 'soldout' | 'new' | 'popular';
    label?: string;
    metadata?: Record<string, any>;
  }>;
  
  // Optional overrides (for performance optimization)
  eventData?: any; // Pre-fetched data to avoid duplicate requests
  
  // Interaction handlers
  onClick?: (eventId: string) => void;
  onTagClick?: (tag: any) => void;
  
  // Accessibility
  'aria-label'?: string;
  
  // Performance
  loading?: 'lazy' | 'eager';
  priority?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  eventId,
  variant = 'default', // Keep for API compatibility but don't use for styling
  context = 'profile', // Keep for API compatibility but don't use for styling
  tags = [],
  eventData: prefetchedData,
  onClick,
  onTagClick,
  'aria-label': ariaLabel,
  loading = 'lazy',
  priority = false
}) => {
  const router = useRouter();
  
  // Centralized data fetching with proper error handling
  const { 
    event, 
    isLoading, 
    error, 
    retry 
  } = useEventData(eventId, {
    initialData: prefetchedData,
    enabled: !!eventId
  });

  // Event type styling (consistent across all variants)
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

  // Unified click handler
  const handleClick = () => {
    if (onClick) {
      onClick(eventId);
    } else if (event) {
      router.push(`/event-profile/${event.id}`);
    }
  };

  // Format utilities (consistent across variants)
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
    return <EventCardSkeleton variant="default" />;
  }

  // Error state with retry capability
  if (error || !event) {
    return (
      <div className={`${styles.eventCard} ${styles.errorState}`}>
        <div className={styles.errorContent}>
          <AlertCircle className={styles.errorIcon} />
          <div className={styles.errorText}>
            <h4>{error?.message || 'Event not found'}</h4>
            <p>This event may have been deleted or moved.</p>
            {retry && (
              <button 
                onClick={retry}
                className={styles.retryButton}
                aria-label="Retry loading event"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
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

  // Use consistent styling everywhere - no variants
  const cardClasses = styles.eventCard;

  return (
    <article 
      className={cardClasses}
      onClick={handleClick}
      aria-label={ariaLabel || `${eventTitle} - ${formatDate(firstDate)}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
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
              onClick={onTagClick}
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
    </article>
  );
};

export default EventCard; 