import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/infrastructure/firebase';
import { signOut, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { FaTicketAlt, FaUser, FaSignOutAlt, FaBuilding, FaMicrophone, FaMapMarkerAlt, FaPlus, FaShareAlt, FaQrcode, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { getUserOwnedPages, ArtistData, OrganizationData, VenueData, clearAllSessions } from '@/domains/authentication/services/auth.service';
import { ContentSharingSecurity } from '@/shared/utils/security/contentSharingSecurity';
import { EventCollaborationSecurity } from '@/domains/events/services/collaboration.service';
import styles from "./PersonLogo.module.css";

interface UserData {
  name?: string;
  username?: string;
  profilePicture?: string;
  photoURL?: string;
  photo?: string;
  profile_image?: string;
  phone?: string;
  email?: string;
}

function PersonLogo() {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showOwnedPages, setShowOwnedPages] = useState(false);
    const [showSharedPages, setShowSharedPages] = useState(false);
    const [showCheckinEvents, setShowCheckinEvents] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [ownedPages, setOwnedPages] = useState<{
        artists: ArtistData[];
        organizations: OrganizationData[];
        venues: VenueData[];
    }>({ artists: [], organizations: [], venues: [] });
    const [sharedPages, setSharedPages] = useState<{
        artists: Array<{ uid: string; name: string; role: string }>;
        organizations: Array<{ uid: string; name: string; role: string }>;
        venues: Array<{ uid: string; name: string; role: string }>;
        events: Array<{ uid: string; name: string; role: string }>;
        activities: Array<{ uid: string; name: string; role: string }>;
    }>({ artists: [], organizations: [], venues: [], events: [], activities: [] });
    const [checkinEvents, setCheckinEvents] = useState<Array<{ eventId: string; eventTitle: string; role: string; accessLevel: string }>>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth(), async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    // Load the user's personal profile data
                    const userDoc = await getDoc(doc(db(), "Users", currentUser.uid));
                    let personalData: UserData;
                    
                    if (userDoc.exists()) {
                        personalData = userDoc.data() as UserData;
                        console.log('👤 Loaded personal user data:', personalData);
                        setUserData(personalData);
                    } else {
                        // Fallback to Firebase Auth data for personal profile
                        personalData = {
                            name: currentUser.displayName || currentUser.phoneNumber || 'User',
                            username: currentUser.email?.split('@')[0] || currentUser.phoneNumber?.replace(/\D/g, '') || 'user',
                            photoURL: currentUser.photoURL || undefined,
                            photo: currentUser.photoURL || undefined,
                            phone: currentUser.phoneNumber || undefined,
                            email: currentUser.email || undefined
                        };
                        setUserData(personalData);
                    }
                    
                    // Auto-accept any pending invitations for this user's phone number
                    const userPhone = personalData.phone || currentUser.phoneNumber;
                    if (userPhone) {
                        console.log('👤 Checking for pending invitations for phone:', userPhone);
                        
                        try {
                            // Accept pending content invitations (page sharing)
                            const pendingInvitations = await ContentSharingSecurity.getUserPendingInvitations(userPhone);
                            console.log('👤 Found pending content invitations:', pendingInvitations);
                            
                            for (const invitation of pendingInvitations) {
                                if (invitation.id) {
                                    const result = await ContentSharingSecurity.acceptInvitation(
                                        invitation.id,
                                        currentUser.uid,
                                        personalData.name || currentUser.displayName || 'User'
                                    );
                                    if (result.success) {
                                        console.log('👤 Auto-accepted content invitation:', invitation.id);
                                    }
                                }
                            }
                            
                            // 🚨 FIX: Auto-accept event invitations for better UX (since check-in access is direct now)
                            const pendingEventInvitations = await EventCollaborationSecurity.getUserPendingInvitations(userPhone);
                            console.log('👤 Found pending event invitations:', pendingEventInvitations);
                            
                            // Auto-accept event invitations (they are only created for unregistered users)
                            for (const invitation of pendingEventInvitations) {
                                if (invitation.id) {
                                    const result = await EventCollaborationSecurity.acceptEventInvitation(
                                        invitation.id,
                                        currentUser.uid,
                                        personalData.name || currentUser.displayName || 'User'
                                    );
                                    if (result.success) {
                                        console.log('👤 Auto-accepted event invitation:', invitation.eventTitle);
                                    }
                                }
                            }
                            
                        } catch (error) {
                            console.error('Error processing pending invitations:', error);
                        }
                    }
                    
                    // Load all pages the user owns (for pages section)
                    const pages = await getUserOwnedPages(currentUser.uid);
                    setOwnedPages(pages);
                    console.log('👤 Loaded owned pages:', pages);
                    
                    // Load shared pages (pages where user has been given access)
                    const shared = await ContentSharingSecurity.getUserSharedContent(currentUser.uid);
                    setSharedPages(shared);
                    console.log('👤 Loaded shared pages:', shared);
                    
                    // Load check-in events (events where user has check-in access)
                    console.log('👤 Loading check-in events...');
                    const sharedEvents = await EventCollaborationSecurity.getUserSharedEvents(currentUser.uid);
                    setCheckinEvents(sharedEvents.checkinEvents);
                    console.log('👤 Loaded check-in events:', sharedEvents.checkinEvents);
                    
                    // 🚨 DEBUG: If no check-in events found, log user info for debugging
                    if (sharedEvents.checkinEvents.length === 0) {
                        console.log('👤 No check-in events found. Debug info:');
                        console.log('  - User ID:', currentUser.uid);
                        console.log('  - User phone from personalData:', personalData.phone);
                        console.log('  - User phone from auth:', currentUser.phoneNumber);
                        console.log('  - All user data:', personalData);
                        
                        // Try a small delay and retry once
                        setTimeout(async () => {
                            try {
                                console.log('👤 Retrying getUserSharedEvents...');
                                const retrySharedEvents = await EventCollaborationSecurity.getUserSharedEvents(currentUser.uid);
                                if (retrySharedEvents.checkinEvents.length > 0) {
                                    setCheckinEvents(retrySharedEvents.checkinEvents);
                                    console.log('👤 Retry found check-in events:', retrySharedEvents.checkinEvents);
                                } else {
                                    console.log('👤 Retry also found no check-in events');
                                }
                            } catch (retryError) {
                                console.error('👤 Retry failed:', retryError);
                            }
                        }, 3000);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    // Fallback to Firebase Auth data
                    const fallbackData = {
                        name: currentUser.displayName || currentUser.phoneNumber || 'User',
                        username: currentUser.email?.split('@')[0] || currentUser.phoneNumber?.replace(/\D/g, '') || 'user',
                        photoURL: currentUser.photoURL || undefined,
                        photo: currentUser.photoURL || undefined,
                        phone: currentUser.phoneNumber || undefined,
                        email: currentUser.email || undefined
                    };
                    setUserData(fallbackData);
                }
            } else {
                setUserData(null);
                setOwnedPages({ artists: [], organizations: [], venues: [] });
                setSharedPages({ artists: [], organizations: [], venues: [], events: [], activities: [] });
                setCheckinEvents([]);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };

    const handleLogout = async () => {
        try {
            // Clear all session markers before logout
            clearAllSessions();
            
            await signOut(auth());
            setShowDropdown(false);
            router.push('/');
            console.log("User logged out successfully!");
        } catch (error) {
            console.error("Error logging out:", error instanceof Error ? error.message : "An error occurred");
        }
    };

    const handleTicketsClick = () => {
        setShowDropdown(false);
        router.push('/tickets');
    };

    const handleSignInClick = () => {
        router.push('/login');
    };

    const handleCreateNewPage = () => {
        setShowDropdown(false);
        router.push('/business');
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    // Get profile picture URL for user
    const getProfilePictureUrl = () => {
        if (!userData) return null;
        
        // Check all possible field names for profile image
        if (userData.profilePicture) {
            return userData.profilePicture;
        }
        if (userData.photo) {
            return userData.photo;
        }
        if (userData.profile_image) {
            return userData.profile_image;
        }
        if (userData.photoURL) {
            return userData.photoURL;
        }
        
        return null;
    };

    // Get initials for default avatar
    const getUserInitials = () => {
        if (!userData) return 'U';
        
        let name = 'User';
        
        if (userData.name) {
            name = userData.name;
        } else if (userData.phone) {
            name = userData.phone;
        }
        
        return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Calculate totals
    const totalOwnedPages = ownedPages.artists.length + ownedPages.organizations.length + ownedPages.venues.length;
    const totalSharedPages = sharedPages.artists.length + sharedPages.organizations.length + sharedPages.venues.length;

    if (!user) {
        // Show Sign In button when not logged in
        return (
            <button 
                className={styles.signInButton}
                onClick={handleSignInClick}
            >
                Sign In
            </button>
        );
    }

    // Show profile when logged in
    return (
        <div className={styles.personLogoContainer} ref={dropdownRef}>
            <div 
                className={styles.profileButton}
                onClick={toggleDropdown}
            >
                {getProfilePictureUrl() ? (
                    <img 
                        src={getProfilePictureUrl()!}
                        alt="Profile"
                        className={styles.profileImage}
                        onError={(e) => {
                            // Fallback to initials if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.add(styles.show);
                        }}
                    />
                ) : null}
                <div className={`${styles.profileInitials} ${!getProfilePictureUrl() ? styles.show : ''}`}>
                    {getUserInitials()}
                </div>
            </div>

            {showDropdown && (
                <div className={styles.dropdown}>
                    {/* User Info Header */}
                    <div className={styles.userInfo}>
                        <div className={styles.userInfoImage}>
                            {userData?.photoURL || userData?.photo ? (
                                <img 
                                    src={userData?.photoURL || userData?.photo!}
                                    alt="Profile"
                                    className={styles.userInfoAvatar}
                                />
                            ) : (
                                <div className={styles.userInfoInitials}>
                                    {userData?.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                                </div>
                            )}
                        </div>
                        <div className={styles.userInfoText}>
                            <div className={styles.userName}>
                                {userData?.name || userData?.phone || 'User'}
                            </div>
                            <div className={styles.userUsername}>
                                @{userData?.username || userData?.phone?.replace(/\D/g, '') || 'user'}
                            </div>
                        </div>
                    </div>

                    {/* Main Navigation Grid */}
                    <div className={styles.navigationGrid}>
                        <div className={styles.navItem} onClick={() => { setShowDropdown(false); router.push('/profile'); }}>
                            <FaUser className={styles.navIcon} />
                            <span className={styles.navLabel}>Profile</span>
                        </div>

                        <div className={styles.navItem} onClick={handleTicketsClick}>
                            <FaTicketAlt className={styles.navIcon} />
                            <span className={styles.navLabel}>Tickets</span>
                        </div>
                    </div>

                    <div className={styles.dropdownDivider}></div>

                    {/* Pages Section */}
                    {totalOwnedPages > 0 && (
                        <div className={styles.section}>
                            <div 
                                className={styles.sectionHeader}
                                onClick={() => setShowOwnedPages(!showOwnedPages)}
                                >
                                <div className={styles.sectionTitle}>
                                    <FaBuilding className={styles.sectionIcon} />
                                    <span>My Pages ({totalOwnedPages})</span>
                                </div>
                                {showOwnedPages ? <FaChevronUp className={styles.chevronIcon} /> : <FaChevronDown className={styles.chevronIcon} />}
                            </div>
                            
                            {showOwnedPages && (
                                <div className={styles.sectionContent}>
                        {/* Artist Pages */}
                        {ownedPages.artists.map((artist) => (
                            <div 
                                key={artist.uid} 
                                className={styles.pageItem}
                                onClick={() => { 
                                    setShowDropdown(false); 
                                    router.push(`/artist?page=${artist.uid}`);
                                }}
                            >
                                <FaMicrophone className={styles.pageIcon} />
                                <span>{artist.name || 'Unnamed Artist'}</span>
                                            <span className={styles.pageType}>Artist</span>
                            </div>
                        ))}
                        
                        {/* Organization Pages */}
                        {ownedPages.organizations.map((org) => (
                            <div 
                                key={org.uid} 
                                className={styles.pageItem}
                                onClick={() => { 
                                    setShowDropdown(false); 
                                    router.push(`/organisation?page=${org.uid}`);
                                }}
                            >
                                <FaBuilding className={styles.pageIcon} />
                                <span>{org.name || 'Unnamed Organization'}</span>
                                            <span className={styles.pageType}>Org</span>
                            </div>
                        ))}
                        
                        {/* Venue Pages */}
                        {ownedPages.venues.map((venue) => (
                            <div 
                                key={venue.uid} 
                                className={styles.pageItem}
                                onClick={() => { 
                                    setShowDropdown(false); 
                                    router.push(`/venue?page=${venue.uid}`);
                                }}
                            >
                                <FaMapMarkerAlt className={styles.pageIcon} />
                                <span>{venue.name || 'Unnamed Venue'}</span>
                                            <span className={styles.pageType}>Venue</span>
                                        </div>
                                    ))}
                                    
                                    {/* Create New Page Option */}
                                    <div className={styles.createPageItem} onClick={handleCreateNewPage}>
                                        <FaPlus className={styles.pageIcon} />
                                        <span>Create new page</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Check-in Events Section */}
                    {checkinEvents.length > 0 && (
                        <div className={styles.section}>
                            <div 
                                className={styles.sectionHeader}
                                onClick={() => setShowCheckinEvents(!showCheckinEvents)}
                            >
                                <div className={styles.sectionTitle}>
                                    <FaQrcode className={styles.sectionIcon} />
                                    <span>Check-in Events ({checkinEvents.length})</span>
                                </div>
                                {showCheckinEvents ? <FaChevronUp className={styles.chevronIcon} /> : <FaChevronDown className={styles.chevronIcon} />}
                            </div>
                            
                            {showCheckinEvents && (
                                <div className={styles.sectionContent}>
                                    {checkinEvents.map((event) => (
                                        <div 
                                            key={`checkin-${event.eventId}`} 
                                            className={`${styles.pageItem} ${styles.checkinItem}`}
                                            onClick={() => { 
                                                setShowDropdown(false); 
                                                router.push(`/checkin/${event.eventId}`);
                                            }}
                                        >
                                            <FaQrcode className={styles.pageIcon} />
                                            <span>{event.eventTitle}</span>
                                            <span className={styles.accessTag}>Check-in</span>
                            </div>
                        ))}
                                </div>
                            )}
                        </div>
                    )}
                        
                        {/* Shared Pages Section */}
                    {totalSharedPages > 0 && (
                        <div className={styles.section}>
                            <div 
                                className={styles.sectionHeader}
                                onClick={() => setShowSharedPages(!showSharedPages)}
                            >
                                <div className={styles.sectionTitle}>
                                    <FaShareAlt className={styles.sectionIcon} />
                                    <span>Shared with me ({totalSharedPages})</span>
                                </div>
                                {showSharedPages ? <FaChevronUp className={styles.chevronIcon} /> : <FaChevronDown className={styles.chevronIcon} />}
                                </div>
                                
                            {showSharedPages && (
                                <div className={styles.sectionContent}>
                                {/* Shared Artist Pages */}
                                {sharedPages.artists.map((artist) => (
                                    <div 
                                        key={`shared-artist-${artist.uid}`} 
                                            className={`${styles.pageItem} ${styles.sharedItem}`}
                                        onClick={() => { 
                                            setShowDropdown(false); 
                                            router.push(`/artist?page=${artist.uid}`);
                                        }}
                                    >
                                        <FaMicrophone className={styles.pageIcon} />
                                        <span>{artist.name}</span>
                                        <span className={styles.roleTag}>{artist.role}</span>
                                    </div>
                                ))}
                                
                                {/* Shared Organization Pages */}
                                {sharedPages.organizations.map((org) => (
                                    <div 
                                        key={`shared-org-${org.uid}`} 
                                            className={`${styles.pageItem} ${styles.sharedItem}`}
                                        onClick={() => { 
                                            setShowDropdown(false); 
                                            router.push(`/organisation?page=${org.uid}`);
                                        }}
                                    >
                                        <FaBuilding className={styles.pageIcon} />
                                        <span>{org.name}</span>
                                        <span className={styles.roleTag}>{org.role}</span>
                                    </div>
                                ))}
                                
                                {/* Shared Venue Pages */}
                                {sharedPages.venues.map((venue) => (
                                    <div 
                                        key={`shared-venue-${venue.uid}`} 
                                            className={`${styles.pageItem} ${styles.sharedItem}`}
                                        onClick={() => { 
                                            setShowDropdown(false); 
                                            router.push(`/venue?page=${venue.uid}`);
                                        }}
                                    >
                                        <FaMapMarkerAlt className={styles.pageIcon} />
                                        <span>{venue.name}</span>
                                        <span className={styles.roleTag}>{venue.role}</span>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                        )}
                        
                    {/* Show create page option if no owned pages */}
                    {totalOwnedPages === 0 && (
                        <div className={styles.section}>
                            <div className={styles.createPageItem} onClick={handleCreateNewPage}>
                            <FaPlus className={styles.pageIcon} />
                                <span>Create your first page</span>
                            </div>
                        </div>
                    )}
                        
                        <div className={styles.dropdownDivider}></div>

                    {/* Sign Out */}
                    <div className={styles.signOutSection}>
                        <div className={styles.dropdownItem} onClick={handleLogout}>
                            <FaSignOutAlt className={styles.dropdownIcon} />
                            <span>Sign Out</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PersonLogo; 