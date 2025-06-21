import React, { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import DashboardBox from '../DashboardBox/DashboardBox';
import styles from './DashboardSection.module.css';

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

const DashboardSection: React.FC = () => {
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
        // Fetch events
        const eventsCollectionRef = collection(db, "events");
        const eventsQuery = query(
          eventsCollectionRef,
          where("organizationId", "==", auth.currentUser.uid)
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData: Event[] = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || doc.data().eventTitle,
          image: doc.data().event_image,
          type: 'event'
        }));

        // Fetch activities
        const activitiesCollectionRef = collection(db, "activities");
        const activitiesQuery = query(
          activitiesCollectionRef,
          where("organizationId", "==", auth.currentUser.uid)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activitiesData: Activity[] = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          activity_image: doc.data().activity_image,
          type: 'activity'
        }));

        // Combine both arrays
        const combinedItems: DashboardItem[] = [...eventsData, ...activitiesData];
        setItems(combinedItems);
      } catch (error) {
        console.error("Error fetching organizer content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerContent();
  }, []);

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
      <h2 className={styles.dashboardTitle}>My Events & Activities</h2>
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