import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../lib/firebase';
import { signOut, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { FaTicketAlt, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';
import styles from "./PersonLogo.module.css";
import Link from 'next/link';

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
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isOrganization, setIsOrganization] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Check if we're on organization-specific routes
    const isOrganizationRoute = pathname?.startsWith('/organisation') || 
                               pathname?.startsWith('/organization') || 
                               pathname?.startsWith('/login/organisation') ||
                               pathname?.startsWith('/create/') ||
                               pathname?.startsWith('/edit-') ||
                               pathname?.includes('dashboard');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    // Only check organization profile if we're on organization routes
                    if (isOrganizationRoute) {
                        const orgDoc = await getDoc(doc(db, "Organisations", currentUser.uid));
                        if (orgDoc.exists()) {
                            setIsOrganization(true);
                            const orgData = orgDoc.data() as UserData;
                            console.log('👤 Loaded organization data from Firestore:', orgData);
                            setUserData(orgData);
                            return; // Exit early to avoid checking user profile
                        }
                    }
                    
                    // Always prioritize user profile for general authentication
                    setIsOrganization(false);
                    const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
                    if (userDoc.exists()) {
                        const firestoreData = userDoc.data() as UserData;
                        console.log('👤 Loaded user data from Firestore:', firestoreData);
                        setUserData(firestoreData);
                    } else {
                        // Fallback to Firebase Auth data
                        setUserData({
                            name: currentUser.displayName || currentUser.phoneNumber || 'User',
                            username: currentUser.email?.split('@')[0] || currentUser.phoneNumber?.replace(/\D/g, '') || 'user',
                            photoURL: currentUser.photoURL || undefined,
                            photo: currentUser.photoURL || undefined,
                            phone: currentUser.phoneNumber || undefined,
                            email: currentUser.email || undefined
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    // Fallback to Firebase Auth data
                    setUserData({
                        name: currentUser.displayName || currentUser.phoneNumber || 'User',
                        username: currentUser.email?.split('@')[0] || currentUser.phoneNumber?.replace(/\D/g, '') || 'user',
                        photoURL: currentUser.photoURL || undefined,
                        photo: currentUser.photoURL || undefined,
                        phone: currentUser.phoneNumber || undefined,
                        email: currentUser.email || undefined
                    });
                }
            } else {
                setUserData(null);
                setIsOrganization(false);
            }
        });
        return () => unsubscribe();
    }, [isOrganizationRoute]);

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
            await signOut(auth);
            setShowDropdown(false);
            router.push('/');
            console.log("User logged out successfully!");
        } catch (error) {
            console.error("Error logging out:", error instanceof Error ? error.message : "An error occurred");
        }
    };

    const handleProfileClick = () => {
        setShowDropdown(false);
        router.push('/profile');
    };

    const handleTicketsClick = () => {
        setShowDropdown(false);
        router.push('/tickets');
    };

    const handleSettingsClick = () => {
        setShowDropdown(false);
        // Add settings route when available
        console.log("Settings clicked");
    };

    const handleSignInClick = () => {
        router.push('/login');
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    // Get profile picture URL
    const getProfilePictureUrl = () => {
        // Check all possible field names for profile image
        if (userData?.profilePicture) {
            console.log('👤 Using profilePicture:', userData.profilePicture);
            return userData.profilePicture;
        }
        if (userData?.photo) {
            console.log('👤 Using photo:', userData.photo);
            return userData.photo;
        }
        if (userData?.profile_image) {
            console.log('👤 Using profile_image:', userData.profile_image);
            return userData.profile_image;
        }
        if (userData?.photoURL) {
            console.log('👤 Using photoURL:', userData.photoURL);
            return userData.photoURL;
        }
        
        // Only log when no image is found
        if (userData) {
            console.log('👤 No profile image found. Available fields:', {
                profilePicture: userData?.profilePicture,
                photo: userData?.photo,
                profile_image: userData?.profile_image,
                photoURL: userData?.photoURL,
                allUserData: userData
            });
        }
        return null;
    };

    // Get user initials for default avatar
    const getUserInitials = () => {
        const name = userData?.name || userData?.phone || 'User';
        return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    };

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
                            {getProfilePictureUrl() ? (
                                <img 
                                    src={getProfilePictureUrl()!}
                                    alt="Profile"
                                    className={styles.userInfoAvatar}
                                />
                            ) : (
                                <div className={styles.userInfoInitials}>
                                    {getUserInitials()}
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

                    {/* Dropdown Items */}
                    <div className={styles.dropdownItems}>
                        <div className={styles.dropdownItem} onClick={handleProfileClick}>
                            <FaUser className={styles.dropdownIcon} />
                            <span>View Profile</span>
                        </div>

                        {!isOrganization && (
                            <div className={styles.dropdownItem} onClick={handleTicketsClick}>
                                <FaTicketAlt className={styles.dropdownIcon} />
                                <span>Tickets</span>
                            </div>
                        )}

                        <div className={styles.dropdownItem} onClick={handleSettingsClick}>
                            <FaCog className={styles.dropdownIcon} />
                            <span>Settings</span>
                        </div>

                        <div className={styles.dropdownDivider}></div>

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