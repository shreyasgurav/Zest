'use client';

import React, { useEffect, useState, useRef } from "react";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { toast } from "react-toastify";
import { FaCamera, FaTimes, FaPlus, FaMusic, FaUser, FaAt, FaMapMarkerAlt, FaTag, FaEdit, FaPhone, FaShare, FaInstagram, FaTwitter, FaGlobe, FaEnvelope, FaCalendarAlt, FaPlusCircle } from 'react-icons/fa';
import ArtistProfileSkeleton from "./ArtistProfileSkeleton";
import DashboardSection from '@/shared/components/dashboard/Dashboard/DashboardSection/DashboardSection';
import PhotoUpload from '@/components/forms/PhotoUpload/PhotoUpload';
import LocationPicker from '@/components/forms/LocationPicker/LocationPicker';
import ContentSharingManager from '@/components/feedback/ContentSharingManager/ContentSharingManager';
import { getUserOwnedPages } from '@/domains/authentication/services/auth.service';
import { ContentSharingSecurity } from '@/shared/utils/security/contentSharingSecurity';
import { useRouter } from 'next/navigation';
import styles from "./ArtistProfile.module.css";

interface ArtistData {
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
  genre?: string;
  location?: string;
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

interface ArtistProfileProps {
  selectedPageId?: string | null;
}

const ArtistProfile: React.FC<ArtistProfileProps> = ({ selectedPageId }) => {
  const router = useRouter();
  const [artistDetails, setArtistDetails] = useState<ArtistData | null>(null);
  const [ownedArtistPages, setOwnedArtistPages] = useState<ArtistData[]>([]);
  const [currentArtistPageId, setCurrentArtistPageId] = useState<string | null>(null);
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
  const [genre, setGenre] = useState<string>("");
  const [newGenre, setNewGenre] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [newLocation, setNewLocation] = useState<string>("");
  const [photoURL, setPhotoURL] = useState<string>("");
  const [newPhotoURL, setNewPhotoURL] = useState<string>("");
  const [bannerImage, setBannerImage] = useState<string>("");
  const [newBannerImage, setNewBannerImage] = useState<string>("");
  const [usernameError, setUsernameError] = useState<string>("");
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Photo editing states
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState<boolean>(false);
  const [currentPhotoType, setCurrentPhotoType] = useState<'profile' | 'banner'>('profile');
  
  // Content sharing state
  const [showSharingModal, setShowSharingModal] = useState<boolean>(false);

  // Input validation helper
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Artist name is required';
        if (value.trim().length < 2) return 'Artist name must be at least 2 characters';
        if (value.trim().length > 100) return 'Artist name must be less than 100 characters';
        return '';
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 30) return 'Username must be less than 30 characters';
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username can only contain letters, numbers, underscores, and hyphens';
        return '';
      case 'bio':
        if (value.length > 500) return 'Bio must be less than 500 characters';
        return '';
      case 'genre':
        if (!value.trim()) return 'Category is required';
        if (value.trim().length < 2) return 'Category must be at least 2 characters';
        if (value.trim().length > 50) return 'Category must be less than 50 characters';
        return '';
      case 'location':
        if (value.trim() && value.trim().length < 2) return 'Location must be at least 2 characters';
        if (value.length > 100) return 'Location must be less than 100 characters';
        return '';
      default:
        return '';
    }
  };

  // Sanitize input helper
  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  };

  // Form validation check
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    errors.name = validateField('name', newName);
    errors.username = validateField('username', newUsername);
    errors.bio = validateField('bio', newBio);
    errors.genre = validateField('genre', newGenre);
    errors.location = validateField('location', newLocation);
    
    // Remove empty error messages
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });
    
    setFieldErrors(errors);
    const isValid = Object.keys(errors).length === 0 && !usernameError && !isCheckingUsername;
    setIsFormValid(isValid);
    return isValid;
  };

  const fetchArtistData = async (pageId: string) => {
    console.log("Fetching artist data for page:", pageId);
    try {
      const db = getFirestore();
      const artistDocRef = doc(db, "Artists", pageId);
      const docSnap = await getDoc(artistDocRef);
  
      if (docSnap.exists()) {
        console.log("Document exists in Firestore");
        const data = docSnap.data() as ArtistData;
        
        // Validate required fields
        if (!data.ownerId) {
          throw new Error("Artist page missing owner information");
        }
        
        setArtistDetails(data);
        setName(data.name || "");
        setNewName(data.name || "");
        setUsername(data.username || "");
        setNewUsername(data.username || "");
        setBio(data.bio || "");
        setNewBio(data.bio || "");
        setGenre(data.genre || "");
        setNewGenre(data.genre || "");
        setLocation(data.location || "");
        setNewLocation(data.location || "");
        setPhotoURL(data.photoURL || "");
        setNewPhotoURL(data.photoURL || "");
        setBannerImage(data.bannerImage || "");
        setNewBannerImage(data.bannerImage || "");
        
        // Clear any previous errors
        setError(null);
      } else {
        console.log("Document doesn't exist in Firestore");
        throw new Error("Artist page not found");
      }
    } catch (err) {
      console.error("Error in fetchArtistData:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Reset all data on error
      setArtistDetails(null);
      setName("");
      setNewName("");
      setUsername("");
      setNewUsername("");
      setBio("");
      setNewBio("");
      setGenre("");
      setNewGenre("");
      setLocation("");
      setNewLocation("");
      setPhotoURL("");
      setNewPhotoURL("");
      setBannerImage("");
      setNewBannerImage("");
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
      const currentUser = getAuth().currentUser;
      
      if (!currentUser) {
        setUsernameError("Please log in to check username availability");
        return false;
      }

      // Get current artist page ID
      const currentPageId = sessionStorage.getItem('selectedArtistPageId') || undefined;
      
      const result = await checkGlobalUsernameAvailability(
        username,
        undefined, // Don't exclude user ID since this is for artist page
        currentPageId,
        'artist'
      );
      
      if (!result.available) {
        const takenByMessage = result.takenBy === 'user' ? 'a user' :
                             result.takenBy === 'artist' ? 'another artist' :
                             result.takenBy === 'organisation' ? 'an organization' :
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
    
    // Clear previous timeout
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
    }
    
    // Validate input format first
    const formatError = validateField('username', newUsername);
    if (formatError) {
      setUsernameError(formatError);
      setIsCheckingUsername(false);
      validateForm();
      return;
    }
    
    // Don't check if it's the same as current username
    if (newUsername.toLowerCase() === username.toLowerCase()) {
      setIsCheckingUsername(false);
      validateForm();
      return;
    }
    
    // Debounce username availability check
    if (newUsername.length >= 3) {
      setIsCheckingUsername(true);
      const timeout = setTimeout(async () => {
        try {
          await checkUsernameAvailability(newUsername);
        } finally {
          setIsCheckingUsername(false);
          validateForm();
        }
      }, 800); // 800ms debounce
      
      setUsernameCheckTimeout(timeout);
    } else {
      setIsCheckingUsername(false);
      validateForm();
    }
  };

  // Add cleanup for timeout
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [usernameCheckTimeout]);

  useEffect(() => {
    const auth = getAuth();
    let isSubscribed = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      console.log("Auth state changed:", user?.uid);
      
      if (user && isSubscribed) {
        try {
            // Check if there's a specific artist page to load
            const sessionSelectedPageId = typeof window !== 'undefined' ? 
              sessionStorage.getItem('selectedArtistPageId') : null;
            
          // Priority: prop selectedPageId > session storage
            const pageIdToUse = selectedPageId || sessionSelectedPageId;
            
            if (pageIdToUse) {
            // Specific page requested - check access and load directly
            console.log(`🎵 Loading specific artist page: ${pageIdToUse}`);
            
            // Verify access to this specific page
            const permissions = await ContentSharingSecurity.verifyContentAccess('artist', pageIdToUse, user.uid);
            
            if (permissions.canView && permissions.role !== 'unauthorized') {
              console.log(`🔓 Access granted to artist page: ${pageIdToUse} with role: ${permissions.role}`);
              
              // Set user permissions for this page
              setUserPermissions({
                canEdit: permissions.canEdit,
                canManage: permissions.canManage,
                role: permissions.role
              });
              
              setCurrentArtistPageId(pageIdToUse);
              await fetchArtistData(pageIdToUse);
              
              // Clear session selection after using it
              if (sessionSelectedPageId) {
                sessionStorage.removeItem('selectedArtistPageId');
              }
            } else {
              console.log(`🚫 Access denied to artist page: ${pageIdToUse}`);
              setError("You don't have permission to access this artist page.");
              setLoading(false);
            }
          } else {
            // No specific page requested - load owned pages
            console.log("🎵 Loading owned artist pages");
            const ownedPages = await getUserOwnedPages(user.uid);
            setOwnedArtistPages(ownedPages.artists);
            
            if (ownedPages.artists.length > 0) {
              const pageToLoad = ownedPages.artists[0]; // Default to first page
              
              // Set owner permissions
              setUserPermissions({
                canEdit: true,
                canManage: true,
                role: 'owner'
              });
            
            setCurrentArtistPageId(pageToLoad.uid);
            await fetchArtistData(pageToLoad.uid);
          } else {
              // No owned artist pages - check if user has shared access to any artist pages
              const sharedContent = await ContentSharingSecurity.getUserSharedContent(user.uid);
              
              if (sharedContent.artists.length > 0) {
                // User has shared access to artist pages, but no specific page selected
                setError("Please select an artist page from your dropdown menu.");
                setLoading(false);
              } else {
                // No artist pages found at all
            setError("No artist pages found. Please create an artist page first.");
            setLoading(false);
              }
            }
          }
          
          // Always load owned pages for page switching functionality
          const ownedPages = await getUserOwnedPages(user.uid);
          setOwnedArtistPages(ownedPages.artists);
          
        } catch (err) {
          console.error("Error loading artist pages:", err);
          setError("Failed to load artist pages");
          setLoading(false);
        }
      } else if (!user) {
        setArtistDetails(null);
        setOwnedArtistPages([]);
        setCurrentArtistPageId(null);
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
      setError(null);
      
      // Validate form first
      if (!validateForm()) {
        toast.error("Please fix the form errors before saving");
        setLoading(false);
        return;
      }
      
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        setError("User not authenticated");
        toast.error("Please login to save profile");
        setLoading(false);
        return;
      }
  
      // Final username check if username was changed
      if (newUsername && newUsername.toLowerCase() !== username.toLowerCase()) {
        const isUsernameAvailable = await checkUsernameAvailability(newUsername);
        if (!isUsernameAvailable) {
          setLoading(false);
          return;
        }
      }
  
      const db = getFirestore();
      if (!currentArtistPageId) {
        setError("No artist page selected");
        toast.error("No artist page selected");
        setLoading(false);
        return;
      }
      
      const artistDocRef = doc(db, "Artists", currentArtistPageId);
      
      // Sanitize inputs before saving
      const sanitizedUpdates = {
        name: sanitizeInput(newName),
        username: newUsername.toLowerCase().trim(),
        bio: sanitizeInput(newBio),
        genre: sanitizeInput(newGenre),
        location: sanitizeInput(newLocation),
        photoURL: newPhotoURL,
        bannerImage: newBannerImage,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(artistDocRef, sanitizedUpdates);
      
      // Update local state with sanitized data
      const updatedArtistDetails = { ...artistDetails, ...sanitizedUpdates };
      setArtistDetails(updatedArtistDetails);
      setName(sanitizedUpdates.name);
      setUsername(sanitizedUpdates.username);
      setBio(sanitizedUpdates.bio);
      setGenre(sanitizedUpdates.genre);
      setLocation(sanitizedUpdates.location);
      setPhotoURL(sanitizedUpdates.photoURL);
      setBannerImage(sanitizedUpdates.bannerImage);
      
      // Reset form validation state
      setFieldErrors({});
      setUsernameError("");
      setEditMode(false);
      setIsFormValid(false);
      
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      let errorMessage = "Error saving profile";
      
      if (err instanceof Error) {
        if (err.message.includes('permission-denied')) {
          errorMessage = "You don't have permission to edit this profile";
        } else if (err.message.includes('network')) {
          errorMessage = "Network error. Please check your connection and try again";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Photo editing handlers
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
      const auth = getAuth();
      const user = auth.currentUser;
      if (user && currentArtistPageId) {
        const db = getFirestore();
        const artistDocRef = doc(db, "Artists", currentArtistPageId);
        const updateField = currentPhotoType === 'profile' ? 'photoURL' : 'bannerImage';
        await updateDoc(artistDocRef, {
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

  // Form field change handlers with validation
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewName(value);
    const error = validateField('name', value);
    setFieldErrors(prev => ({ ...prev, name: error }));
    validateForm();
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewGenre(value);
    const error = validateField('genre', value);
    setFieldErrors(prev => ({ ...prev, genre: error }));
    validateForm();
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewBio(value);
    const error = validateField('bio', value);
    setFieldErrors(prev => ({ ...prev, bio: error }));
    validateForm();
  };

  const handleLocationChange = (location: string) => {
    setNewLocation(location);
    const error = validateField('location', location);
    setFieldErrors(prev => ({ ...prev, location: error }));
    validateForm();
  };

  // Reset form to original values
  const handleCancelEdit = () => {
    setNewName(name);
    setNewUsername(username);
    setNewBio(bio);
    setNewGenre(genre);
    setNewLocation(location);
    setNewPhotoURL(photoURL);
    setNewBannerImage(bannerImage);
    setFieldErrors({});
    setUsernameError("");
    setIsFormValid(false);
    setEditMode(false);
    
    // Clear any pending username check
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
      setUsernameCheckTimeout(null);
    }
    setIsCheckingUsername(false);
  };

  // Enter edit mode with validation
  const handleEnterEditMode = () => {
    setEditMode(true);
    // Validate current values
    setTimeout(() => {
      validateForm();
    }, 100);
  };

  if (loading) {
    return <ArtistProfileSkeleton />;
  }

  if (error && !artistDetails) {
    return (
      <div className={styles.artistProfileContainer}>
        <div className={styles.noArtistPagesContainer}>
          <div className={styles.noArtistPagesCard}>
            <FaMusic className={styles.noArtistPagesIcon} />
            <h2>No Artist Pages Found</h2>
            <p>You haven't created any artist pages yet. Create your first artist page to start showcasing your talent!</p>
            <button 
              onClick={() => router.push('/business')}
              className={styles.createArtistPageButton}
            >
              <FaPlus className={styles.createIcon} />
              Create Artist Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.artistProfileContainer}>

      {/* Spotify-Style Banner Section */}
      <div className={styles.spotifyBanner}>
        {/* Banner Background */}
        <div 
          className={styles.bannerBackground}
          onClick={userPermissions.canEdit ? handleBannerClick : undefined} 
          style={{ cursor: userPermissions.canEdit ? 'pointer' : 'default' }}
        >
          {bannerImage ? (
            <img
              src={bannerImage}
              alt="Artist Banner"
              className={styles.bannerImage}
            />
          ) : (
            <div className={styles.defaultBannerGradient} />
          )}
          
          {/* Banner Overlay */}
          <div className={styles.bannerOverlay} />
          
          {/* Edit Banner Button */}
          {userPermissions.canEdit && (
          <div className={styles.bannerEditHover}>
            <FaCamera className={styles.editIcon} />
            <span>Edit Banner</span>
          </div>
          )}
        </div>

        {/* Artist Info at Bottom of Banner */}
        <div className={styles.artistInfoSection}>
          <div className={styles.artistContent}>
            {/* Large Avatar */}
            <div 
              className={styles.avatarContainer}
              onClick={userPermissions.canEdit ? handleProfilePhotoClick : undefined}
              style={{ cursor: userPermissions.canEdit ? 'pointer' : 'default' }}
            >
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt="Artist" 
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'ART'}
                </div>
              )}
              
              {/* Edit Avatar Overlay */}
              {userPermissions.canEdit && (
              <div className={styles.avatarEditOverlay}>
                <FaCamera className={styles.avatarEditIcon} />
              </div>
              )}
            </div>

            {/* Artist Details */}
            <div className={styles.artistDetails}>
              {/* Large Artist Name */}
              <h1 className={styles.artistName}>
                {name || "Artist Name"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Bio and Edit Section */}
      <div className={styles.contentSection}>
        {/* Artist Meta Information */}
        <div className={styles.artistMetaSection}>
          {username && (
            <span className={styles.username}>@{username}</span>
          )}
          {genre && (
            <span className={styles.genre}>{genre}</span>
          )}
        </div>

        {bio && (
          <div className={styles.bioSection}>
            <p>{bio}</p>
          </div>
        )}

        {/* Edit Profile Button */}
                  {!editMode && (
          <div className={styles.profileButtonsContainer}>
            {userPermissions.canEdit && (
            <button 
              onClick={handleEnterEditMode}
              className={styles.editProfileButton}
            >
              Edit Profile
            </button>
            )}
            {username && (
                              <button 
                onClick={() => window.open(`/artist/${username}`, '_blank')}
                className={styles.viewPublicButton}
              >
                View Page →
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
                  // Navigate to create page with artist context
                  if (currentArtistPageId) {
                    router.push(`/create?from=artist&pageId=${currentArtistPageId}&name=${encodeURIComponent(name || '')}&username=${encodeURIComponent(username || '')}`);
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
      </div>

      {/* Enhanced Edit Form */}
      {editMode && (
        <div className={styles.editProfileContainer}>
          <div className={styles.editHeader}>
            <h2>
              <FaEdit className={styles.editIcon} />
              Edit Artist Profile
            </h2>
            <p>Update your artist information to showcase your talent</p>
          </div>

          <div className={styles.editGrid}>
            <div className={styles.editColumn}>
              <div className={styles.modernInputGroup}>
                <label htmlFor="name">
                  <FaUser className={styles.inputIcon} />
                  Artist Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newName}
                  onChange={handleNameChange}
                  placeholder="Enter your artist name"
                  className={`${styles.modernInput} ${fieldErrors.name ? styles.inputError : ''}`}
                />
                {fieldErrors.name && <span className={styles.errorText}>{fieldErrors.name}</span>}
              </div>

              <div className={styles.modernInputGroup}>
                <label htmlFor="username">
                  <FaAt className={styles.inputIcon} />
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={handleUsernameChange}
                  placeholder="Choose a unique username"
                  className={`${styles.modernInput} ${usernameError || fieldErrors.username ? styles.inputError : ''}`}
                />
                {isCheckingUsername && (
                  <span className={styles.checkingText}>
                    <div className={styles.loadingDot}></div>
                    Checking availability...
                  </span>
                )}
                {usernameError && <span className={styles.errorText}>{usernameError}</span>}
                {fieldErrors.username && <span className={styles.errorText}>{fieldErrors.username}</span>}
              </div>

              <div className={styles.modernInputGroup}>
                <label htmlFor="genre">
                  <FaTag className={styles.inputIcon} />
                  Category
                </label>
                <input
                  id="genre"
                  type="text"
                  value={newGenre}
                  onChange={handleGenreChange}
                  placeholder="e.g., Musician, Actor, Painter"
                  className={`${styles.modernInput} ${fieldErrors.genre ? styles.inputError : ''}`}
                />
                {fieldErrors.genre && <span className={styles.errorText}>{fieldErrors.genre.replace('Genre', 'Category')}</span>}
              </div>
            </div>

            <div className={styles.editColumn}>
              <div className={styles.modernInputGroup}>
                <label>
                  <FaMapMarkerAlt className={styles.inputIcon} />
                  Location
                </label>
                <LocationPicker
                  value={newLocation}
                  onChange={handleLocationChange}
                  placeholder="Search for your location..."
                />
                {fieldErrors.location && <span className={styles.errorText}>{fieldErrors.location}</span>}
              </div>

              <div className={styles.modernInputGroup}>
                <label>
                  <FaPhone className={styles.inputIcon} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={artistDetails?.phoneNumber || ""}
                  className={`${styles.modernInput} ${styles.disabledInput}`}
                  placeholder="Phone number"
                  disabled
                />
                <span className={styles.helperText}>
                  <span>🔒 Phone number is linked to your account and cannot be changed</span>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.bioInputGroup}>
            <label htmlFor="bio">
              <FaEdit className={styles.inputIcon} />
              About You
            </label>
            <textarea
              id="bio"
              value={newBio}
              onChange={handleBioChange}
              placeholder="Tell your fans about your music journey, style, and what inspires you..."
              className={`${styles.modernTextarea} ${fieldErrors.bio ? styles.inputError : ''}`}
              rows={4}
            />
            <div className={styles.charCount}>
              {newBio.length}/500 characters
            </div>
            {fieldErrors.bio && <span className={styles.errorText}>{fieldErrors.bio}</span>}
          </div>

          <div className={styles.modernButtonGroup}>
            <button 
              onClick={handleCancelEdit}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveProfile}
              disabled={!isFormValid || isCheckingUsername || !!usernameError || loading || Object.keys(fieldErrors).some(key => fieldErrors[key])}
              className={styles.saveButton}
            >
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Saving...
                </>
              ) : (
                <>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

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
      {showSharingModal && currentArtistPageId && (
        <ContentSharingManager
          contentType="artist"
          contentId={currentArtistPageId}
          contentName={name || 'Artist Page'}
          onClose={() => setShowSharingModal(false)}
        />
      )}

      {/* Events & Activities Dashboard Section */}
      <div className={styles.ownedEventsSection}>
        <div className={styles.sectionHeader}>
          <h3>🎵 Events & Activities</h3>
          <p>Manage your created events and collaborated events</p>
        </div>
        <div className={styles.artistDashboardSection}>
          <DashboardSection pageId={currentArtistPageId || undefined} pageType="artist" />
        </div>
      </div>
    </div>
  );
};

export default ArtistProfile; 