'use client';

import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from '@/infrastructure/firebase';
import { toast } from "react-toastify";
import { FaCamera, FaTimes, FaPlus, FaMusic, FaShare } from 'react-icons/fa';
import VenueProfileSkeleton from "./VenueProfileSkeleton";
import DashboardSection from '@/shared/components/dashboard/Dashboard/DashboardSection/DashboardSection';
import PhotoUpload from '@/components/forms/PhotoUpload/PhotoUpload';
import ContentSharingManager from '@/components/feedback/ContentSharingManager/ContentSharingManager';
import { getUserOwnedPages } from '@/domains/authentication/services/auth.service';
import { ContentSharingSecurity } from '@/shared/utils/security/contentSharingSecurity';
import { useRouter } from 'next/navigation';
import styles from "./VenueProfile.module.css";

interface VenueData {
  uid?: string;
  ownerId?: string;
  phoneNumber?: string;
  isActive?: boolean;
  role?: string;
  name?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  venueType?: string;
  location?: string;
  capacity?: number;
  address?: string;
  city?: string;
  createdAt?: string;
  updatedAt?: string;
  settings?: {
    notifications?: boolean;
    emailUpdates?: boolean;
    privacy?: {
      profileVisibility?: string;
      contactVisibility?: string;
    };
  };
}

interface VenueProfileProps {
  selectedPageId?: string | null;
}

const VenueProfile: React.FC<VenueProfileProps> = ({ selectedPageId }) => {
  const router = useRouter();
  const [venueDetails, setVenueDetails] = useState<VenueData | null>(null);
  const [ownedVenuePages, setOwnedVenuePages] = useState<VenueData[]>([]);
  const [currentVenuePageId, setCurrentVenuePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [userPermissions, setUserPermissions] = useState<{
    canEdit: boolean;
    canManage: boolean;
    role: string;
  }>({ canEdit: false, canManage: false, role: 'viewer' });
  
  const [name, setName] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [newUsername, setNewUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [newBio, setNewBio] = useState<string>("");
  const [venueType, setVenueType] = useState<string>("");
  const [newVenueType, setNewVenueType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [newLocation, setNewLocation] = useState<string>("");
  const [capacity, setCapacity] = useState<number>(0);
  const [newCapacity, setNewCapacity] = useState<number>(0);
  const [address, setAddress] = useState<string>("");
  const [newAddress, setNewAddress] = useState<string>("");
  const [photoURL, setPhotoURL] = useState<string>("");
  const [newPhotoURL, setNewPhotoURL] = useState<string>("");
  const [bannerImage, setBannerImage] = useState<string>("");
  const [newBannerImage, setNewBannerImage] = useState<string>("");
  const [usernameError, setUsernameError] = useState<string>("");
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);

  // Photo editing states
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState<boolean>(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<'profile' | 'banner'>('profile');

  // Content sharing state
  const [showSharingModal, setShowSharingModal] = useState<boolean>(false);

  const fetchVenueData = async (pageId: string) => {
    console.log("Fetching venue data for page:", pageId);
    try {
      const venueDocRef = doc(db(), "Venues", pageId);
      const docSnap = await getDoc(venueDocRef);
  
      if (docSnap.exists()) {
        console.log("Document exists in Firestore");
        const data = docSnap.data() as VenueData;
        
        setVenueDetails(data);
        setName(data.name || "");
        setNewName(data.name || "");
        setUsername(data.username || "");
        setNewUsername(data.username || "");
        setBio(data.bio || "");
        setNewBio(data.bio || "");
        setVenueType(data.venueType || "");
        setNewVenueType(data.venueType || "");
        setLocation(data.location || "");
        setNewLocation(data.location || "");
        setCapacity(data.capacity || 0);
        setNewCapacity(data.capacity || 0);
        setAddress(data.address || "");
        setNewAddress(data.address || "");
        setPhotoURL(data.photoURL || "");
        setNewPhotoURL(data.photoURL || "");
        setBannerImage(data.bannerImage || "");
        setNewBannerImage(data.bannerImage || "");
        
        localStorage.setItem('venueDetails', JSON.stringify(data));
        localStorage.setItem('venueName', data.name || "");
        localStorage.setItem('venueUsername', data.username || "");
        localStorage.setItem('venueBio', data.bio || "");
        localStorage.setItem('venueType', data.venueType || "");
        localStorage.setItem('venueLocation', data.location || "");
        localStorage.setItem('venueCapacity', data.capacity?.toString() || "");
        localStorage.setItem('venueAddress', data.address || "");
        localStorage.setItem('venuePhotoURL', data.photoURL || "");
        localStorage.setItem('venueBannerImage', data.bannerImage || "");
      } else {
        console.log("Document doesn't exist in Firestore");
        const user = auth().currentUser;
        
        if (user) {
          const newData: VenueData = {
            uid: pageId,
            ownerId: user.uid,
            phoneNumber: user.phoneNumber || "",
            isActive: true,
            role: "Venue",
            settings: {
              emailUpdates: false,
              notifications: true,
              privacy: {
                contactVisibility: "followers",
                profileVisibility: "public"
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
  
          await setDoc(venueDocRef, newData);
          setVenueDetails(newData);
        }
      }
    } catch (err) {
      console.error("Error in fetchVenueData:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    try {
      const { checkGlobalUsernameAvailability } = await import('@/domains/authentication/services/auth.service');
      const currentVenuePageId = sessionStorage.getItem('selectedVenuePageId') || undefined;
      
      const result = await checkGlobalUsernameAvailability(
        username,
        undefined, // Don't exclude user ID since this is for venue page
        currentVenuePageId,
        'venue'
      );
      
      if (!result.available) {
        const takenByMessage = result.takenBy === 'user' ? 'a user' :
                             result.takenBy === 'artist' ? 'an artist' :
                             result.takenBy === 'organisation' ? 'an organization' :
                             result.takenBy === 'venue' ? 'another venue' : 'someone else';
        setUsernameError(`Username is already taken by ${takenByMessage}`);
      } else {
        setUsernameError("");
      }
      
      return result.available;
    } catch (err) {
      console.error("Error checking username:", err);
      setUsernameError("Error checking username availability");
      return false;
    }
  };

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setNewUsername(newUsername);
    setUsernameError("");
    
    if (newUsername.length >= 3) {
      setIsCheckingUsername(true);
      await checkUsernameAvailability(newUsername);
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    
    const unsubscribe = onAuthStateChanged(auth(), async (user: User | null) => {
      console.log("Auth state changed:", user?.uid);
      
      if (user && isSubscribed) {
        try {
          // Check if there's a specific venue page to load
          const sessionSelectedPageId = typeof window !== 'undefined' ? 
            sessionStorage.getItem('selectedVenuePageId') : null;
          
          // Priority: prop selectedPageId > session storage
          const pageIdToUse = selectedPageId || sessionSelectedPageId;
          
          if (pageIdToUse) {
            // Specific page requested - check access and load directly
            console.log(`🏟️ Loading specific venue page: ${pageIdToUse}`);
            
            // Verify access to this specific page
            const permissions = await ContentSharingSecurity.verifyContentAccess('venue', pageIdToUse, user.uid);
            
            if (permissions.canView && permissions.role !== 'unauthorized') {
              console.log(`🔓 Access granted to venue page: ${pageIdToUse} with role: ${permissions.role}`);
              
              // Set user permissions for this page
              setUserPermissions({
                canEdit: permissions.canEdit,
                canManage: permissions.canManage,
                role: permissions.role
              });
              
              setCurrentVenuePageId(pageIdToUse);
              await fetchVenueData(pageIdToUse);
              
              // Clear session selection after using it
              if (sessionSelectedPageId) {
                sessionStorage.removeItem('selectedVenuePageId');
              }
            } else {
              console.log(`🚫 Access denied to venue page: ${pageIdToUse}`);
              setError("You don't have permission to access this venue page.");
              setLoading(false);
            }
          } else {
            // No specific page requested - load owned pages
            console.log("🏟️ Loading owned venue pages");
            const ownedPages = await getUserOwnedPages(user.uid);
            setOwnedVenuePages(ownedPages.venues);
            
            if (ownedPages.venues.length > 0) {
              const pageToLoad = ownedPages.venues[0]; // Default to first page
              
              // Set owner permissions
              setUserPermissions({
                canEdit: true,
                canManage: true,
                role: 'owner'
              });
              
              setCurrentVenuePageId(pageToLoad.uid);
              await fetchVenueData(pageToLoad.uid);
            } else {
              // No owned venue pages - check if user has shared access to any venue pages
              const sharedContent = await ContentSharingSecurity.getUserSharedContent(user.uid);
              
              if (sharedContent.venues.length > 0) {
                // User has shared access to venue pages, but no specific page selected
                setError("Please select a venue page from your dropdown menu.");
                setLoading(false);
              } else {
                // No venue pages found at all
                setError("No venue pages found. Please create a venue page first.");
                setLoading(false);
              }
            }
          }
          
          // Always load owned pages for page switching functionality
          const ownedPages = await getUserOwnedPages(user.uid);
          setOwnedVenuePages(ownedPages.venues);
          
        } catch (err) {
          console.error("Error loading venue pages:", err);
          setError("Failed to load venue pages");
          setLoading(false);
        }
      } else if (!user) {
        setVenueDetails(null);
        setOwnedVenuePages([]);
        setCurrentVenuePageId(null);
        setError(null);
        setEditMode(false);
        setLoading(false);
      }
    });
  
    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [selectedPageId]);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const user = auth().currentUser;
  
      if (!user) {
        setError("User not authenticated");
        toast.error("Please login to save profile");
        return;
      }
  
      if (newUsername) {
        const isUsernameAvailable = await checkUsernameAvailability(newUsername);
        if (!isUsernameAvailable) {
          setLoading(false);
          return;
        }
      }
  
      if (!currentVenuePageId) {
        setError("No venue page selected");
        toast.error("No venue page selected");
        setLoading(false);
        return;
      }
      const venueDocRef = doc(db(), "Venues", currentVenuePageId);
  
      const updates = {
        name: newName,
        username: newUsername.toLowerCase(),
        bio: newBio,
        venueType: newVenueType,
        location: newLocation,
        capacity: newCapacity,
        address: newAddress,
        photoURL: newPhotoURL,
        bannerImage: newBannerImage,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(venueDocRef, updates);
      
      const updatedVenueDetails = { ...venueDetails, ...updates };
      setVenueDetails(updatedVenueDetails);
      setName(newName);
      setUsername(newUsername);
      setBio(newBio);
      setVenueType(newVenueType);
      setLocation(newLocation);
      setCapacity(newCapacity);
      setAddress(newAddress);
      setPhotoURL(newPhotoURL);
      setBannerImage(newBannerImage);
      
      localStorage.setItem('venueDetails', JSON.stringify(updates));
      localStorage.setItem('venueName', newName);
      localStorage.setItem('venueUsername', newUsername);
      localStorage.setItem('venueBio', newBio);
      localStorage.setItem('venueType', newVenueType);
      localStorage.setItem('venueLocation', newLocation);
      localStorage.setItem('venueCapacity', newCapacity.toString());
      localStorage.setItem('venueAddress', newAddress);
      localStorage.setItem('venuePhotoURL', newPhotoURL);
      localStorage.setItem('venueBannerImage', newBannerImage);
      
      setUsernameError("");
      setEditMode(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  // Photo editing handlers
  const handleProfilePhotoClick = () => {
    if (!userPermissions.canEdit) return;
    setCurrentPhotoType('profile');
    setShowPhotoModal(true);
  };

  const handleBannerClick = () => {
    if (!userPermissions.canEdit) return;
    setCurrentPhotoType('banner');
    setShowPhotoModal(true);
  };

  const handleUploadPhotoClick = () => {
    setShowPhotoModal(false);
    setShowPhotoUpload(true);
  };

  const handlePhotoChange = async (imageUrl: string) => {
    try {
      if (currentPhotoType === 'profile') {
        setNewPhotoURL(imageUrl);
        setPhotoURL(imageUrl);
      } else {
        setNewBannerImage(imageUrl);
        setBannerImage(imageUrl);
      }

      // Update Firestore immediately
      const user = auth().currentUser;
      if (user && currentVenuePageId) {
        const venueDocRef = doc(db(), "Venues", currentVenuePageId);
        const updateField = currentPhotoType === 'profile' ? 'photoURL' : 'bannerImage';
        await updateDoc(venueDocRef, {
          [updateField]: imageUrl,
          updatedAt: new Date().toISOString()
        });
      }

      setShowPhotoUpload(false);
      toast.success(`${currentPhotoType === 'profile' ? 'Profile photo' : 'Banner'} updated successfully!`);
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error(`Failed to update ${currentPhotoType === 'profile' ? 'profile photo' : 'banner'}`);
    }
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setShowPhotoUpload(false);
  };

  if (loading) {
    return <VenueProfileSkeleton />;
  }

  if (error && !venueDetails) {
    return (
      <div className={styles.venueProfileContainer}>
        <div className={styles.noVenuePagesContainer}>
          <div className={styles.noVenuePagesCard}>
            <FaMusic className={styles.noVenuePagesIcon} />
            <h2>No Venue Pages Found</h2>
            <p>You haven't created any venue pages yet. Create your first venue page to start showcasing your space!</p>
            <button 
              onClick={() => router.push('/business')}
              className={styles.createVenuePageButton}
            >
              <FaPlus className={styles.createIcon} />
              Create Venue Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.venueProfileContainer}>
      {/* Display Venue Details */}
      <div className={styles.venueProfileContainer}>
        <div className={styles.venueBannerSection}>
          <div 
            className={styles.venueBanner} 
            onClick={userPermissions.canEdit ? handleBannerClick : undefined}
            style={{ cursor: userPermissions.canEdit ? 'pointer' : 'default' }}
          >
            {bannerImage ? (
              <img
                src={bannerImage}
                alt="Venue Banner"
                className={styles.bannerImage}
              />
            ) : (
              <div className={styles.defaultBanner} />
            )}
            {userPermissions.canEdit && (
              <div className={styles.bannerOverlay}>
                <FaCamera className={styles.cameraIcon} />
                <span>Edit Banner</span>
              </div>
            )}
          </div>
          <div 
            className={styles.venueProfileImageContainer} 
            onClick={userPermissions.canEdit ? handleProfilePhotoClick : undefined}
            style={{ cursor: userPermissions.canEdit ? 'pointer' : 'default' }}
          >
            {photoURL ? (
              <img 
                src={photoURL} 
                alt="Profile"
                className={styles.venueProfileImage}
              />
            ) : (
              <div className={styles.noPhoto}>
                {name ? name.charAt(0).toUpperCase() : 'V'}
              </div>
            )}
            {userPermissions.canEdit && (
              <div className={styles.profileOverlay}>
                <FaCamera className={styles.cameraIcon} />
                <span>Edit Photo</span>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.venueDetailsSection}>
          <div className={styles.venueHeader}>
            <div className={styles.venueName}>
              <h1>{name || "Venue Name"}</h1>
            </div>
            <div className={styles.metaRow}>
              <div className={styles.venueUsername}>
                @{username || "username"}
              </div>
              {venueType && (
                <div className={styles.venueType}>
                  {venueType}
                </div>
              )}
            </div>

            {/* Profile Action Buttons */}
            {!editMode && (
              <div className={styles.profileButtonsContainer}>
                {userPermissions.canEdit && (
                  <button 
                    onClick={() => setEditMode(true)}
                    className={styles.editProfileButton}
                  >
                    Edit Profile
                  </button>
                )}
                {username && (
                  <button 
                    onClick={() => window.open(`/venue/${username}`, '_blank')}
                    className={styles.viewPublicButton}
                  >
                    View Public Page
                  </button>
                )}
                {userPermissions.canManage && (
                  <button 
                    onClick={() => setShowSharingModal(true)}
                    className={styles.shareButton}
                  >
                    <FaShare className={styles.shareIcon} />
                    Share Access
                  </button>
                )}
                {userPermissions.canEdit && (
                  <button 
                    onClick={() => {
                      if (currentVenuePageId) {
                        router.push(`/create?from=venue&pageId=${currentVenuePageId}&name=${encodeURIComponent(name || '')}&username=${encodeURIComponent(username || '')}`);
                      } else {
                        router.push('/create');
                      }
                    }}
                    className={styles.createButton}
                  >
                    Create
                  </button>
                )}
                {!userPermissions.canEdit && (
                  <div className={styles.viewerBadge}>
                    <span>👁️ Viewing as {userPermissions.role}</span>
                  </div>
                )}
              </div>
            )}

            {bio && (
              <div className={styles.venueBio}>
                <p>{bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {editMode && (
          <div className={styles.editProfileContainer}>
            <div className={styles.inputGroup}>
              <label htmlFor="name">Venue Name:</label>
              <input
                id="name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter venue name"
                className={styles.profileInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="username">Username:</label>
              <input
                id="username"
                type="text"
                value={newUsername}
                onChange={handleUsernameChange}
                placeholder="Enter username"
                className={styles.profileInput}
              />
              {isCheckingUsername && <span className={styles.checking}>Checking username...</span>}
              {usernameError && <span className={styles.error}>{usernameError}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="venueType">Venue Type:</label>
              <input
                id="venueType"
                type="text"
                value={newVenueType}
                onChange={(e) => setNewVenueType(e.target.value)}
                placeholder="e.g., Concert Hall, Club, Restaurant"
                className={styles.profileInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="bio">Description:</label>
              <textarea
                id="bio"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Describe your venue and services"
                className={styles.profileInput}
                rows={4}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Phone Number:</label>
              <input
                type="tel"
                value={venueDetails?.phoneNumber || ""}
                className={styles.profileInput}
                placeholder="Phone number"
                disabled
              />
              <span className={styles.helperText}>Phone number cannot be changed</span>
            </div>

            <div className={styles.buttonGroup}>
              <button 
                onClick={handleSaveProfile}
                disabled={isCheckingUsername || !!usernameError}
                className={styles.saveCancleButton}
              >
                Save
              </button>
              <button 
                onClick={() => setEditMode(false)}
                className={styles.saveCancleButton}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Events & Activities Dashboard Section */}
        <div className={styles.ownedEventsSection}>
          <div className={styles.sectionHeader}>
            <h3>🏟️ Events & Activities</h3>
            <p>Manage your created events and collaborated events</p>
          </div>
          <div className={styles.venueDashboardSection}>
            <DashboardSection pageId={currentVenuePageId || undefined} pageType="venue" />
          </div>
        </div>
      </div>

      {/* Photo Options Modal */}
      {showPhotoModal && (
        <div className={styles.modalOverlay} onClick={closePhotoModal}>
          <div className={styles.photoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit {currentPhotoType === 'profile' ? 'Profile Photo' : 'Banner'}</h3>
              <button className={styles.closeButton} onClick={closePhotoModal}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalContent}>
              <button className={styles.photoOption} onClick={handleUploadPhotoClick}>
                <FaCamera className={styles.optionIcon} />
                <span>Upload {currentPhotoType === 'profile' ? 'Photo' : 'Banner'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <div className={styles.modalOverlay} onClick={closePhotoModal}>
          <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Upload & Crop {currentPhotoType === 'profile' ? 'Profile Photo' : 'Banner'}</h3>
              <button className={styles.closeButton} onClick={closePhotoModal}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalContent}>
              <PhotoUpload
                currentImageUrl={currentPhotoType === 'profile' ? photoURL : bannerImage}
                onImageChange={handlePhotoChange}
                type={currentPhotoType}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Sharing Modal */}
      {showSharingModal && currentVenuePageId && (
        <ContentSharingManager
          contentType="venue"
          contentId={currentVenuePageId}
          contentName={name || 'Venue Page'}
          onClose={() => setShowSharingModal(false)}
        />
      )}
    </div>
  );
};

export default VenueProfile; 