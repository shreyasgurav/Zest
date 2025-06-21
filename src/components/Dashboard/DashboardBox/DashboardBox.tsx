import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './DashboardBox.module.css';

interface Event {
  id: string;
  title: string;
  image?: string;
  type: 'event';
}

interface Activity {
  id: string;
  name: string;
  activity_image?: string;
  type: 'activity';
}

type DashboardItem = Event | Activity;

interface DashboardBoxProps {
  item: DashboardItem;
}

const DashboardBox: React.FC<DashboardBoxProps> = ({ item }) => {
  const router = useRouter();

  const handleClick = () => {
    if (item.type === 'event') {
      router.push(`/event-dashboard/${item.id}`);
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

  return (
    <div className={styles.dashboardBox} onClick={handleClick}>
      <div className={styles.dashboardBoxContent}>
        {getImage() ? (
          <img 
            src={getImage()} 
            alt={getTitle()}
            className={styles.dashboardEventImage}
          />
        ) : (
          <div className={styles.dashboardImagePlaceholder}>
            {getTypeIcon()} No Image Available
          </div>
        )}
        <div className={styles.dashboardEventInfo}>
          <div className={styles.typeIndicator}>
            <span className={`${styles.typeBadge} ${styles[item.type]}`}>
              {getTypeIcon()} {getTypeBadge()}
            </span>
          </div>
          <h3 className={styles.dashboardEventTitle}>{getTitle()}</h3>
        </div>
      </div>
    </div>
  );
};

export default DashboardBox; 