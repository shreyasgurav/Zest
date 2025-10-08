import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './DashboardBox.module.css';

interface Event {
  id: string;
  title: string;
  image?: string;
  type: 'event';
  isShared?: boolean;
  sharedBy?: string;
  accessLevel?: string;
  sessionId?: string;
  sessionName?: string;
}

interface Activity {
  id: string;
  name: string;
  activity_image?: string;
  type: 'activity';
  isShared?: boolean;
  sharedBy?: string;
  accessLevel?: string;
}

type DashboardItem = Event | Activity;

interface DashboardBoxProps {
  item: DashboardItem;
}

const DashboardBox: React.FC<DashboardBoxProps> = ({ item }) => {
  const router = useRouter();

  const handleClick = () => {
    if (item.type === 'event') {
      if (item.accessLevel === 'collaboration') {
        router.push(`/event-profile/${item.id}`);
      } else {
        router.push(`/event-dashboard/${item.id}`);
      }
    } else {
      router.push(`/activity-dashboard/${item.id}`);
    }
  };

  const getTitle = () => {
    return item.type === 'event' ? item.title : item.name;
  };

  const getImage = () => {
    return item.type === 'event' ? item.image : item.activity_image;
  };

  const getTypeIcon = () => {
    return item.type === 'event' ? '🎪' : '🎯';
  };

  const getTypeBadge = () => {
    return item.type === 'event' ? 'Event' : 'Activity';
  };

  const isCollaboratedEvent = () => {
    return item.type === 'event' && item.accessLevel === 'collaboration';
  };

  return (
    <div className={styles.dashboardBox} onClick={handleClick}>
      <div className={styles.dashboardBoxContent}>
        {getImage() ? (
          <div className={styles.imageContainer}>
            <img 
              src={getImage()} 
              alt={getTitle()}
              className={styles.dashboardEventImage}
            />
            {isCollaboratedEvent() && (
              <div className={styles.collabBadge}>
                COLLAB
              </div>
            )}
          </div>
        ) : (
          <div className={styles.dashboardImagePlaceholder}>
            {getTypeIcon()} No Image Available
            {isCollaboratedEvent() && (
              <div className={styles.collabBadge}>
                COLLAB
              </div>
            )}
          </div>
        )}
        <div className={styles.dashboardEventInfo}>
          <div className={styles.typeIndicator}>
            <span className={`${styles.typeBadge} ${styles[item.type]} ${isCollaboratedEvent() ? styles.collaborated : ''}`}>
              {getTypeIcon()} {getTypeBadge()}
            </span>
            {item.isShared && item.accessLevel !== 'collaboration' && (
              <span className={`${styles.sharedBadge} ${styles.checkinOnly}`}>
                <span className={styles.shareIcon}>✅</span>
                Check-in Access
              </span>
            )}
          </div>
          <h3 className={styles.dashboardEventTitle}>
            {getTitle()}
            {item.isShared && item.type === 'event' && item.sessionName && (
              <span className={styles.sessionInfo}>
                ({item.sessionName})
              </span>
            )}
          </h3>
          {isCollaboratedEvent() && item.sharedBy && (
            <p className={styles.sharedByText}>
              🤝 Collaborating with {item.sharedBy}
            </p>
          )}
          {item.isShared && item.sharedBy && !isCollaboratedEvent() && (
            <p className={styles.sharedByText}>
              Shared by {item.sharedBy}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardBox; 