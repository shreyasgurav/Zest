'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaPlus, 
  FaTimes, 
  FaCheck, 
  FaTrash, 
  FaPaperPlane,
  FaUserPlus,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { getAuth } from 'firebase/auth';
import { EventContentCollaborationService, EventContentCollaboration } from '@/domains/events/services/content-collaboration.service';
import styles from './EventCollaborationManager.module.css';

interface EventCollaborationManagerProps {
  eventId: string;
  eventTitle: string;
  eventImage?: string;
  canManageCollaborations: boolean;
  onCollaborationChange?: () => void;
}

const EventCollaborationManager: React.FC<EventCollaborationManagerProps> = ({
  eventId,
  eventTitle,
  eventImage,
  canManageCollaborations,
  onCollaborationChange
}) => {
  const auth = getAuth();
  const [collaborations, setCollaborations] = useState<EventContentCollaboration[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Invite form state
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteResult, setInviteResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadCollaborations();
  }, [eventId]);

  const loadCollaborations = async () => {
    try {
      setLoading(true);
      const collabs = await EventContentCollaborationService.getEventCollaborations(eventId);
      setCollaborations(collabs);
    } catch (error) {
      console.error('Error loading collaborations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!auth.currentUser || !inviteUsername.trim()) return;

    try {
      setInviteLoading(true);
      setInviteResult(null);

      console.log('🚀 EventCollaborationManager: Sending invite...', {
        eventId,
        inviteUsername: inviteUsername.trim(),
        currentUser: auth.currentUser.uid,
        eventTitle
      });

      // The service will automatically find the sender's page
      const result = await EventContentCollaborationService.sendCollaborationInvite(
        eventId,
        inviteUsername.trim(),
        inviteMessage.trim(),
        auth.currentUser.uid,
        '' // No longer needed - service finds page automatically
      );

      console.log('📨 EventCollaborationManager: Invite result:', result);

      if (result.success) {
        setInviteResult({ type: 'success', message: `Collaboration invite sent to @${inviteUsername}!` });
        setInviteUsername('');
        setInviteMessage('');
        setShowInviteForm(false);
        await loadCollaborations();
        onCollaborationChange?.();
        
        // 🚨 DEBUG: Also run a debug check to verify the invite was created
        console.log('🔍 Verifying invite was created...');
        await EventContentCollaborationService.debugGetAllCollaborations();
      } else {
        console.error('❌ Invite failed:', result.error);
        setInviteResult({ type: 'error', message: result.error || 'Failed to send invite' });
      }
    } catch (error) {
      console.error('❌ Exception sending invite:', error);
      setInviteResult({ type: 'error', message: 'Failed to send collaboration invite' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveCollaboration = async (collaborationId: string) => {
    if (!auth.currentUser) return;

    const confirmRemove = window.confirm('Are you sure you want to remove this collaboration? The event will no longer appear on their profile.');
    if (!confirmRemove) return;

    try {
      const result = await EventContentCollaborationService.removeCollaboration(collaborationId, auth.currentUser.uid);
      
      if (result.success) {
        await loadCollaborations();
        onCollaborationChange?.();
      } else {
        alert(result.error || 'Failed to remove collaboration');
      }
    } catch (error) {
      alert('Failed to remove collaboration');
    }
  };

  if (loading) {
    return (
      <div className={styles.collaborationManager}>
        <div className={styles.header}>
          <FaUsers className={styles.headerIcon} />
          <h3>Event Collaborations</h3>
        </div>
        <div className={styles.loading}>Loading collaborations...</div>
      </div>
    );
  }

  return (
    <div className={styles.collaborationManager}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FaUsers className={styles.headerIcon} />
          <div>
            <h3>Event Collaborations</h3>
            <p className={styles.subtitle}>Share this event on other pages</p>
          </div>
        </div>
        {canManageCollaborations && (
          <button
            className={styles.inviteButton}
            onClick={() => setShowInviteForm(true)}
            disabled={showInviteForm}
          >
            <FaUserPlus /> Invite Page
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className={styles.inviteForm}>
          <div className={styles.formHeader}>
            <h4>Invite Page to Collaborate</h4>
            <button
              className={styles.closeButton}
              onClick={() => setShowInviteForm(false)}
            >
              <FaTimes />
            </button>
          </div>

          <div className={styles.formContent}>
            <div className={styles.inputGroup}>
              <label>Page Username</label>
              <div className={styles.usernameInput}>
                <span className={styles.atSymbol}>@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  disabled={inviteLoading}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Message (Optional)</label>
              <textarea
                placeholder="Add a personal message..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                disabled={inviteLoading}
                rows={3}
              />
            </div>

            {inviteResult && (
              <div className={`${styles.result} ${styles[inviteResult.type]}`}>
                {inviteResult.message}
              </div>
            )}

            <div className={styles.formActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowInviteForm(false)}
                disabled={inviteLoading}
              >
                Cancel
              </button>
              <button
                className={styles.sendButton}
                onClick={handleSendInvite}
                disabled={inviteLoading || !inviteUsername.trim()}
              >
                {inviteLoading ? 'Sending...' : (
                  <>
                    <FaPaperPlane /> Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaborations List */}
      <div className={styles.collaborationsList}>
        {collaborations.length === 0 ? (
          <div className={styles.emptyState}>
            <FaUsers className={styles.emptyIcon} />
            <h4>No Collaborations Yet</h4>
            <p>Invite other pages to collaborate and share this event on their profiles.</p>
            {canManageCollaborations && (
              <button
                className={styles.emptyStateButton}
                onClick={() => setShowInviteForm(true)}
              >
                <FaUserPlus /> Send First Invite
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.collaborationsHeader}>
              <span>{collaborations.length} Active Collaboration{collaborations.length !== 1 ? 's' : ''}</span>
            </div>
            {collaborations.map((collaboration) => (
              <div key={collaboration.id} className={styles.collaborationItem}>
                <div className={styles.collaboratorInfo}>
                  <div className={styles.collaboratorDetails}>
                    <div className={styles.collaboratorName}>
                      {collaboration.collaboratorPageName}
                    </div>
                    <div className={styles.collaboratorMeta}>
                      @{collaboration.collaboratorPageUsername} • {collaboration.collaboratorPageType}
                    </div>
                    {collaboration.message && (
                      <div className={styles.collaborationMessage}>
                        "{collaboration.message}"
                      </div>
                    )}
                  </div>
                  <div className={styles.collaborationStatus}>
                    <div className={styles.statusBadge}>
                      <FaCheck className={styles.statusIcon} />
                      Accepted
                    </div>
                    <div className={styles.acceptedDate}>
                      {new Date(collaboration.respondedAt || collaboration.invitedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className={styles.collaborationActions}>
                  <div className={styles.visibilityStatus}>
                    {collaboration.showOnCollaboratorProfile ? (
                      <>
                        <FaEye className={styles.visibilityIcon} />
                        <span>Visible on profile</span>
                      </>
                    ) : (
                      <>
                        <FaEyeSlash className={styles.visibilityIcon} />
                        <span>Hidden from profile</span>
                      </>
                    )}
                  </div>
                  
                  {canManageCollaborations && (
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveCollaboration(collaboration.id!)}
                      title="Remove collaboration"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default EventCollaborationManager; 