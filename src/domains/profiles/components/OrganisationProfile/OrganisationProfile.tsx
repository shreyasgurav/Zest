'use client';

import React, { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, User, getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { toast } from "react-toastify";
import { FaCamera, FaTimes, FaBuilding, FaPlus, FaShare } from 'react-icons/fa';
import OrganisationProfileSkeleton from "./OrganisationProfileSkeleton";
import DashboardSection from '@/shared/components/dashboard/Dashboard/DashboardSection/DashboardSection';
import PhotoUpload from '@/components/forms/PhotoUpload/PhotoUpload';
import ContentSharingManager from '@/components/feedback/ContentSharingManager/ContentSharingManager';
import { useRouter } from 'next/navigation';
import { getUserOwnedPages } from '@/domains/authentication/services/auth.service';
import { ContentSharingSecurity } from '@/shared/utils/security/contentSharingSecurity';
import styles from "./OrganisationProfile.module.css";

interface OrganisationData {
  uid: string;
  ownerId: string;
  phoneNumber?: string;
  isActive?: boolean;
  role?: string;
  name?: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  bannerImage?: string;
  createdAt?: string;
  updatedAt?: string;
  settings?: any;
}

interface OrganisationProfileProps {
  selectedPageId?: string | null;
}

const OrganisationProfile: React.FC<OrganisationProfileProps> = ({ selectedPageId }) => {
  const router = useRouter();
  const [orgDetails, setOrgDetails] = useState<OrganisationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  
  // Current page management
  const [currentOrgPageId, setCurrentOrgPageId] = useState<string | null>(null);
  const [ownedOrgPages, setOwnedOrgPages] = useState<OrganisationData[]>([]);
  
  // Form states
  const [name, setName] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [newUsername, setNewUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [newBio, setNewBio] = useState<string>("");
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

  // Sharing states
  const [showSharingModal, setShowSharingModal] = useState<boolean>(false);
  const [userPermissions, setUserPermissions] = useState({
    canEdit: false,
    canManage: false,
    role: 'unauthorized' as string
  });

  const fetchOrgData = async (pageId: string) => {
    console.log("Fetching organization data for page:", pageId);
    try {
      const db = getFirestore();
      const orgDocRef = doc(db, "Organisations", pageId);
      const docSnap = await getDoc(orgDocRef);
  
      if (docSnap.exists()) {
        console.log("Document exists in Firestore");
        const data = docSnap.data();
        
        if (!data.ownerId) {
          throw new Error("Organization page missing owner information");
        }
        
        const orgData: OrganisationData = {
          uid: docSnap.id,
          ownerId: data.ownerId,
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          photoURL: data.photoURL || "",
          bannerImage: data.bannerImage || "",
          phoneNumber: data.phoneNumber || "",
          isActive: data.isActive || true,
          role: data.role || "Organisation",
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
          settings: data.settings || {}
        };
        
        setOrgDetails(orgData);
        setName(orgData.name || "");
        setNewName(orgData.name || "");
        setUsername(orgData.username || "");
        setNewUsername(orgData.username || "");
        setBio(orgData.bio || "");
        setNewBio(orgData.bio || "");
        setPhotoURL(orgData.photoURL || "");
        setNewPhotoURL(orgData.photoURL || "");
        setBannerImage(orgData.bannerImage || "");
        setNewBannerImage(orgData.bannerImage || "");
        
        setError(null);
      } else {
        throw new Error("Organization page not found");
      }
    } catch (err) {
      console.error("Error in fetchOrgData:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setOrgDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    if (username.toLowerCase() === (orgDetails?.username || '').toLowerCase()) {
      setUsernameError("");
      return true;
    }

    try {
      const { checkGlobalUsernameAvailability } = await import('@/domains/authentication/services/auth.service');
      
      const result = await checkGlobalUsernameAvailability(
        username,
        undefined,
        currentOrgPageId || undefined,
        'organisation'
      );
      
      if (!result.available) {
        const takenByMessage = result.takenBy === 'user' ? 'a user' :
                             result.takenBy === 'artist' ? 'an artist' :
                             result.takenBy === 'organisation' ? 'another organization' :
                             result.takenBy === 'venue' ? 'a venue' : 'someone else';
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
    
    if (newUsername.toLowerCase() === username.toLowerCase()) {
      return;
    }
    
    if (newUsername.length >= 3) {
      setIsCheckingUsername(true);
      await checkUsernameAvailability(newUsername);
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    let isSubscribed = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      console.log("Auth state changed:", user?.uid);
      
      if (user && isSubscribed) {
        try {
          const sessionSelectedPageId = typeof window !== 'undefined' ? 
            sessionStorage.getItem('selectedOrganizationPageId') : null;
          
          const pageIdToUse = selectedPageId || sessionSelectedPageId;
          
          if (pageIdToUse) {
            console.log(`🏢 Loading specific organization page: ${pageIdToUse}`);
            
            // Verify access to this specific page
            const permissions = await ContentSharingSecurity.verifyContentAccess('organization', pageIdToUse, user.uid);
            
            if (permissions.canView && permissions.role !== 'unauthorized') {
              console.log(`🔓 Access granted to organization page: ${pageIdToUse} with role: ${permissions.role}`);
              
              // Set user permissions for this page
              setUserPermissions({
                canEdit: permissions.canEdit,
                canManage: permissions.canManage,
                role: permissions.role
              });
              
              setCurrentOrgPageId(pageIdToUse);
              await fetchOrgData(pageIdToUse);
              
              // Clear session selection after using it
              if (sessionSelectedPageId) {
                sessionStorage.removeItem('selectedOrganizationPageId');
              }
            } else {
              console.log(`🚫 Access denied to organization page: ${pageIdToUse}`);
              setError("You don't have permission to access this organization page.");
              setLoading(false);
            }
          } else {
            console.log("🏢 Loading owned organization pages");
            const ownedPages = await getUserOwnedPages(user.uid);
            setOwnedOrgPages(ownedPages.organizations);
            
            if (ownedPages.organizations.length > 0) {
              const pageToLoad = ownedPages.organizations[0];
              
              // Set owner permissions
              setUserPermissions({
                canEdit: true,
                canManage: true,
                role: 'owner'
              });
              
              setCurrentOrgPageId(pageToLoad.uid);
              await fetchOrgData(pageToLoad.uid);
            } else {
              // No owned organization pages - check if user has shared access to any organization pages
              const sharedContent = await ContentSharingSecurity.getUserSharedContent(user.uid);
              
              if (sharedContent.organizations.length > 0) {
                // User has shared access to organization pages, but no specific page selected
                setError("Please select an organization page from your dropdown menu.");
                setLoading(false);
              } else {
                // No organization pages found at all
                setError("No organization pages found. Please create an organization page first.");
                setLoading(false);
              }
            }
          }
        } catch (err) {
          console.error("Error loading organization pages:", err);
          setError("Failed to load organization pages");
          setLoading(false);
        }
      } else if (!user) {
        setOrgDetails(null);
        setOwnedOrgPages([]);
        setCurrentOrgPageId(null);
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
      const user = getAuth().currentUser;
  
      if (!user) {
        setError("User not authenticated");
        toast.error("Please login to save profile");
        return;
      }
  
      if (!newName.trim()) {
        toast.error("Organization name is required");
        setLoading(false);
        return;
      }

      if (!newUsername.trim()) {
        toast.error("Username is required");
        setLoading(false);
        return;
      }
  
      if (newUsername.toLowerCase() !== (orgDetails?.username || '').toLowerCase()) {
        const isUsernameAvailable = await checkUsernameAvailability(newUsername);
        if (!isUsernameAvailable) {
          setLoading(false);
          return;
        }
      }
      
      if (!currentOrgPageId) {
        toast.error("No organization page found");
        setLoading(false);
        return;
      }
      
      const db = getFirestore();
      const orgDocRef = doc(db, "Organisations", currentOrgPageId);
  
      const updates = {
        name: newName.trim(),
        username: newUsername.toLowerCase().trim(),
        bio: newBio.trim(),
        photoURL: newPhotoURL,
        bannerImage: newBannerImage,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(orgDocRef, updates);
      
      if (orgDetails) {
        const updatedOrgDetails: OrganisationData = { 
          ...orgDetails, 
          ...updates 
        };
        setOrgDetails(updatedOrgDetails);
      }
      
      setName(newName.trim());
      setUsername(newUsername.toLowerCase().trim());
      setBio(newBio.trim());
      setPhotoURL(newPhotoURL);
      setBannerImage(newBannerImage);
      
      setUsernameError("");
      setError(null);
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

  const handlePhotoChange = async (imageUrl: string) => {
    try {
      if (currentPhotoType === 'profile') {
        setNewPhotoURL(imageUrl);
        setPhotoURL(imageUrl);
      } else {
        setNewBannerImage(imageUrl);
        setBannerImage(imageUrl);
      }

      if (currentOrgPageId) {
        const db = getFirestore();
        const orgDocRef = doc(db, "Organisations", currentOrgPageId);
        const updateField = currentPhotoType === 'profile' ? 'photoURL' : 'bannerImage';
        await updateDoc(orgDocRef, {
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

  const handleProfilePhotoClick = () => {
    setCurrentPhotoType('profile');
    setShowPhotoModal(true);
  };

  const handleBannerClick = () => {
    setCurrentPhotoType('banner');
    setShowPhotoModal(true);
  };

  const handleUploadPhotoClick = () => {
    setShowPhotoModal(false);
    setShowPhotoUpload(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setShowPhotoUpload(false);
  };

  if (loading) {
    return <OrganisationProfileSkeleton />;
  }

  if (error && !orgDetails) {
    return (
      <div className={styles.orgProfileContainer}>
        <div className={styles.noOrganizationPagesContainer}>
          <div className={styles.noOrganizationPagesCard}>
            <FaBuilding className={styles.noOrganizationPagesIcon} />
            <h2>No Organization Pages Found</h2>
            <p>You haven't created any organization pages yet. Create your first organization page to start showcasing your organization!</p>
            <button 
              onClick={() => router.push('/business')}
              className={styles.createOrganizationPageButton}
            >
              <FaPlus className={styles.createIcon} />
              Create Organization Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orgProfileContainer}>
      {/* Banner and Profile Image Section */}
      <div className={styles.orgBannerSection}>
        <div className={styles.orgBanner} onClick={handleBannerClick} style={{ cursor: 'pointer' }}>
          {bannerImage ? (
            <img
              src={bannerImage}
              alt="Organization Banner"
              className={styles.bannerImage}
            />
          ) : (
            <div className={styles.defaultBanner} />
          )}
          <div className={styles.bannerOverlay}>
            <FaCamera className={styles.cameraIcon} />
            <span>Edit Banner</span>
          </div>
        </div>
        <div className={styles.orgProfileImageContainer} onClick={handleProfilePhotoClick} style={{ cursor: 'pointer' }}>
          {photoURL ? (
            <img 
              src={photoURL} 
              alt="Profile"
              className={styles.orgProfileImage}
            />
          ) : (
            <div className={styles.noPhoto}>
              {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'ORG'}
            </div>
          )}
          <div className={styles.profileOverlay}>
            <FaCamera className={styles.cameraIcon} />
            <span>Edit Photo</span>
          </div>
        </div>
      </div>
      
      <div className={styles.orgDetailsSection}>
        <div className={styles.orgName}>
          <h3>{name || "Organization Name"}</h3>
        </div>
        <div className={styles.orgUsername}>
          <span>@{username || "username"}</span>
        </div>
        <div className={styles.orgBio}>
          <p>{bio || "No bio available"}</p>
        </div>

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
                onClick={() => window.open(`/organisation/${username}`, '_blank')}
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
            <button 
              onClick={() => {
                if (currentOrgPageId) {
                  router.push(`/create?from=organisation&pageId=${currentOrgPageId}&name=${encodeURIComponent(name || '')}&username=${encodeURIComponent(username || '')}`);
                } else {
                  router.push('/create');
                }
              }}
              className={styles.createButton}
            >
              Create
            </button>
          </div>
        )}
      </div>

      {editMode && (
        <div className={styles.editProfileContainer}>
          <div className={styles.inputGroup}>
            <label htmlFor="name">Organization Name:</label>
            <input
              id="name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter organization name"
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
            <label htmlFor="bio">Bio:</label>
            <textarea
              id="bio"
              value={newBio}
              onChange={(e) => setNewBio(e.target.value)}
              placeholder="Write a bio"
              className={styles.profileInput}
              rows={4}
            />
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

      <div className={styles.ownedEventsSection}>
        <div className={styles.sectionHeader}>
          <h3>🏢 Events & Activities</h3>
          <p>Manage your created events and collaborated events</p>
        </div>
        <div className={styles.orgDashboardSection}>
          <DashboardSection 
            pageId={currentOrgPageId || undefined} 
            pageType="organisation" 
          />
        </div>
      </div>

      {/* Content Sharing Modal */}
      {showSharingModal && currentOrgPageId && (
        <ContentSharingManager
          contentType="organization"
          contentId={currentOrgPageId}
          contentName={name || 'Organization Page'}
          onClose={() => setShowSharingModal(false)}
        />
      )}
    </div>
  );
};

export default OrganisationProfile; 