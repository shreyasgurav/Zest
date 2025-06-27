"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { DashboardSecurity, DashboardPermissions } from '@/utils/dashboardSecurity';
import { 
  Calendar,
  Users,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Download,
  QrCode,
  UserPlus,
  Settings,
  RefreshCw,
  BarChart3,
  Ticket,
  Eye,
  X,
  Edit,
  Trash2,
  ExternalLink,
  Filter,
  Timer,
} from "lucide-react"
import styles from "./EventDashboard.module.css"

// Updated interfaces for new architecture
interface NewEventSession {
  sessionId: string;
  title: string;
  start_time: string;  // ISO string
  end_time: string;    // ISO string
  tickets: Array<{
    name: string;
    capacity: number;
    price: number;
    available_capacity: number;
  }>;
}

interface EventData {
  id: string;
  title: string;
  about_event: string;
  event_type: string;
  event_venue: string;
  event_image?: string;
  event_categories: string[];
  event_languages: string;
  event_guides: Record<string, string>;
  sessions: NewEventSession[];
  creator: {
    type: string;
    pageId: string;
    name: string;
    username: string;
    userId: string;
  };
  organizationId: string;
  hosting_club: string;
  organization_username: string;
  status: string;
  createdAt: any;
  updatedAt: any;
  image_upload_status: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  sessionId: string;
  checkedIn: boolean;
  checkInTime?: string;
  createdAt: string;
  status?: string;
  paymentStatus?: string;
  individualAmount?: number;
  userId?: string;
  eventId?: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  userName: string;
  userEmail: string;
  ticketType?: string;
  eventId?: string;
  userId: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  createdAt: string;
  usedAt?: string;
  amount: number;
}

interface EventDashboardProps {
  className?: string
}

export default function EventDashboard({ className }: EventDashboardProps) {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const auth = getAuth();
  const eventId = params?.id;
  
  // State
  const [activeTab, setActiveTab] = useState<"overview" | "attendees" | "checkin" | "sessions" | "settings">("overview")
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "checked-in" | "pending">("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Firebase data
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [allAttendees, setAllAttendees] = useState<Attendee[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<DashboardPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canManageAttendees: false,
    canViewFinancials: false,
    canSendCommunications: false,
    role: 'unauthorized'
      });
  
  // Refs for cleanup
  const unsubscribeAttendees = useRef<(() => void) | null>(null);
  const unsubscribeTickets = useRef<(() => void) | null>(null);

  // Get selected session
  const selectedSession = selectedSessionId ? eventData?.sessions.find((s) => s.sessionId === selectedSessionId) : null

  // Filter attendees based on selected session
  const attendees = useMemo(() => {
    if (!selectedSessionId) return allAttendees
    return allAttendees.filter((a) => a.sessionId === selectedSessionId)
  }, [allAttendees, selectedSessionId])

  // Further filter attendees based on search and status
  const filteredAttendees = useMemo(() => {
    let filtered = attendees

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((a) => (filterStatus === "checked-in" ? a.checkedIn : !a.checkedIn))
    }

    return filtered
  }, [attendees, searchTerm, filterStatus])

  // Calculate stats based on selected session or all sessions
  const stats = useMemo(() => {
    const relevantAttendees = attendees
    const relevantTickets = selectedSession ? selectedSession.tickets : eventData?.sessions.flatMap((s) => s.tickets) || []

    const totalRevenue = relevantAttendees.reduce((sum, attendee) => {
      return sum + (attendee.individualAmount || 0)
    }, 0)

    const checkedInCount = relevantAttendees.filter((a) => a.checkedIn).length
    const totalCapacity = relevantTickets.reduce((sum, t) => sum + t.capacity, 0)
    const soldTickets = relevantTickets.reduce((sum, t) => sum + (t.capacity - t.available_capacity), 0)
    
    return {
      totalRevenue,
      totalAttendees: relevantAttendees.length,
      checkedInCount,
      pendingCount: relevantAttendees.length - checkedInCount,
      totalCapacity,
      soldTickets,
      availableTickets: totalCapacity - soldTickets,
      attendanceRate: relevantAttendees.length > 0 ? (checkedInCount / relevantAttendees.length) * 100 : 0,
      salesRate: totalCapacity > 0 ? (soldTickets / totalCapacity) * 100 : 0,
    }
  }, [attendees, selectedSession, eventData?.sessions])

  // Authorization check
  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }

  const checkAuthorization = async () => {
      if (!auth.currentUser) {
      setPermissions({
        canView: false,
        canEdit: false,
        canDelete: false,
        canManageAttendees: false,
        canViewFinancials: false,
        canSendCommunications: false,
        role: 'unauthorized'
      });
      setError('Please sign in to access this dashboard');
        setLoading(false);
      return;
    }

    try {
      const dashboardPermissions = await DashboardSecurity.verifyDashboardAccess(eventId, auth.currentUser.uid);
      setPermissions(dashboardPermissions);
      
      if (!dashboardPermissions.canView) {
        setError('You do not have permission to view this event dashboard');
          setLoading(false);
          return;
        }

        // Fetch event data
        await fetchEventData();
        
        // Set up real-time listeners
        setupRealTimeAttendees();
        setupRealTimeTickets();
        
    } catch (err) {
      console.error("Error checking authorization:", err);
      setError('Failed to verify permissions');
        setLoading(false);
      }
    };

    checkAuthorization();

    // Cleanup on unmount
    return () => {
      if (unsubscribeAttendees.current) {
        unsubscribeAttendees.current();
      }
      if (unsubscribeTickets.current) {
        unsubscribeTickets.current();
      }
    };
  }, [eventId, auth.currentUser]);

  const fetchEventData = async () => {
    if (!eventId) return;
    
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        
        setEventData({
          id: eventDoc.id,
          title: data.title || data.eventTitle,
          about_event: data.about_event || '',
          event_type: data.event_type || 'event',
          event_venue: data.event_venue || '',
          event_image: data.event_image,
          event_categories: data.event_categories || [],
          event_languages: data.event_languages || '',
          event_guides: data.event_guides || {},
          sessions: data.sessions || [],
          creator: data.creator || {
            type: 'organisation',
            pageId: data.organizationId,
            name: data.hosting_club || '',
            username: data.organization_username || '',
            userId: data.organizationId
          },
          organizationId: data.organizationId,
          hosting_club: data.hosting_club,
          organization_username: data.organization_username,
          status: data.status || 'active',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          image_upload_status: data.image_upload_status || 'none'
        });
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching event data:", err);
      setError("Failed to load event data");
      setLoading(false);
    }
  };

  const setupRealTimeAttendees = useCallback(() => {
    if (!eventId || !permissions.canView) return;

    const attendeesRef = collection(db, 'eventAttendees');
    const attendeesQuery = query(
      attendeesRef,
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      attendeesQuery,
      (snapshot) => {
        const attendeesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Attendee[];
        
        setAllAttendees(attendeesList);
      },
      (error) => {
        console.error("Error in real-time attendees listener:", error);
      }
    );

    unsubscribeAttendees.current = unsubscribe;
  }, [eventId, permissions.canView]);

  const setupRealTimeTickets = useCallback(() => {
    if (!eventId || !permissions.canView) return;

    const ticketsRef = collection(db, 'tickets');
    const eventTicketsQuery = query(
      ticketsRef,
      where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(
      eventTicketsQuery,
      (snapshot) => {
        const ticketsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ticket[];
        
        setTickets(ticketsList);
      },
      (error) => {
        console.error("Error in tickets listener:", error);
      }
    );

    unsubscribeTickets.current = unsubscribe;
  }, [eventId, permissions.canView]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetchEventData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const handleSessionSelect = useCallback((sessionId: string | null) => {
    setSelectedSessionId(sessionId)
  }, [])

  // Get session display info
  const getSessionDisplayInfo = () => {
    if (!selectedSessionId || !eventData) {
      return {
        title: "All Sessions",
        subtitle: `${eventData?.sessions.length || 0} sessions total`,
        time: eventData?.sessions.map((s) => {
          const start = new Date(s.start_time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          const end = new Date(s.end_time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          return `${start}-${end}`;
        }).join(", ") || "",
        color: "default",
      }
    }

    const session = selectedSession!
    const start = new Date(session.start_time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const end = new Date(session.end_time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return {
      title: session.title,
      subtitle: `Session Details`,
      time: `${start} - ${end}`,
      color: "blue",
    }
  }

  const sessionInfo = getSessionDisplayInfo()

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.container}>
          <div className={styles.card}>
            <p>Loading dashboard...</p>
              </div>
              </div>
            </div>
    )
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.container}>
          <div className={styles.card}>
            <p>Error: {error}</p>
              </div>
              </div>
            </div>
    )
  }

  if (!eventData) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.container}>
          <div className={styles.card}>
            <p>Event not found</p>
              </div>
                </div>
            </div>
    )
  }

    return (
    <div className={`${styles.dashboard} ${className || ""}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContainer}>
        <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <div className={styles.eventImage}>
              <img 
                  src={eventData.event_image || "/placeholder.svg"}
                alt={eventData.title}
                  className={styles.eventImageImg}
              />
              </div>
              <div>
                <h1 className={styles.eventTitle}>{eventData.title}</h1>
            <div className={styles.eventMeta}>
                  <div className={styles.eventMetaItem}>
                    <Calendar className={styles.icon} />
                    <span>{eventData.sessions.length > 0 ? new Date(eventData.sessions[0].start_time).toLocaleDateString() : "No sessions"}</span>
              </div>
                  <div className={styles.eventMetaItem}>
                    <MapPin className={styles.icon} />
                    <span>{eventData.event_venue}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button 
            onClick={handleRefresh} 
                disabled={isRefreshing}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                <RefreshCw className={`${styles.icon} ${isRefreshing ? styles.spinning : ""}`} />
                Refresh
              </button>

              <button className={`${styles.button} ${styles.buttonPrimary}`}>
                <Settings className={styles.icon} />
                Settings
          </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.container}>
        {/* Session Selector */}
        <div className={styles.sessionSelector}>
          <div className={`${styles.sessionHeader} ${styles[`sessionHeader${sessionInfo.color}`]}`}>
            <div className={styles.sessionHeaderContent}>
              <div>
                <h2 className={styles.sessionTitle}>{sessionInfo.title}</h2>
                <p className={styles.sessionSubtitle}>{sessionInfo.subtitle}</p>
                <div className={styles.sessionMeta}>
                <div className={styles.sessionMetaItem}>
                    <Clock className={styles.icon} />
                    <span>{sessionInfo.time}</span>
                </div>
                <div className={styles.sessionMetaItem}>
                    <Users className={styles.icon} />
                    <span>{stats.totalAttendees} attendees</span>
                </div>
                </div>
              </div>
              {selectedSessionId && (
                <button onClick={() => handleSessionSelect(null)} className={styles.clearSessionButton}>
                  <X className={styles.icon} />
                View All Sessions
              </button>
            )}
          </div>
          
            {/* Session Selection Buttons */}
            <div className={styles.sessionGrid}>
              {eventData.sessions.map((session) => {
                const sessionAttendees = allAttendees.filter((a) => a.sessionId === session.sessionId)
                const sessionCapacity = session.tickets.reduce((sum, t) => sum + t.capacity, 0)
                const sessionSold = session.tickets.reduce((sum, t) => sum + (t.capacity - t.available_capacity), 0)
                const isSelected = selectedSessionId === session.sessionId
                const startTime = new Date(session.start_time).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                const endTime = new Date(session.end_time).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
              
              return (
                <button
                    key={session.sessionId}
                    onClick={() => handleSessionSelect(isSelected ? null : session.sessionId)}
                    className={`${styles.sessionCard} ${isSelected ? styles.sessionCardSelected : ""}`}
                >
                  <div className={styles.sessionCardHeader}>
                      <h3 className={styles.sessionCardTitle}>{session.title}</h3>
                      {isSelected && <CheckCircle className={styles.icon} />}
                  </div>
                    <div className={styles.sessionCardMeta}>
                      <div className={styles.sessionCardMetaItem}>
                        <Timer className={styles.icon} />
                        <span>{startTime} - {endTime}</span>
                    </div>
                      <div className={styles.sessionCardMetaItem}>
                        <Users className={styles.icon} />
                        <span>{sessionSold}/{sessionCapacity} sold</span>
                    </div>
                      <div className={styles.sessionCardMetaItem}>
                        <CheckCircle className={styles.icon} />
                        <span>{sessionAttendees.filter((a) => a.checkedIn).length} checked in</span>
                    </div>
                  </div>
                </button>
                )
            })}
          </div>
            </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statCardContent}>
              <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                <TrendingUp className={styles.icon} />
      </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Revenue</p>
                <p className={styles.statValue}>₹{stats.totalRevenue.toLocaleString()}</p>
                <p className={styles.statSubtext}>
                  {selectedSessionId ? `${selectedSession?.title} only` : "All sessions"}
                  </p>
                </div>
                          </div>
                        </div>
                        
          <div className={styles.statCard}>
            <div className={styles.statCardContent}>
              <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                <Ticket className={styles.icon} />
                          </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Tickets Sold</p>
                <p className={styles.statValue}>{stats.soldTickets}</p>
                <div className={styles.progressContainer}>
                            <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${Math.min(stats.salesRate, 100)}%` }}></div>
                            </div>
                  <span className={styles.progressText}>{Math.round(stats.salesRate)}% sold</span>
                          </div>
                            </div>
                          </div>
                        </div>

          <div className={styles.statCard}>
            <div className={styles.statCardContent}>
              <div className={`${styles.statIcon} ${styles.statIconEmerald}`}>
                <CheckCircle className={styles.icon} />
                                  </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Checked In</p>
                <p className={styles.statValue}>{stats.checkedInCount}</p>
                <p className={styles.statSubtext}>{stats.pendingCount} pending</p>
                                </div>
                          </div>
                        </div>

          <div className={styles.statCard}>
            <div className={styles.statCardContent}>
              <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
                <BarChart3 className={styles.icon} />
                            </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Attendance Rate</p>
                <p className={styles.statValue}>{Math.round(stats.attendanceRate)}%</p>
                <p className={styles.statSubtext}>of registered attendees</p>
                            </div>
                          </div>
                            </div>
                          </div>

        {/* Navigation Tabs */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            <nav className={styles.tabsNav}>
              {[
                { id: "overview", label: "Overview", icon: Eye },
                { id: "attendees", label: "Attendees", icon: Users, count: stats.totalAttendees },
                { id: "checkin", label: "Check-in", icon: QrCode, count: stats.pendingCount },
                { id: "sessions", label: "All Sessions", icon: Calendar, count: eventData.sessions.length },
                { id: "settings", label: "Settings", icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                  
                  return (
              <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                  >
                    <Icon className={styles.tabIcon} />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`${styles.tabBadge} ${isActive ? styles.tabBadgeActive : ""}`}>{tab.count}</span>
                    )}
              </button>
                )
              })}
            </nav>
            </div>
              </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {activeTab === "overview" && (
            <div className={styles.overviewContent}>
              {/* Quick Actions */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Quick Actions</h3>
                <div className={styles.quickActionsGrid}>
                  <button className={styles.quickActionButton}>
                    <QrCode className={styles.icon} />
                    Scan QR Code
                  </button>
                  <button className={styles.quickActionButton}>
                    <UserPlus className={styles.icon} />
                    Add Attendee
                  </button>
                  <button className={styles.quickActionButton}>
                    <Download className={styles.icon} />
                    Export Data
                  </button>
                  <button 
                    onClick={() => router.push(`/event-profile/${eventId}`)}
                    className={styles.quickActionButton}
                  >
                    <ExternalLink className={styles.icon} />
                    Event Page
                  </button>
                </div>
              </div>
              
              {/* Session Performance Comparison */}
              {!selectedSessionId && (
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Session Performance</h3>
                  <div className={styles.sessionPerformanceGrid}>
                    {eventData.sessions.map((session) => {
                      const sessionAttendees = allAttendees.filter((a) => a.sessionId === session.sessionId)
                      const sessionCapacity = session.tickets.reduce((sum, t) => sum + t.capacity, 0)
                      const sessionSold = session.tickets.reduce(
                        (sum, t) => sum + (t.capacity - t.available_capacity),
                        0,
                      )
                      const sessionRevenue = sessionAttendees.reduce((sum, attendee) => {
                        return sum + (attendee.individualAmount || 0)
                      }, 0)
                      const checkedInCount = sessionAttendees.filter((a) => a.checkedIn).length
                      const startTime = new Date(session.start_time).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      const endTime = new Date(session.end_time).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });

                      return (
                        <div key={session.sessionId} className={styles.sessionPerformanceCard}>
                          <div className={styles.sessionPerformanceHeader}>
                            <h4 className={styles.sessionPerformanceTitle}>{session.title}</h4>
                            <span className={styles.sessionPerformanceTime}>
                              {startTime} - {endTime}
                            </span>
                </div>

                          <div className={styles.sessionPerformanceStats}>
                            <div className={styles.sessionPerformanceStat}>
                              <p className={styles.sessionPerformanceStatValue}>{sessionSold}</p>
                              <p className={styles.sessionPerformanceStatLabel}>Tickets Sold</p>
                </div>
                            <div className={styles.sessionPerformanceStat}>
                              <p className={styles.sessionPerformanceStatValue}>{checkedInCount}</p>
                              <p className={styles.sessionPerformanceStatLabel}>Checked In</p>
              </div>
            </div>

                          <div className={styles.sessionPerformanceProgress}>
                            <div className={styles.sessionPerformanceProgressHeader}>
                              <span className={styles.sessionPerformanceProgressLabel}>Sales Progress</span>
                              <span className={styles.sessionPerformanceProgressValue}>
                                {Math.round((sessionSold / sessionCapacity) * 100)}%
                        </span>
                    </div>
                            <div className={styles.progressBar}>
                              <div
                                className={styles.progressFill}
                                style={{ width: `${Math.min((sessionSold / sessionCapacity) * 100, 100)}%` }}
                              ></div>
                    </div>
                  </div>

                          <div className={styles.sessionPerformanceFooter}>
                            <span className={styles.sessionPerformanceRevenue}>Revenue: ₹{sessionRevenue}</span>
                  <button 
                              onClick={() => handleSessionSelect(session.sessionId)}
                              className={styles.sessionPerformanceButton}
                  >
                              View Details →
                  </button>
                </div>
                  </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>
                  Recent Check-ins {selectedSessionId && `- ${selectedSession?.title}`}
                </h3>
                <div className={styles.recentActivity}>
                  {attendees
                    .filter((a) => a.checkedIn)
                    .slice(0, 5)
                    .map((attendee) => {
                      const session = eventData.sessions.find((s) => s.sessionId === attendee.sessionId)
                      return (
                        <div key={attendee.id} className={styles.activityItem}>
                          <div className={styles.activityIcon}>
                            <CheckCircle className={styles.icon} />
                  </div>
                          <div className={styles.activityInfo}>
                            <p className={styles.activityName}>{attendee.name}</p>
                            <p className={styles.activityEmail}>{attendee.email}</p>
                            {!selectedSessionId && <p className={styles.activitySession}>{session?.title}</p>}
                    </div>
                          <div className={styles.activityTime}>
                            {attendee.checkInTime && new Date(attendee.checkInTime).toLocaleTimeString()}
                  </div>
                </div>
                      )
                    })}
                  {attendees.filter((a) => a.checkedIn).length === 0 && (
                    <p className={styles.emptyState}>No check-ins yet for this session</p>
                  )}
              </div>
            </div>
          </div>
        )}

          {activeTab === "attendees" && (
            <div className={styles.attendeesContent}>
              {/* Search and Filters */}
              <div className={styles.card}>
                <div className={styles.attendeesFilters}>
                  <div className={styles.searchContainer}>
                    <div className={styles.searchInput}>
                      <Search className={styles.searchIcon} />
                  <input
                    type="text"
                        placeholder="Search attendees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.input}
                      />
                    </div>
                </div>
                
                  <div className={styles.filtersRight}>
                  <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className={styles.select}
                    >
                      <option value="all">All Status</option>
                      <option value="checked-in">Checked In</option>
                      <option value="pending">Pending</option>
                  </select>
                  
                    <button className={`${styles.button} ${styles.buttonPrimary}`}>
                      <UserPlus className={styles.icon} />
                      Add Attendee
                    </button>
                </div>
              </div>
              
                {selectedSessionId && (
                  <div className={styles.filterAlert}>
                    <p className={styles.filterAlertText}>
                      <Filter className={styles.icon} />
                      Showing attendees for <strong>{selectedSession?.title}</strong> only
                  </p>
                </div>
                )}
                      </div>
                      
              {/* Attendees Table */}
              <div className={styles.card}>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead className={styles.tableHead}>
                      <tr>
                        <th className={styles.tableHeader}>Attendee</th>
                        <th className={styles.tableHeader}>Ticket Type</th>
                        <th className={styles.tableHeader}>Session</th>
                        <th className={styles.tableHeader}>Status</th>
                        <th className={styles.tableHeader}>Check-in Time</th>
                        <th className={styles.tableHeader}>
                          <span className={styles.srOnly}>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={styles.tableBody}>
                      {filteredAttendees.map((attendee) => {
                        const session = eventData.sessions.find((s) => s.sessionId === attendee.sessionId)
                        const startTime = session ? new Date(session.start_time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : '';
                        const endTime = session ? new Date(session.end_time).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : '';
                            
                            return (
                          <tr key={attendee.id} className={styles.tableRow}>
                            <td className={styles.tableCell}>
                              <div>
                                <div className={styles.attendeeName}>{attendee.name}</div>
                                <div className={styles.attendeeEmail}>{attendee.email}</div>
                                </div>
                            </td>
                            <td className={styles.tableCell}>
                              <span className={`${styles.badge} ${styles.badgeBlue}`}>{attendee.ticketType}</span>
                            </td>
                            <td className={styles.tableCell}>
                        <div>
                                <div className={styles.sessionName}>{session?.title || "N/A"}</div>
                                <div className={styles.sessionTime}>
                                  {startTime} - {endTime}
                        </div>
                  </div>
                            </td>
                            <td className={styles.tableCell}>
                              {attendee.checkedIn ? (
                                <span className={`${styles.badge} ${styles.badgeGreen}`}>
                                  <CheckCircle className={styles.badgeIcon} />
                                  Checked In
                                </span>
                              ) : (
                                <span className={`${styles.badge} ${styles.badgeYellow}`}>
                                  <AlertCircle className={styles.badgeIcon} />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className={styles.tableCell}>
                              {attendee.checkInTime ? new Date(attendee.checkInTime).toLocaleString() : "-"}
                            </td>
                            <td className={styles.tableCell}>
                              <button className={styles.editButton}>Edit</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
              </div>
              
                {filteredAttendees.length === 0 && (
                  <div className={styles.emptyStateContainer}>
                    <Users className={styles.emptyStateIcon} />
                    <h3 className={styles.emptyStateTitle}>No attendees found</h3>
                    <p className={styles.emptyStateText}>
                      {selectedSessionId
                        ? `No attendees registered for ${selectedSession?.title}`
                        : "No attendees match your search criteria"}
                      </p>
                    </div>
                              )}
                            </div>
                          </div>
          )}

          {activeTab === "checkin" && (
            <div className={styles.checkinContent}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>
                  Check-in Methods {selectedSessionId && `- ${selectedSession?.title}`}
                </h3>
                <div className={styles.checkinMethodsGrid}>
                  <div className={styles.checkinMethod}>
                    <QrCode className={styles.checkinMethodIcon} />
                    <h4 className={styles.checkinMethodTitle}>QR Code Scanner</h4>
                    <p className={styles.checkinMethodDescription}>Scan attendee tickets for quick check-in</p>
                    <button className={`${styles.button} ${styles.buttonPrimary}`}>Open Scanner</button>
                        </div>

                  <div className={styles.checkinMethod}>
                    <Search className={styles.checkinMethodIcon} />
                    <h4 className={styles.checkinMethodTitle}>Manual Check-in</h4>
                    <p className={styles.checkinMethodDescription}>Search and check in attendees manually</p>
                    <button className={`${styles.button} ${styles.buttonSuccess}`}>Manual Check-in</button>
                          </div>
                </div>
              </div>

              {/* Pending Check-ins */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>
                  Pending Check-ins ({stats.pendingCount}) {selectedSessionId && `- ${selectedSession?.title}`}
                </h3>
                <div className={styles.checkinList}>
                  {attendees
                    .filter((a) => !a.checkedIn)
                    .slice(0, 10)
                    .map((attendee) => {
                      const session = eventData.sessions.find((s) => s.sessionId === attendee.sessionId)
                      
                      return (
                        <div key={attendee.id} className={styles.checkinItem}>
                          <div className={styles.checkinItemInfo}>
                            <p className={styles.checkinItemName}>{attendee.name}</p>
                            <p className={styles.checkinItemEmail}>{attendee.email}</p>
                            <p className={styles.checkinItemMeta}>
                              {attendee.ticketType} • {session?.title}
                            </p>
                      </div>
                          <button className={`${styles.button} ${styles.buttonSuccess}`}>
                            <CheckCircle className={styles.icon} />
                            Check In
                      </button>
                    </div>
                      )
                    })}

                  {attendees.filter((a) => !a.checkedIn).length === 0 && (
                    <div className={styles.checkinEmptyLarge}>
                      <CheckCircle className={styles.checkinEmptyLargeIcon} />
                      <h3 className={styles.checkinEmptyLargeTitle}>All caught up!</h3>
                      <p className={styles.checkinEmptyLargeText}>
                        All attendees {selectedSessionId ? `for ${selectedSession?.title}` : ''} have been checked in
                      </p>
          </div>
        )}
      </div>
            </div>
                </div>
              )}

          {activeTab === "sessions" && (
            <div className={styles.sessionsContent}>
              <div className={styles.sessionsGrid}>
                {eventData.sessions.map((session) => {
                  const sessionAttendees = allAttendees.filter((a) => a.sessionId === session.sessionId)
                  const sessionCapacity = session.tickets.reduce((sum, t) => sum + t.capacity, 0)
                  const sessionSold = session.tickets.reduce((sum, t) => sum + (t.capacity - t.available_capacity), 0)
                  const checkedInCount = sessionAttendees.filter((a) => a.checkedIn).length
                  const sessionRevenue = sessionAttendees.reduce((sum, attendee) => {
                    return sum + (attendee.individualAmount || 0)
                  }, 0)
                  const startTime = new Date(session.start_time).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  const endTime = new Date(session.end_time).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                        return (
                    <div key={session.sessionId} className={styles.sessionCard}>
                      <div className={styles.sessionCardHeader}>
                        <h3 className={styles.sessionCardTitle}>{session.title}</h3>
                        <span className={`${styles.badge} ${styles.badgeBlue}`}>
                          {sessionSold}/{sessionCapacity} sold
                    </span>
                </div>

                      <div className={styles.sessionCardMeta}>
                        <div className={styles.sessionCardMetaItem}>
                          <Clock className={styles.icon} />
                          {startTime} - {endTime}
                  </div>
                        <div className={styles.sessionCardMetaItem}>
                          <MapPin className={styles.icon} />
                          {eventData.event_venue}
                  </div>
                </div>

                      <div className={styles.sessionCardStats}>
                        <div className={styles.sessionCardStat}>
                          <p className={styles.sessionCardStatValue}>{sessionSold}</p>
                          <p className={styles.sessionCardStatLabel}>Sold</p>
                    </div>
                        <div className={styles.sessionCardStat}>
                          <p className={styles.sessionCardStatValue}>{checkedInCount}</p>
                          <p className={styles.sessionCardStatLabel}>Checked In</p>
                  </div>
                        <div className={styles.sessionCardStat}>
                          <p className={styles.sessionCardStatValue}>₹{sessionRevenue}</p>
                          <p className={styles.sessionCardStatLabel}>Revenue</p>
                </div>
            </div>
            
                      <div className={styles.sessionCardProgress}>
                        <div className={styles.sessionCardProgressHeader}>
                          <span className={styles.sessionCardProgressLabel}>Sales Progress</span>
                          <span className={styles.sessionCardProgressValue}>
                            {Math.round((sessionSold / sessionCapacity) * 100)}%
                          </span>
            </div>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${Math.min((sessionSold / sessionCapacity) * 100, 100)}%` }}
                          ></div>
          </div>
        </div>

                      <div className={styles.sessionCardActions}>
              <button 
                onClick={() => {
                            handleSessionSelect(session.sessionId)
                            setActiveTab("attendees")
                }}
                          className={`${styles.button} ${styles.buttonSecondary}`}
              >
                          <Users className={styles.icon} />
                          View Attendees
              </button>
                  <button 
                          onClick={() => {
                            handleSessionSelect(session.sessionId)
                            setActiveTab("checkin")
                          }}
                          className={`${styles.button} ${styles.buttonPrimary}`}
                        >
                          <QrCode className={styles.icon} />
                          Check-in
                  </button>
                </div>
                </div>
                  )
                })}
          </div>
        </div>
      )}

          {activeTab === "settings" && (
            <div className={styles.settingsContent}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Event Management</h3>
                <div className={styles.settingsGrid}>
              <button 
                    onClick={() => router.push(`/edit-event/${eventId}`)}
                    className={styles.settingsButton}
              >
                    <Edit className={styles.icon} />
                    Edit Event Details
              </button>
                  <button className={styles.settingsButton}>
                    <Ticket className={styles.icon} />
                    Manage Tickets
              </button>
                  <button className={styles.settingsButton}>
                    <Download className={styles.icon} />
                    Export Data
                  </button>
                  <button className={`${styles.settingsButton} ${styles.settingsButtonDanger}`}>
                    <Trash2 className={styles.icon} />
                    Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      </div>
    </div>
  )
} 