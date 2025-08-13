import React, { useState, useEffect } from 'react';
import { db } from "@/infrastructure/firebase";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import DashboardBox from '../DashboardBox/DashboardBox';
import { EventCollaborationSecurity } from '@/domains/events/services/collaboration.service';
import { EventContentCollaborationService } from '@/domains/events/services/content-collaboration.service';
import CollaborationInvites from '@/domains/events/components/CollaborationInvites/CollaborationInvites';
import styles from './DashboardSection.module.css';

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

interface DashboardSectionProps {
  pageId?: string;
  pageType?: 'artist' | 'organisation' | 'venue';
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ pageId, pageType }) => {
  // Add debug logging for props
  console.log('🔍 DashboardSection Props:', {
    pageId,
    pageType,
    sessionStorageId: typeof window !== 'undefined' ? sessionStorage.getItem('selectedOrganizationPageId') : null
  });

  const [items, setItems] = useState<DashboardItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<DashboardItem[]>([]);
  const [sharedItems, setSharedItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'created' | 'collaborated' | 'all'>('all');
  const auth = getAuth();

  // Function to fetch collaborated events for this page using new collaboration system
  const fetchCollaboratedEvents = async (): Promise<DashboardItem[]> => {
    if (!auth.currentUser || !pageId || !pageType) {
      console.log('🚫 fetchCollaboratedEvents: Missing requirements:', {
        hasUser: !!auth.currentUser,
        pageId,
        pageType
      });
      return [];
    }

    try {
      console.log('🔍 fetchCollaboratedEvents: Starting fetch with:', {
        pageId,
        pageType,
        userId: auth.currentUser.uid,
        timestamp: new Date().toISOString()
      });

      // Map 'organisation' to 'organization' for the collaboration service
      // The collaboration service uses 'organization' while the UI uses 'organisation'
      const collaborationPageType = pageType === 'organisation' ? 'organization' : pageType;
      
      console.log('🔍 fetchCollaboratedEvents: About to call EventContentCollaborationService.getCollaboratedEvents with:', {
        arg1: pageId,
        arg2: collaborationPageType,
        originalPageType: pageType,
        mappedPageType: collaborationPageType
      });
      
      // Get collaborated event IDs using the new collaboration service
      const eventIds = await EventContentCollaborationService.getCollaboratedEvents(pageId, collaborationPageType);
      
      console.log('📋 fetchCollaboratedEvents: Collaboration service returned eventIds:', {
        eventIds,
        count: eventIds.length,
        pageId,
        pageType: collaborationPageType
      });

      // Debug: Call the debug function to see all collaborations
      console.log('🔍 fetchCollaboratedEvents: Calling debug function to see all collaborations...');
      await EventContentCollaborationService.debugGetAllCollaborations();
      
      if (eventIds.length === 0) {
        console.log('⚠️ fetchCollaboratedEvents: No collaborated event IDs found');
        
        // Enhanced debugging: Let's manually query to see what's in the database
        try {
          console.log('🔍 Manual query - checking for ANY collaborations with this pageId...');
          const allCollaborationsQuery = query(
            collection(db(), 'eventContentCollaboration'),
            where('collaboratorPageId', '==', pageId)
          );
          const allSnapshot = await getDocs(allCollaborationsQuery);
          console.log('🔍 All collaborations for this pageId:', {
            pageId,
            totalDocs: allSnapshot.docs.length,
            docs: allSnapshot.docs.map(doc => ({
              id: doc.id,
              data: doc.data(),
              statusMatch: doc.data().status === 'accepted',
              pageTypeMatch: doc.data().collaboratorPageType === collaborationPageType,
              showOnProfileMatch: doc.data().showOnCollaboratorProfile === true
            }))
          });

          // Also check with different page type variations
          if (pageType === 'organisation') {
            console.log('🔍 Also checking with pageType "organization"...');
            const altQuery = query(
              collection(db(), 'eventContentCollaboration'),
              where('collaboratorPageId', '==', pageId),
              where('collaboratorPageType', '==', 'organization'),
              where('status', '==', 'accepted'),
              where('showOnCollaboratorProfile', '==', true)
            );
            const altSnapshot = await getDocs(altQuery);
            console.log('🔍 Alt query results:', altSnapshot.docs.length);
          }
        } catch (manualQueryError) {
          console.error('Manual query failed:', manualQueryError);
        }
        
        return [];
      }
      
      const collaboratedEvents: DashboardItem[] = [];
      
      // Fetch event details for each collaboration
      for (const eventId of eventIds) {
        try {
          console.log(`🔍 fetchCollaboratedEvents: Fetching event details for ${eventId}`);
          const eventDoc = await getDoc(doc(db(), 'events', eventId));
          
          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            console.log(`✅ fetchCollaboratedEvents: Found event ${eventId}:`, {
              title: eventData.title || eventData.eventTitle,
              creator: eventData.creator?.name || eventData.hosting_club
            });
            
            collaboratedEvents.push({
              id: eventDoc.id,
              title: eventData.title || eventData.eventTitle,
              image: eventData.event_image,
              type: 'event',
              isShared: true,
              sharedBy: eventData.creator?.name || eventData.hosting_club || 'Unknown',
              accessLevel: 'collaboration'
            });
          } else {
            console.log(`❌ fetchCollaboratedEvents: Event ${eventId} not found in database`);
          }
        } catch (error) {
          console.error(`❌ fetchCollaboratedEvents: Error fetching event ${eventId}:`, error);
        }
      }

      console.log(`🎉 fetchCollaboratedEvents: Final result - ${collaboratedEvents.length} collaborated events found`);
      return collaboratedEvents;
    } catch (error) {
      console.error('❌ fetchCollaboratedEvents: Error fetching collaborated events:', error);
      return [];
    }
  };

  useEffect(() => {
    const fetchOrganizerContent = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // DEBUG: Check all collaboration records
        await EventContentCollaborationService.debugGetAllCollaborations();

        // Fetch owned events - ONLY events created by THIS SPECIFIC PAGE
        const eventsCollectionRef = collection(db(), "events");
        let eventsData: Event[] = [];
        
        if (pageId && pageType) {
          console.log(`🔍 Fetching events for specific page: ${pageType}/${pageId}`);
          
          // ONLY fetch events created BY THIS SPECIFIC PAGE
          // No more fetching by user ID - that was the bug!
          const ownedEventsSnapshot = await getDocs(query(
            eventsCollectionRef, 
            where("creator.pageId", "==", pageId)
          ));
          
          console.log(`✅ Found ${ownedEventsSnapshot.docs.length} events owned by this page`);
          
          eventsData = ownedEventsSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title || doc.data().eventTitle,
            image: doc.data().event_image,
            type: 'event' as const
          }));
        } else {
          console.log('⚠️ No pageId provided, cannot fetch page-specific events');
          eventsData = [];
        }

        // Fetch owned activities - ONLY activities created by THIS SPECIFIC PAGE
        const activitiesCollectionRef = collection(db(), "activities");
        let activitiesData: Activity[] = [];
        
        if (pageId && pageType) {
          console.log(`🔍 Fetching activities for specific page: ${pageType}/${pageId}`);
          
          // ONLY fetch activities created BY THIS SPECIFIC PAGE
          const ownedActivitiesSnapshot = await getDocs(query(
            activitiesCollectionRef, 
            where("creator.pageId", "==", pageId)
          ));
          
          console.log(`✅ Found ${ownedActivitiesSnapshot.docs.length} activities owned by this page`);
          
          activitiesData = ownedActivitiesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            activity_image: doc.data().activity_image,
            type: 'activity' as const
          }));
        } else {
          console.log('⚠️ No pageId provided, cannot fetch page-specific activities');
          activitiesData = [];
        }

        // Combine owned events and activities
        const ownedContent: DashboardItem[] = [...eventsData, ...activitiesData];
        setOwnedItems(ownedContent);

        // Fetch shared events
        const sharedContent = await fetchCollaboratedEvents();
        setSharedItems(sharedContent);

        // Combine all items for the "all" view
        const allItems = [...ownedContent, ...sharedContent];
        setItems(allItems);

      } catch (error) {
        console.error("Error fetching organizer content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerContent();
  }, [pageId, pageType]);

  // Refresh function for collaboration invite responses
  const refreshContent = async () => {
    if (!auth.currentUser) return;

    try {
      // Refresh collaborated events
      const sharedContent = await fetchCollaboratedEvents();
      setSharedItems(sharedContent);

      // Update all items
      const allItems = [...ownedItems, ...sharedContent];
      setItems(allItems);
    } catch (error) {
      console.error("Error refreshing content:", error);
    }
  };

  // Get items to display based on active tab
  const getDisplayItems = () => {
    switch (activeTab) {
      case 'created':
        return ownedItems;
      case 'collaborated':
        return sharedItems;
      default:
        return items;
    }
  };

  const displayItems = getDisplayItems();

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
        <h2 className={styles.dashboardTitle}>Events & Activities</h2>
        
        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({items.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'created' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('created')}
          >
            Created ({ownedItems.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'collaborated' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('collaborated')}
          >
            Collaborated ({sharedItems.length})
          </button>
        </div>
      </div>

      {/* Collaboration Invites Section - Only show on Collaborated tab */}
      {activeTab === 'collaborated' && (
        <div className={styles.collaborationInvitesSection}>
          <div className={styles.invitesHeader}>
            <h3>Pending Invitations</h3>
            <p>Accept or decline collaboration requests</p>
          </div>
          <CollaborationInvites 
            pageId={pageId}
            pageType={pageType}
            onInviteResponded={() => {
              // Refresh collaborated events when invites are responded to
              refreshContent();
            }} 
          />
        </div>
      )}

      <div className={styles.dashboardEventsContainer}>
        {displayItems.length === 0 ? (
          <div className={styles.noEventsMessage}>
            {activeTab === 'created' && "You haven't created any events or activities yet."}
            {activeTab === 'collaborated' && "No collaborated events found. Accept collaboration invites above to see events here."}
            {activeTab === 'all' && "No events or activities found."}
          </div>
        ) : (
          displayItems.map((item) => (
            <DashboardBox key={`${item.type}-${item.id}`} item={item} />
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardSection; 