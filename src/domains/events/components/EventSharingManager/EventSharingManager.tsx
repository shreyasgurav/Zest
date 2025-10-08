'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/infrastructure/firebase';
import { 
  EventCollaborationSecurity, 
  EventCollaborationAssignment 
} from '@/domains/events/services/collaboration.service';
import styles from './EventSharingManager.module.css';

interface EventSharingManagerProps {
  eventId: string;
  eventTitle: string;
  sessionId: string;
  sessionName: string;
  onClose: () => void;
}

interface NewUserCollaborator {
  phone: string;
  expiryOption: 'never' | '24h' | '7d' | '30d';
  message: string;
}

const EventSharingManager: React.FC<EventSharingManagerProps> = ({
  eventId,
  eventTitle,
  sessionId,
  sessionName,
  onClose
}) => {
  const [collaborators, setCollaborators] = useState<EventCollaborationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // User collaborator form
  const [newUserCollaborator, setNewUserCollaborator] = useState<NewUserCollaborator>({
    phone: '',
    expiryOption: 'never',
    message: ''
  });
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [phoneError, setPhoneError] = useState<string>('');
  const [isValidPhone, setIsValidPhone] = useState<boolean>(false);

  useEffect(() => {
    loadCollaborators();
  }, [eventId]);

  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const data = await EventCollaborationSecurity.getSessionCollaborators(eventId, sessionId);
      // Only show user collaborators
      const userCollaborators = data.filter(c => c.collaboratorType === 'user');
      setCollaborators(userCollaborators);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      setMessage({ type: 'error', text: 'Failed to load collaborators' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth().currentUser || !newUserCollaborator.phone.trim()) return;

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // Convert expiry option to hours
      const expiresInHours = newUserCollaborator.expiryOption === 'never' ? undefined :
                           newUserCollaborator.expiryOption === '24h' ? 24 :
                           newUserCollaborator.expiryOption === '7d' ? 24 * 7 :
                           newUserCollaborator.expiryOption === '30d' ? 24 * 30 : undefined;

      const result = await EventCollaborationSecurity.shareSession(
        eventId,
        sessionId,
        sessionName,
        'user',
        newUserCollaborator.phone.trim(),
        'checkin_only', // Always check-in only for users
        currentUser.uid,
        currentUser.displayName || 'Unknown User',
        expiresInHours,
        newUserCollaborator.message.trim(),
        false // Don't show on event page
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Check-in access granted successfully!' });
        setShowAddForm(false);
        setNewUserCollaborator({
          phone: '',
          expiryOption: 'never',
          message: ''
        });
        await loadCollaborators();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to grant access' });
      }
    } catch (error) {
      console.error('Error adding user collaborator:', error);
      setMessage({ type: 'error', text: 'Failed to grant access' });
    }
  };

  const handleRemoveCollaborator = async (assignment: EventCollaborationAssignment) => {
    if (!auth().currentUser) return;

    const collaboratorName = assignment.userName || assignment.userPhone;

    if (!confirm(`Remove check-in access for ${collaboratorName}?`)) return;

    try {
      const result = await EventCollaborationSecurity.removeSessionAccess(
        eventId,
        sessionId,
        assignment.id!,
        auth().currentUser!.uid
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Check-in access removed successfully!' });
        await loadCollaborators();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to remove access' });
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      setMessage({ type: 'error', text: 'Failed to remove access' });
    }
  };

  const handlePhoneChange = (phone: string) => {
    setNewUserCollaborator(prev => ({ ...prev, phone }));
    
    if (phone.trim()) {
      const validation = EventCollaborationSecurity.validatePhoneNumber(phone.trim());
      setIsValidPhone(validation.isValid);
      setPhoneError(validation.isValid ? '' : validation.error || 'Invalid phone format');
    } else {
      setIsValidPhone(false);
      setPhoneError('');
    }
  };

  const getStatusBadge = (assignment: EventCollaborationAssignment) => {
    if (assignment.expiresAt && new Date(assignment.expiresAt) < new Date()) {
      return <span className={`${styles.statusBadge} ${styles.expired}`}>Expired</span>;
    }
    
    const statusClasses = {
      active: styles.active,
      pending: styles.pending,
      declined: styles.declined,
      expired: styles.expired
    };

    return (
      <span className={`${styles.statusBadge} ${statusClasses[assignment.status] || ''}`}>
        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
      </span>
    );
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Session Check-in Access</h2>
          <p className={styles.eventInfo}>
            Managing: <strong>{sessionName}</strong> ({eventTitle})
          </p>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Check-in Collaborators ({collaborators.length})</h3>
              <p className={styles.sectionDescription}>
                Grant check-in access to users via their phone number. They can only check-in attendees and view the attendee list.
              </p>
              <button 
                className={styles.addButton}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? 'Cancel' : '+ Grant Check-in Access'}
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className={styles.addForm}>
                <h4>Grant Check-in Access</h4>
                
                <form onSubmit={handleAddUserCollaborator}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Phone Number *</label>
                      <input
                        type="tel"
                        value={newUserCollaborator.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="+1234567890 (international format)"
                        required
                        className={phoneError ? styles.inputError : isValidPhone ? styles.inputValid : ''}
                      />
                      {phoneError && <span className={styles.errorText}>{phoneError}</span>}
                      {isValidPhone && <span className={styles.successText}>✓ Valid phone number</span>}
                    </div>
                    <div className={styles.formGroup}>
                      <label>Access Expires</label>
                      <select
                        value={newUserCollaborator.expiryOption}
                        onChange={(e) => setNewUserCollaborator(prev => ({ 
                          ...prev, 
                          expiryOption: e.target.value as 'never' | '24h' | '7d' | '30d'
                        }))}
                      >
                        <option value="never">Never</option>
                        <option value="24h">24 Hours</option>
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Message (optional)</label>
                    <textarea
                      value={newUserCollaborator.message}
                      onChange={(e) => setNewUserCollaborator(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Add a personal message..."
                      rows={3}
                    />
                  </div>

                  <div className={styles.accessLevelInfo}>
                    <h5>Access Level: Check-in Only</h5>
                    <p>This user will only be able to check-in attendees and view the attendee list for check-in purposes. No other management access is granted.</p>
                  </div>

                  <div className={styles.formActions}>
                    <button type="button" onClick={() => setShowAddForm(false)} className={styles.cancelButton}>
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className={styles.shareButton}
                      disabled={!isValidPhone || !newUserCollaborator.phone.trim()}
                    >
                      Grant Access
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Existing Collaborators List */}
            {loading ? (
              <div className={styles.loading}>Loading collaborators...</div>
            ) : (
              <div className={styles.collaboratorsList}>
                {collaborators.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No check-in collaborators yet.</p>
                    <p>Grant access to users so they can help with attendee check-ins.</p>
                  </div>
                ) : (
                  collaborators.map((collaborator) => (
                    <div key={collaborator.id} className={styles.collaboratorItem}>
                      <div className={styles.collaboratorInfo}>
                        <div className={styles.collaboratorHeader}>
                          <span className={styles.collaboratorName}>
                            {collaborator.userName || 'Unknown User'}
                          </span>
                          <span className={styles.collaboratorPhone}>
                            {collaborator.userPhone}
                          </span>
                          {getStatusBadge(collaborator)}
                        </div>
                        
                        <div className={styles.collaboratorDetails}>
                          <span className={styles.accessLevel}>Check-in Only Access</span>
                          {collaborator.expiresAt && (
                            <span className={styles.expiry}>
                              Expires: {new Date(collaborator.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                                                 {collaborator.invitationMessage && (
                           <div className={styles.collaboratorMessage}>
                             <strong>Message:</strong> {collaborator.invitationMessage}
                           </div>
                         )}
                      </div>
                      
                      <button 
                        className={styles.removeButton}
                        onClick={() => handleRemoveCollaborator(collaborator)}
                        title="Remove access"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSharingManager; 