import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { 
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaQrcode
} from 'react-icons/fa';
import { db } from '@/infrastructure/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getTicketDisplayStatus } from '@/domains/tickets/services/ticketValidator';
import styles from './TicketCard.module.css';

interface TicketCardProps {
  ticket: {
    id: string;
    ticketNumber: string;
    qrCode: string;
    type: 'event' | 'activity';
    eventId?: string;
    activityId?: string;
    title: string;
    venue: string;
    selectedDate: string;
    selectedTimeSlot: {
      start_time: string;
      end_time: string;
    };
    ticketType?: string;
    status: 'active' | 'used' | 'cancelled';
    userName: string;
    amount: number;
    createdAt: string;
    usedAt?: string;
    event_image?: string;
    ticketIndex?: number;
    totalTicketsInBooking?: number;
    originalBookingData?: {
      originalTotalAmount: number;
      originalTickets: any;
      bookingReference: string;
    };
  };
  onClick?: () => void;
  viewMode?: 'grid' | 'list';
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick, viewMode = 'grid' }) => {
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000/01/01 ${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusDisplay = () => {
    return getTicketDisplayStatus(ticket);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <FaCheckCircle style={{ color: '#10b981' }} />;
      case 'used':
        return <FaTimesCircle style={{ color: '#6b7280' }} />;
      case 'expired':
        return <FaClock style={{ color: '#ef4444' }} />;
      case 'cancelled':
        return <FaExclamationTriangle style={{ color: '#f59e0b' }} />;
      default:
        return <FaTimesCircle style={{ color: '#6b7280' }} />;
    }
  };

  const statusDisplay = getStatusDisplay();

  // Fetch event/activity image
  useEffect(() => {
    const fetchEventImage = async () => {
      try {
        setImageLoading(true);
        
        if (ticket.eventId) {
          const eventDoc = await getDoc(doc(db(), 'events', ticket.eventId));
          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            setEventImage(eventData.event_image || null);
          }
        } else if (ticket.activityId) {
          const activityDoc = await getDoc(doc(db(), 'activities', ticket.activityId));
          if (activityDoc.exists()) {
            const activityData = activityDoc.data();
            setEventImage(activityData.activity_image || activityData.event_image || null);
          }
        }
      } catch (error) {
        console.error('Error fetching event/activity image:', error);
        setEventImage(null);
      } finally {
        setImageLoading(false);
      }
    };

    if (ticket.eventId || ticket.activityId) {
      fetchEventImage();
    } else {
      setImageLoading(false);
    }
  }, [ticket.eventId, ticket.activityId]);

  return (
    <div className={styles.ticketCard} onClick={onClick}>
      <div className={styles.ticketContent}>
        <div className={styles.ticketInfo}>
          <div className={styles.eventDetails}>
            <h2 className={styles.eventName}>{ticket.title}</h2>
            <div className={styles.dateTime}>
              {formatDate(ticket.selectedDate)} | {formatTime(ticket.selectedTimeSlot.start_time)}
            </div>
            <div className={styles.ticketCount}>
              {ticket.totalTicketsInBooking && ticket.totalTicketsInBooking > 1 ? (
                <div className={styles.groupBookingInfo}>
                  <span className={styles.ticketNumber}>
                    Ticket {ticket.ticketIndex} of {ticket.totalTicketsInBooking}
                  </span>
                  <span className={styles.groupBookingBadge}>
                    Group Booking
                  </span>
                </div>
              ) : (
                '1 ticket'
              )}
            </div>
          </div>

          <div className={styles.bottomSection}>
            <div className={styles.leftBottom}>
              <div className={styles.locationSection}>
                <div className={styles.locationLabel}>Location</div>
                <div className={styles.locationRow}>
                  <MapPin size={16} className={styles.locationIcon} />
                  <div className={styles.locationName}>{ticket.venue}</div>
                </div>
              </div>
              <div 
                className={styles.statusBadge} 
                style={{ backgroundColor: statusDisplay.color }}
              >
                <span className={styles.statusIcon}>
                  {getStatusIcon(statusDisplay.status)}
                </span>
                <span>{statusDisplay.displayText}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.eventImageContainer}>
          {imageLoading ? (
            <div className={styles.placeholderImage}>
              <div className={styles.loadingSpinner}></div>
              <span className={styles.placeholderText}>Loading...</span>
            </div>
          ) : eventImage ? (
            <Image
              src={eventImage}
              alt={ticket.title}
              width={150}
              height={200}
              className={styles.eventImage}
              onError={(e) => {
                console.log('Image failed to load:', eventImage);
                setEventImage(null);
              }}
            />
          ) : (
            <div className={styles.placeholderImage}>
              <FaQrcode size={40} />
              <span className={styles.placeholderText}>
                {ticket.type.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCard; 