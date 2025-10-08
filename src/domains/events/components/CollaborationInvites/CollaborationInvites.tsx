'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaCheck, 
  FaTimes, 
  FaUserPlus,
  FaCalendarAlt,
  FaArrowRight
} from 'react-icons/fa';
import { getAuth } from 'firebase/auth';
import { EventContentCollaborationService, EventContentCollaboration } from '@/domains/events/services/content-collaboration.service';
import styles from './CollaborationInvites.module.css';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/infrastructure/firebase';

interface CollaborationInvitesProps {
  pageId?: string;
  pageType?: 'artist' | 'organisation' | 'venue';
  onInviteResponded?: () => void;
}

const CollaborationInvites: React.FC<CollaborationInvitesProps> = ({ 
  pageId, 
  pageType, 
  onInviteResponded 
}) => {
  // Add debug logging for props
  console.log('🔍 CollaborationInvites Component Props:', {
    pageId,
    pageType,
    componentLocation: new Error().stack?.split('\n')[2] // This will show where the component is being rendered from
  });

  const auth = getAuth();
  const [invites, setInvites] = useState<EventContentCollaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, [pageId, pageType]);

  const loadInvites = async () => {
    if (!auth.currentUser || !pageId || !pageType) {
      console.log('🚫 CollaborationInvites: Missing requirements:', {
        hasUser: !!auth.currentUser,
        pageId,
        pageType
      });
      setInvites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 CollaborationInvites: Fetching invites for specific page:', {
        pageId,
        pageType,
        userId: auth.currentUser.uid
      });

      // 🚨 ENHANCED DEBUG: First check what invites exist for this user across ALL pages
      console.log('🐛 DEBUG: Checking ALL invites for current user...');
      const allInvites = await EventContentCollaborationService.getCollaborationInvites(auth.currentUser.uid);
      console.log('📋 CollaborationInvites: All invites for user:', {
        totalInvites: allInvites.length,
        invites: allInvites.map(invite => ({
          eventTitle: invite.eventTitle,
          collaboratorPageId: invite.collaboratorPageId,
          collaboratorPageType: invite.collaboratorPageType,
          collaboratorPageUsername: invite.collaboratorPageUsername,
          status: invite.status
        }))
      });

      // 🚨 DEBUG: Also run the debug function to see what's happening
      await EventContentCollaborationService.debugUserInvites(auth.currentUser.uid);

      // Filter invites to only show ones for THIS SPECIFIC PAGE
      const collaborationPageType = pageType === 'organisation' ? 'organization' : pageType;
      console.log('🔍 Filtering for current page:', {
        currentPageId: pageId,
        currentPageType: collaborationPageType,
        originalPageType: pageType
      });

      const pageSpecificInvites = allInvites.filter(invite => {
        // Normalize page types to handle organisation/organization spelling differences
        const normalizeType = (t: string) => t.replace('organisation', 'organization');
        const pageTypeMatch = normalizeType(invite.collaboratorPageType).toLowerCase() === normalizeType(collaborationPageType).toLowerCase();

        const isForThisPage = invite.collaboratorPageId === pageId && pageTypeMatch;
        
        console.log(`🔍 Checking invite ${invite.id}:`, {
          eventTitle: invite.eventTitle,
          targetPageId: invite.collaboratorPageId,
          targetPageType: invite.collaboratorPageType,
          currentPageId: pageId,
          currentPageType: collaborationPageType,
          isMatch: isForThisPage
        });
        
        return isForThisPage;
      });

      console.log(`✅ CollaborationInvites: Found ${pageSpecificInvites.length} invites for this page (${pageType}/${pageId})`);
      
      // 🚨 DEBUG: If no invites found, let's check if the page exists in database
      if (pageSpecificInvites.length === 0) {
        console.log('🔍 No invites found, checking if page exists in database...');
        const collectionName = pageType === 'organisation' ? 'Organisations' : 
                              pageType === 'artist' ? 'Artists' : 'Venues';
        
        try {
          const pageDoc = await getDoc(doc(db(), collectionName, pageId));
          console.log('Page exists:', {
            exists: pageDoc.exists(),
            data: pageDoc.exists() ? {
              name: pageDoc.data()?.name,
              username: pageDoc.data()?.username,
              ownerId: pageDoc.data()?.ownerId
            } : 'Not found'
          });
        } catch (error) {
          console.error('Error checking page existence:', error);
        }
      }

      setInvites(pageSpecificInvites);
    } catch (error) {
      console.error('Error loading collaboration invites:', error);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (inviteId: string, response: 'accepted' | 'declined') => {
    if (!auth.currentUser) return;

    try {
      setRespondingTo(inviteId);
      
      const result = await EventContentCollaborationService.respondToInvite(
        inviteId,
        response,
        auth.currentUser.uid
      );

      if (result.success) {
        // Remove the invite from the list
        setInvites(prev => prev.filter(invite => invite.id !== inviteId));
        onInviteResponded?.();
      } else {
        alert(result.error || 'Failed to respond to invite');
      }
    } catch (error) {
      alert('Failed to respond to collaboration invite');
    } finally {
      setRespondingTo(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.invitesContainer}>
        <div className={styles.header}>
          <FaUsers className={styles.headerIcon} />
          <span>Collaboration Invites</span>
        </div>
        <div className={styles.loading}>Loading invites...</div>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className={styles.invitesContainer}>
        <div className={styles.header}>
          <FaUsers className={styles.headerIcon} />
          <span>Collaboration Invites</span>
        </div>
        <div className={styles.emptyState}>
          <FaUserPlus className={styles.emptyIcon} />
          <p>No pending collaboration invites for this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.invitesContainer}>
      <div className={styles.header}>
        <FaUsers className={styles.headerIcon} />
        <span>Collaboration Invites ({invites.length})</span>
      </div>

      <div className={styles.invitesList}>
        {invites.map((invite) => (
          <div key={invite.id} className={styles.inviteItem}>
            <div className={styles.inviteHeader}>
              <div className={styles.eventInfo}>
                <div className={styles.eventTitle}>{invite.eventTitle}</div>
                <div className={styles.inviteFrom}>
                  from <strong>@{invite.creatorPageUsername}</strong>
                </div>
              </div>
              <div className={styles.collaborationBadge}>
                COLLAB
              </div>
            </div>

            {invite.message && (
              <div className={styles.inviteMessage}>
                "{invite.message}"
              </div>
            )}

            <div className={styles.inviteDetails}>
              <div className={styles.pageInfo}>
                Your <strong>{invite.collaboratorPageType}</strong> page:{' '}
                <span className={styles.pageName}>@{invite.collaboratorPageUsername}</span>
              </div>
              <div className={styles.inviteDate}>
                <FaCalendarAlt className={styles.dateIcon} />
                {new Date(invite.invitedAt).toLocaleDateString()}
              </div>
            </div>

            <div className={styles.inviteActions}>
              <button
                className={styles.declineButton}
                onClick={() => handleResponse(invite.id!, 'declined')}
                disabled={respondingTo === invite.id}
              >
                <FaTimes />
                {respondingTo === invite.id ? 'Declining...' : 'Decline'}
              </button>
              <button
                className={styles.acceptButton}
                onClick={() => handleResponse(invite.id!, 'accepted')}
                disabled={respondingTo === invite.id}
              >
                <FaCheck />
                {respondingTo === invite.id ? 'Accepting...' : 'Accept'}
              </button>
            </div>

            <div className={styles.collaborationNote}>
              <FaArrowRight className={styles.noteIcon} />
              This event will appear on your page profile
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollaborationInvites; 