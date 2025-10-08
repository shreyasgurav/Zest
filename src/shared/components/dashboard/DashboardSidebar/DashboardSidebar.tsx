'use client';

import React, { useEffect, useState } from 'react';
import { 
  FaChartBar, 
  FaUsers, 
  FaUserCheck, 
  FaCog, 
  FaHandshake, 
  FaTicketAlt,
  FaArrowLeft,
  FaCircle,
  FaLayerGroup,
  FaTimes
} from 'react-icons/fa';
import styles from './DashboardSidebar.module.css';

interface DashboardSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  attendeesCount: number;
  selectedSession?: {
    id: string;
    name: string;
    date?: string;
    start_time?: string;
    end_time?: string;
  };
  onBack: () => void;
  eventTitle: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  setActiveTab,
  attendeesCount,
  selectedSession,
  onBack,
  eventTitle,
  isOpen = false,
  onClose
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile && onClose) {
      setTimeout(onClose, 150);
    }
  };

  const handleBackClick = () => {
    onBack();
    if (isMobile && onClose) {
      setTimeout(onClose, 150);
    }
  };

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: FaChartBar,
      hasNotification: false
    },
    {
      id: 'attendees',
      label: 'Attendees',
      icon: FaUsers,
      count: attendeesCount,
      hasNotification: false
    },
    {
      id: 'checkin',
      label: 'Check-in',
      icon: FaUserCheck,
      hasNotification: false
    },
    {
      id: 'manage-tickets',
      label: 'Tickets',
      icon: FaTicketAlt,
      hasNotification: false
    },
    {
      id: 'collaborations',
      label: 'Collaborations',
      icon: FaHandshake,
      hasNotification: false
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: FaCog,
      hasNotification: false
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div 
          className={styles.overlay}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        {/* Mobile Close Button */}
        {isMobile && (
          <div className={styles.mobileHeader}>
            <button 
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* Event Info Section */}
        <div className={styles.eventSection}>
          <div className={styles.eventTitle}>
            {eventTitle}
          </div>
          {selectedSession && (
            <div className={styles.sessionInfo}>
              <FaCircle className={styles.liveDot} />
              <div className={styles.sessionDetails}>
                <span className={styles.sessionName}>{selectedSession.name}</span>
                {selectedSession.date && selectedSession.start_time && (
                  <span className={styles.sessionDateTime}>
                    {new Date(selectedSession.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })} • {selectedSession.start_time}
                    {selectedSession.end_time && ` - ${selectedSession.end_time}`}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={styles.navigation}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={styles.navIcon}>
                  <Icon />
                </div>
                <span className={styles.navLabel}>{item.label}</span>
                
                {item.count !== undefined && item.count > 0 && (
                  <span className={styles.countBadge}>
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
                
                {item.hasNotification && (
                  <div className={styles.notificationDot}></div>
                )}

                {isActive && <div className={styles.activeIndicator}></div>}
              </button>
            );
          })}
        </nav>

        {/* Session Info Footer */}
        {selectedSession && (
          <div className={styles.sessionFooter}>
            <div className={styles.sessionBadge}>
              <FaLayerGroup />
              <div>
                <div className={styles.sessionName}>{selectedSession.name}</div>
                <div className={styles.sessionStatus}>Session Active</div>
              </div>
            </div>
            <button 
              className={styles.backToSessions} 
              onClick={handleBackClick}
            >
              <FaArrowLeft />
              <span>All Sessions</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default DashboardSidebar; 