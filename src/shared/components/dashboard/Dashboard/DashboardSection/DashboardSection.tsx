import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import DashboardBox from '../DashboardBox/DashboardBox';
import styles from './DashboardSection.module.css';

interface Event {
  id: string;
  title: string;
  image?: string;
  type: 'event';
  sessionId?: string;
  sessionName?: string;
}

interface Activity {
  id: string;
  name: string;
  activity_image?: string;
  type: 'activity';
}

type DashboardItem = Event | Activity;

interface DashboardSectionProps {
  pageId?: string;
  pageType?: 'artist' | 'organisation' | 'venue';
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ pageId, pageType }) => {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const fetchOrganizerContent = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        let eventsData: Event[] = [];
        if (pageId && pageType) {
          const response = await fetch(`/api/events?creatorPageId=${pageId}`);
          if (response.ok) {
            const data = await response.json();
            eventsData = (data.events || []).map((event: any) => ({
              id: event.id,
              title: event.title || event.eventTitle,
              image: event.event_image || event.eventImage,
              type: 'event' as const
            }));
          }
        }

        let activitiesData: Activity[] = [];
        if (pageId && pageType) {
          const response = await fetch(`/api/activities?creatorPageId=${pageId}`);
          if (response.ok) {
            const data = await response.json();
            activitiesData = (data.activities || []).map((activity: any) => ({
              id: activity.id,
              name: activity.name || activity.activityName,
              activity_image: activity.activity_image || activity.image,
              type: 'activity' as const
            }));
          }
        }

        const allItems: DashboardItem[] = [...eventsData, ...activitiesData];
        setItems(allItems);
      } catch (error) {
        console.error("Error fetching organizer content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerContent();
  }, [pageId, pageType, auth.currentUser]);

  if (loading) {
    return (
      <div className={styles.dashboardSection}>
        <div className={styles.loadingSkeleton}>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonBox}></div>
          <div className={styles.skeletonBox}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardSection}>
      <div className={styles.dashboardHeader}>
        <h2 className={styles.dashboardTitle}>Events & Activities ({items.length})</h2>
      </div>

      <div className={styles.dashboardEventsContainer}>
        {items.length === 0 ? (
          <div className={styles.noEventsMessage}>
            You haven't created any events or activities yet.
          </div>
        ) : (
          items.map((item) => (
            <DashboardBox key={`${item.type}-${item.id}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardSection;