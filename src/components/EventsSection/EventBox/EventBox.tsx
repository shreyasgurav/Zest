'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Trash2, Clock, Music, Mic, PartyPopper } from 'lucide-react';
import styles from './EventBox.module.css';

interface Event {
  id: string;
  eventTitle: string;
  eventType: string;
  eventCategories?: string[];
  hostingClub: string;
  eventDateTime?: any;
  eventVenue: string;
  eventRegistrationLink?: string;
  aboutEvent: string;
  event_image: string;
  organizationId: string;
  title?: string;
  hosting_club?: string;
  event_venue?: string;
  about_event?: string;
  time_slots?: Array<{
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
  }>;
  createdAt: any;
}

interface EventBoxProps {
  event: Event;
  onDelete?: (id: string) => void;
  currentUserId?: string;
}

export default function EventBox({ event, onDelete, currentUserId }: EventBoxProps) {
  const router = useRouter();
  const isEventCreator = currentUserId && currentUserId === event?.organizationId;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const timeSlots = Array.isArray(event?.time_slots) ? event.time_slots : [];
  const firstDate = timeSlots.length > 0 ? timeSlots[0].date : "No Date Available";
  const firstTime = timeSlots.length > 0 ? timeSlots[0].start_time : "";
  
  // Use first category from eventCategories array, fallback to eventType
  const displayEventType = event.eventCategories && event.eventCategories.length > 0 
    ? event.eventCategories[0] 
    : event.eventType;

  const formatDate = (dateString: string) => {
    if (dateString === "No Date Available") return "TBA";
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

  const getEventTypeIcon = (eventType: string) => {
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
        return <PartyPopper className={styles.eventTypeIcon} />;
      default:
        return <Calendar className={styles.eventTypeIcon} />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
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
        return "party";
      case "theater":
      case "drama":
        return "theater";
      default:
        return "default";
    }
  };

  const handleClick = () => {
    router.push(`/event-profile/${event.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEventCreator) return;

    try {
      if (window.confirm("Are you sure you want to delete this event?")) {
        if (onDelete) {
          onDelete(event.id);
        }
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event. Please try again.");
    }
  };

  return (
    <div className={styles.eventBoxWrapper} onClick={handleClick}>
      <div className={styles.eventBoxCard}>
        {/* Delete Button */}
        {isEventCreator && (
          <button className={styles.deleteButton} onClick={handleDelete} aria-label="Delete event">
            <Trash2 className={styles.deleteIcon} />
          </button>
        )}

        {/* Image Section */}
        <div className={styles.imageSection}>
          {event.event_image && !imageError ? (
            <>
              <img
                src={event.event_image || "/placeholder.svg?height=400&width=300"}
                alt={event.eventTitle || event.title || "Event"}
                className={`${styles.eventImage} ${imageLoaded ? styles.imageLoaded : styles.imageLoading}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {!imageLoaded && <div className={styles.imagePlaceholder} />}
            </>
          ) : (
                      <div className={styles.noImagePlaceholder}>{getEventTypeIcon(displayEventType)}</div>
        )}

        {/* Event Type Badge */}
        <div className={`${styles.eventTypeBadge} ${styles[getEventTypeColor(displayEventType)]}`}>
          {getEventTypeIcon(displayEventType)}
          <span>{displayEventType}</span>
        </div>
        </div>

        {/* Content Section */}
        <div className={styles.eventBoxInfo}>
          {/* Title */}
          <h3>{truncateText(event.eventTitle || event.title || "", 20)}</h3>

          {/* Date & Time */}
          <div className={styles.infoRow}>
            <Clock className={styles.timeIcon} />
            <span>
              {formatDate(firstDate)} {firstTime && `• ${firstTime}`}
            </span>
          </div>

          {/* Venue */}
          <div className={styles.infoRow}>
            <MapPin className={styles.venueIcon} />
            <span className={styles.venueText}>{truncateText(event.eventVenue || event.event_venue || "", 25)}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 