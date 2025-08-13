import React, { useState, useEffect } from 'react';
import { SessionSecurity, SessionManagerAssignment, SessionPermissions } from '@/domains/authentication/services/session.service';
import { getAuth } from 'firebase/auth';
import { FaUserPlus, FaTrash, FaEdit, FaClock, FaEye, FaUserCheck, FaExclamationTriangle } from 'react-icons/fa';
import styles from './SessionManager.module.css';

interface SessionManagerProps {
  eventId: string;
  sessionId: string;
  sessionName: string;
  onClose: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ 
  eventId, 
  sessionId, 
  sessionName,
  onClose 
}) => {
  const [managers, setManagers] = useState<SessionManagerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddManager, setShowAddManager] = useState(false);
  const [newManagerData, setNewManagerData] = useState({
    email: '',
    name: '',
    role: 'checkInStaff' as keyof ReturnType<typeof SessionSecurity.getPermissionTemplates>,
    expiresIn: '',
    notes: ''
  });
  const [addingManager, setAddingManager] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const auth = getAuth();

  const permissionTemplates = SessionSecurity.getPermissionTemplates();

  useEffect(() => {
    loadSessionManagers();
  }, [eventId, sessionId]);

  const loadSessionManagers = async () => {
    setLoading(true);
    try {
      const allManagers = await SessionSecurity.getEventSessionManagers(eventId);
      const sessionManagers = allManagers.filter(manager => manager.sessionId === sessionId);
      setManagers(sessionManagers);
    } catch (error) {
      console.error('Error loading session managers:', error);
      setMessage({ type: 'error', text: 'Failed to load session managers' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManager = async () => {
    if (!auth.currentUser || !newManagerData.email.trim() || !newManagerData.name.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setAddingManager(true);
    try {
      // For demo purposes, we'll use a mock user ID based on email
      // In production, you'd want to look up the actual user ID from the email
      const mockUserId = `user_${newManagerData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const permissions = permissionTemplates[newManagerData.role];
      const expiresIn = newManagerData.expiresIn ? parseInt(newManagerData.expiresIn) : undefined;

      const result = await SessionSecurity.assignSessionManager(
        eventId,
        sessionId,
        mockUserId,
        newManagerData.email,
        newManagerData.name,
        permissions,
        auth.currentUser.uid,
        expiresIn,
        newManagerData.notes
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Session manager assigned successfully!' });
        setNewManagerData({
          email: '',
          name: '',
          role: 'checkInStaff',
          expiresIn: '',
          notes: ''
        });
        setShowAddManager(false);
        await loadSessionManagers();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to assign session manager' });
      }
    } catch (error) {
      console.error('Error adding session manager:', error);
      setMessage({ type: 'error', text: 'Failed to assign session manager' });
    } finally {
      setAddingManager(false);
    }
  };

  const handleRemoveManager = async (assignment: SessionManagerAssignment) => {
    if (!auth.currentUser) return;

    if (!confirm(`Remove ${assignment.userName} as session manager?`)) return;

    try {
      const result = await SessionSecurity.removeSessionManager(
        eventId,
        sessionId,
        assignment.userId,
        auth.currentUser.uid
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Session manager removed successfully!' });
        await loadSessionManagers();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to remove session manager' });
      }
    } catch (error) {
      console.error('Error removing session manager:', error);
      setMessage({ type: 'error', text: 'Failed to remove session manager' });
    }
  };

  const getRoleDisplay = (permissions: SessionPermissions) => {
    const roleLabels = {
      session_owner: 'Session Owner',
      session_manager: 'Session Manager', 
      check_in_staff: 'Check-In Staff',
      viewer: 'Viewer',
      unauthorized: 'No Access'
    };

    return roleLabels[permissions.role] || permissions.role;
  };

  const getPermissionsDisplay = (permissions: SessionPermissions) => {
    const perms = [];
    if (permissions.canView) perms.push('View');
    if (permissions.canCheckIn) perms.push('Check-In');
    if (permissions.canManageAttendees) perms.push('Manage Attendees');
    if (permissions.canViewFinancials) perms.push('View Financials');
    if (permissions.canEditSession) perms.push('Edit Session');
    if (permissions.canViewReports) perms.push('View Reports');
    
    return perms.join(', ') || 'No permissions';
  };

  const isExpired = (assignment: SessionManagerAssignment) => {
    if (!assignment.expiresAt) return false;
    return new Date(assignment.expiresAt) < new Date();
  };

  const getExpiryDisplay = (assignment: SessionManagerAssignment) => {
    if (!assignment.expiresAt) return 'No expiry';
    
    const expiryDate = new Date(assignment.expiresAt);
    const now = new Date();
    
    if (expiryDate < now) {
      return 'Expired';
    }
    
    const hoursLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft < 24) {
      return `${hoursLeft}h left`;
    } else {
      const daysLeft = Math.ceil(hoursLeft / 24);
      return `${daysLeft}d left`;
    }
  };

  return (
    <div className={styles.sessionManagerOverlay}>
      <div className={styles.sessionManagerModal}>
        <div className={styles.modalHeader}>
          <h2>Session Managers - {sessionName}</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <div className={styles.modalContent}>
          {/* Add Manager Section */}
          <div className={styles.addManagerSection}>
            <button 
              onClick={() => setShowAddManager(!showAddManager)}
              className={styles.addManagerButton}
            >
              <FaUserPlus /> Add Session Manager
            </button>

            {showAddManager && (
              <div className={styles.addManagerForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Email Address *</label>
                    <input
                      type="email"
                      value={newManagerData.email}
                      onChange={(e) => setNewManagerData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="manager@example.com"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={newManagerData.name}
                      onChange={(e) => setNewManagerData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Manager Name"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Role & Permissions</label>
                    <select
                      value={newManagerData.role}
                      onChange={(e) => setNewManagerData(prev => ({ 
                        ...prev, 
                        role: e.target.value as keyof ReturnType<typeof SessionSecurity.getPermissionTemplates>
                      }))}
                    >
                      <option value="checkInStaff">Check-In Staff (Check-in only)</option>
                      <option value="sessionManager">Session Manager (Full management)</option>
                      <option value="fullSessionAccess">Full Access (Including edit)</option>
                      <option value="viewerOnly">Viewer Only (Read only)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Expires After (hours, optional)</label>
                    <input
                      type="number"
                      value={newManagerData.expiresIn}
                      onChange={(e) => setNewManagerData(prev => ({ ...prev, expiresIn: e.target.value }))}
                      placeholder="24"
                      min="1"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Notes (optional)</label>
                  <textarea
                    value={newManagerData.notes}
                    onChange={(e) => setNewManagerData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes about this assignment..."
                    rows={2}
                  />
                </div>

                <div className={styles.permissionPreview}>
                  <strong>Permissions Preview:</strong> {getPermissionsDisplay(permissionTemplates[newManagerData.role])}
                </div>

                <div className={styles.formActions}>
                  <button 
                    onClick={handleAddManager}
                    disabled={addingManager}
                    className={styles.confirmButton}
                  >
                    {addingManager ? 'Adding...' : 'Add Manager'}
                  </button>
                  <button 
                    onClick={() => setShowAddManager(false)}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Managers List */}
          <div className={styles.managersSection}>
            <h3>Current Session Managers</h3>
            
            {loading ? (
              <div className={styles.loading}>Loading managers...</div>
            ) : managers.length === 0 ? (
              <div className={styles.noManagers}>
                <FaEye />
                <p>No session managers assigned yet</p>
                <p>Add managers to delegate session management responsibilities</p>
              </div>
            ) : (
              <div className={styles.managersList}>
                {managers.map((assignment) => (
                  <div 
                    key={assignment.id} 
                    className={`${styles.managerCard} ${isExpired(assignment) ? styles.expired : ''}`}
                  >
                    <div className={styles.managerInfo}>
                      <div className={styles.managerDetails}>
                        <h4>{assignment.userName}</h4>
                        <p className={styles.managerEmail}>{assignment.userEmail}</p>
                        <div className={styles.managerRole}>
                          {getRoleDisplay(assignment.permissions)}
                        </div>
                      </div>
                      
                      <div className={styles.managerMeta}>
                        <div className={styles.assignmentInfo}>
                          <small>Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</small>
                          <div className={styles.expiryInfo}>
                            <FaClock /> {getExpiryDisplay(assignment)}
                          </div>
                        </div>
                        
                        {isExpired(assignment) && (
                          <div className={styles.expiredBadge}>
                            <FaExclamationTriangle /> Expired
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.permissions}>
                      <strong>Permissions:</strong>
                      <div className={styles.permissionsList}>
                        {getPermissionsDisplay(assignment.permissions)}
                      </div>
                    </div>

                    {assignment.notes && (
                      <div className={styles.notes}>
                        <strong>Notes:</strong> {assignment.notes}
                      </div>
                    )}

                    <div className={styles.managerActions}>
                      <button 
                        onClick={() => handleRemoveManager(assignment)}
                        className={styles.removeButton}
                        title="Remove manager"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeModalButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionManager; 