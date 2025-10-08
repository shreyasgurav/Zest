'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/infrastructure/firebase';
import { ContentSharingSecurity, ContentShareAssignment, ContentPermissions } from '@/shared/utils/security/contentSharingSecurity';
import styles from './ContentSharingManager.module.css';

interface ContentSharingManagerProps {
  contentType: 'artist' | 'organization' | 'venue' | 'event' | 'activity';
  contentId: string;
  contentName: string;
  onClose: () => void;
}

interface NewCollaboratorData {
  phone: string;
  expiryOption: 'never' | '24h' | '7d' | '30d';
  message: string;
}

const ContentSharingManager: React.FC<ContentSharingManagerProps> = ({
  contentType,
  contentId,
  contentName,
  onClose
}) => {
  const [collaborators, setCollaborators] = useState<ContentShareAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCollaboratorData, setNewCollaboratorData] = useState<NewCollaboratorData>({
    phone: '',
    expiryOption: 'never',
    message: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [phoneError, setPhoneError] = useState<string>('');
  const [isValidPhone, setIsValidPhone] = useState<boolean>(false);

  useEffect(() => {
    loadCollaborators();
  }, [contentType, contentId]);

  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const data = await ContentSharingSecurity.getContentCollaborators(contentType, contentId);
      setCollaborators(data);
    } catch (error) {
      console.error('Error loading collaborators:', error);
      setMessage({ type: 'error', text: 'Failed to load collaborators' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth().currentUser || !newCollaboratorData.phone.trim()) return;

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // Pre-validate phone number on client side
      const phoneValidation = ContentSharingSecurity.validatePhoneNumber(newCollaboratorData.phone.trim());
      if (!phoneValidation.isValid) {
        setMessage({ type: 'error', text: phoneValidation.error || 'Invalid phone number format' });
        return;
      }

      // Pre-validate message on client side  
      if (newCollaboratorData.message && newCollaboratorData.message.trim() !== '') {
        const messageValidation = ContentSharingSecurity.validateMessage(newCollaboratorData.message);
        if (!messageValidation.isValid) {
          setMessage({ type: 'error', text: messageValidation.error || 'Message contains invalid content' });
          return;
        }
      }

      // Always use editor permissions
      const permissions = ContentSharingSecurity.getPermissionTemplates().editor;
      
      // Convert expiry option to hours
      const expiresInHours = newCollaboratorData.expiryOption === 'never' ? undefined :
                           newCollaboratorData.expiryOption === '24h' ? 24 :
                           newCollaboratorData.expiryOption === '7d' ? 24 * 7 :
                           newCollaboratorData.expiryOption === '30d' ? 24 * 30 : undefined;

      const result = await ContentSharingSecurity.shareContent(
        contentType,
        contentId,
        newCollaboratorData.phone.trim(),
        'Editor', // Default name
        permissions,
        currentUser.uid,
        currentUser.displayName || 'Unknown User',
        expiresInHours,
        newCollaboratorData.message.trim()
      );

      if (result.success) {
        if (result.assignmentId) {
          setMessage({ type: 'success', text: 'User has been granted access successfully!' });
        } else if (result.invitationId) {
          setMessage({ type: 'success', text: 'Invitation sent! The user will receive an email invitation.' });
        }
        
        setShowAddForm(false);
        setNewCollaboratorData({
          phone: '',
          expiryOption: 'never',
          message: ''
        });
        
        await loadCollaborators();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to share content' });
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
      setMessage({ type: 'error', text: 'Failed to add collaborator' });
    }
  };

  const handleRemoveCollaborator = async (assignment: ContentShareAssignment) => {
    if (!auth().currentUser) return;

    if (!confirm(`Remove ${assignment.userName || assignment.userPhone} from this ${contentType}?`)) return;

    try {
      const result = await ContentSharingSecurity.removeSharedAccess(
        contentType,
        contentId,
        assignment.userId,
        auth().currentUser!.uid
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Access removed successfully!' });
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
    setNewCollaboratorData(prev => ({ ...prev, phone }));
    
    if (phone.trim()) {
      const validation = ContentSharingSecurity.validatePhoneNumber(phone.trim());
      setIsValidPhone(validation.isValid);
      setPhoneError(validation.isValid ? '' : validation.error || 'Invalid phone format');
    } else {
      setIsValidPhone(false);
      setPhoneError('');
    }
  };

  const getRoleDisplay = (permissions: ContentPermissions) => {
    const roleLabels = {
      owner: 'Owner',
      admin: 'Admin',
      editor: 'Editor', 
      viewer: 'Viewer',
      unauthorized: 'No Access'
    };

    return roleLabels[permissions.role] || permissions.role;
  };

  const getPermissionsDisplay = (permissions: ContentPermissions) => {
    const perms = [];
    if (permissions.canView) perms.push('View');
    if (permissions.canEdit) perms.push('Edit');
    if (permissions.canManage) perms.push('Manage');
    if (permissions.canInviteOthers) perms.push('Invite Others');
    if (permissions.canViewAnalytics) perms.push('View Analytics');
    if (permissions.canDelete) perms.push('Delete');
    
    return perms.join(', ') || 'No permissions';
  };

  const isExpired = (assignment: ContentShareAssignment) => {
    if (!assignment.expiresAt) return false;
    return new Date(assignment.expiresAt) < new Date();
  };

  const getStatusBadge = (assignment: ContentShareAssignment) => {
    if (isExpired(assignment)) {
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
          <h2>Manage Access</h2>
          <p className={styles.contentInfo}>
            Sharing: <strong>{contentName}</strong> ({contentType})
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
          {/* Current Collaborators */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Current Access ({collaborators.length})</h3>
              <button 
                className={styles.addButton}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? 'Cancel' : '+ Share Access'}
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading collaborators...</div>
            ) : collaborators.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No one else has access to this {contentType} yet.</p>
                <p>Share access to collaborate with others!</p>
              </div>
            ) : (
              <div className={styles.collaboratorsList}>
                {collaborators.map((collaborator, index) => (
                  <div key={collaborator.id || index} className={styles.collaboratorItem}>
                    <div className={styles.collaboratorInfo}>
                      <div className={styles.collaboratorName}>
                        {collaborator.userName || 'Unknown User'}
                      </div>
                      <div className={styles.collaboratorEmail}>
                        {collaborator.userPhone}
                      </div>
                      <div className={styles.collaboratorRole}>
                        {getRoleDisplay(collaborator.permissions)}
                      </div>
                      <div className={styles.collaboratorPermissions}>
                        {getPermissionsDisplay(collaborator.permissions)}
                      </div>
                      {collaborator.expiresAt && (
                        <div className={styles.collaboratorExpiry}>
                          Expires: {new Date(collaborator.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className={styles.collaboratorActions}>
                      {getStatusBadge(collaborator)}
                      <button 
                        className={styles.removeButton}
                        onClick={() => handleRemoveCollaborator(collaborator)}
                        title="Remove access"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Collaborator Form */}
          {showAddForm && (
            <div className={styles.section}>
              <h3>Share Access</h3>
              
              <form onSubmit={handleAddCollaborator} className={styles.addForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      value={newCollaboratorData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="+1234567890 (international format)"
                      required
                      className={phoneError ? styles.inputError : isValidPhone ? styles.inputValid : ''}
                    />
                    {phoneError && <span className={styles.errorText}>{phoneError}</span>}
                    {isValidPhone && <span className={styles.successText}>✓ Valid phone number</span>}
                    <div className={styles.helperText}>
                      Use international format starting with + (e.g., +1234567890)
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Access Expires</label>
                    <select
                      value={newCollaboratorData.expiryOption}
                      onChange={(e) => setNewCollaboratorData(prev => ({ 
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
                    value={newCollaboratorData.message}
                    onChange={(e) => setNewCollaboratorData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Add a personal message to the invitation..."
                    rows={3}
                  />
                </div>

                <div className={styles.permissionPreview}>
                  <h4>Access Level: Editor</h4>
                  <div className={styles.permissionDetails}>
                    Can view and edit content, view analytics
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button type="button" onClick={() => setShowAddForm(false)} className={styles.cancelButton}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.shareButton}
                    disabled={!isValidPhone || !newCollaboratorData.phone.trim()}
                  >
                    Share Editor Access
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sharing Info */}
          <div className={styles.section}>
            <div className={styles.infoBox}>
              <h4>How Editor Sharing Works</h4>
              <ul>
                <li><strong>Editor Access:</strong> Can view, edit content, and view analytics</li>
                <li>Users will be notified when they log in if they don't have an account</li>
                <li>You can set expiration times or give permanent access</li>
                <li>You can remove access at any time</li>
                <li>Only share with trusted collaborators</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentSharingManager; 