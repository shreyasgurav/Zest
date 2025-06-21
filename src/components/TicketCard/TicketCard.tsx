import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaTicketAlt, FaUser, FaQrcode, FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './TicketCard.module.css';

interface TicketCardProps {
  ticket: {
    id: string;
    ticketNumber: string;
    qrCode: string;
    type: 'event' | 'activity';
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
  };
  onClick?: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick }) => {
  const [showQR, setShowQR] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000/01/01 ${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'active': return '#10b981';
      case 'used': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (ticket.status) {
      case 'active': return 'Valid';
      case 'used': return 'Used';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  return (
    <div 
      className={`${styles.ticketCard} ${ticket.status === 'used' ? styles.used : ''}`}
      onClick={onClick}
    >
      {/* Ticket Header */}
      <div className={styles.ticketHeader}>
        <div className={styles.ticketInfo}>
          <div className={styles.ticketType}>
            <FaTicketAlt className={styles.icon} />
            <span>{ticket.type === 'event' ? 'Event Ticket' : 'Activity Ticket'}</span>
          </div>
          <div className={styles.ticketNumber}>#{ticket.ticketNumber}</div>
        </div>
        <div 
          className={styles.statusBadge}
          style={{ backgroundColor: getStatusColor() }}
        >
          {getStatusText()}
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.ticketContent}>
        <div className={styles.mainInfo}>
          <h3 className={styles.title}>{ticket.title}</h3>
          {ticket.ticketType && (
            <span className={styles.ticketTypeLabel}>{ticket.ticketType}</span>
          )}
          
          <div className={styles.details}>
            <div className={styles.detailRow}>
              <FaCalendarAlt className={styles.detailIcon} />
              <span>{formatDate(ticket.selectedDate)}</span>
            </div>
            
            <div className={styles.detailRow}>
              <FaClock className={styles.detailIcon} />
              <span>
                {formatTime(ticket.selectedTimeSlot.start_time)} - {formatTime(ticket.selectedTimeSlot.end_time)}
              </span>
            </div>
            
            <div className={styles.detailRow}>
              <FaMapMarkerAlt className={styles.detailIcon} />
              <span>{ticket.venue}</span>
            </div>
            
            <div className={styles.detailRow}>
              <FaUser className={styles.detailIcon} />
              <span>{ticket.userName}</span>
            </div>
          </div>

          <div className={styles.priceSection}>
            <span className={styles.price}>₹{ticket.amount.toLocaleString()}</span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className={styles.qrSection}>
          <button 
            className={styles.qrToggle}
            onClick={(e) => {
              e.stopPropagation();
              setShowQR(!showQR);
            }}
          >
            {showQR ? <FaEyeSlash /> : <FaEye />}
            <span>{showQR ? 'Hide QR' : 'Show QR'}</span>
          </button>
          
          {showQR && (
            <div className={styles.qrCodeContainer}>
              <QRCodeSVG
                value={ticket.qrCode}
                size={120}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                includeMargin={true}
              />
              <p className={styles.qrText}>Scan at venue</p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Footer */}
      <div className={styles.ticketFooter}>
        <div className={styles.footerInfo}>
          <span>Booked: {formatDate(ticket.createdAt)}</span>
          {ticket.usedAt && (
            <span>Used: {formatDate(ticket.usedAt)}</span>
          )}
        </div>
      </div>

      {/* Decorative perforations */}
      <div className={styles.perforation}></div>
    </div>
  );
};

export default TicketCard; 