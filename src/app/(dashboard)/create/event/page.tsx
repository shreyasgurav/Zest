'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from 'next/script';
import { FaMapMarkerAlt } from 'react-icons/fa';
// @ts-ignore
import PlacesAutocomplete, { Suggestion } from 'react-places-autocomplete';

// New structured imports
import { 
  CITIES,
  EVENT_CONFIG,
  GUIDE_OPTIONS,
  type EventCreator
} from '@/lib';

import {
  firestoreService,
  storageService,
  authService,
  auth as firebaseAuth,
  db,
  storage
} from '@/infrastructure';

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';

import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import {
  getAuth,
  onAuthStateChanged
} from 'firebase/auth';

import { getUserOwnedPages } from "@/domains/authentication/services/auth.service";
import { ContentSharingSecurity } from "@/shared/utils/security/contentSharingSecurity";
import styles from "./CreateEvent.module.css";

// Interface definitions for this component
interface SessionTicket {
  name: string;
  capacity: string;
  price: string;
}

interface EventSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  endDate?: string; // Optional end date - if different from start date
  tickets: SessionTicket[];
  maxCapacity?: number;
}

const CreateEvent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Authorization states
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>("");
  
  // Form states
  const [eventTitle, setEventTitle] = useState<string>("");
  const [eventVenue, setEventVenue] = useState<string>("");
  const [aboutEvent, setAboutEvent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [orgUsername, setOrgUsername] = useState<string>("");
  const [creatorInfo, setCreatorInfo] = useState<{
    type: string;
    pageId: string;
    name: string;
    username: string;
  } | null>(null);
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [eventLanguages, setEventLanguages] = useState<string>("");
  
  // SESSION-CENTRIC: Main sessions state
  const [eventSessions, setEventSessions] = useState<EventSession[]>([
    { 
      id: '1',
      date: '', 
      startTime: '', 
      endTime: '', 
      endDate: '',
      tickets: [{ name: '', capacity: '', price: '' }]
    }
  ]);
  
  const [address, setAddress] = useState('');
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [mapsScriptError, setMapsScriptError] = useState(false);
  const [guides, setGuides] = useState<{ [key: string]: string }>({});
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const [venueCoordinates, setVenueCoordinates] = useState<{
    lat: number;
    lng: number;
    formatted_address: string;
    place_id?: string;
    city?: string;
    country?: string;
  } | null>(null);
  
  const auth = getAuth();

  // Google Maps script loading
  useEffect(() => {
    // Check if Google Maps is already loaded globally
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps already loaded globally');
      setIsMapsScriptLoaded(true);
      return;
    }

    // Check if script was previously loaded but failed
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists in DOM');
      // Wait a bit and check again
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsMapsScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);

      // Clear interval after 10 seconds to prevent infinite checking
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isMapsScriptLoaded) {
          console.error('Google Maps failed to load after timeout');
          setMapsScriptError(true);
        }
      }, 10000);
    }
  }, []);

  // Authorization check
  useEffect(() => {
    const checkAuthorization = async (user: any) => {
      if (!user) {
        setAuthError("Please sign in to create events");
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get URL parameters for creator context
        const creatorType = searchParams?.get('from');
        const creatorPageId = searchParams?.get('pageId');
        const creatorName = searchParams?.get('name');
        const creatorUsername = searchParams?.get('username');

        // Verify user owns pages and has authorization to create events
        const ownedPages = await getUserOwnedPages(user.uid);
        
        if (creatorType && creatorPageId) {
          // Check if user owns the specific page they're creating from
          let hasSpecificPageAccess = false;
          let accessLevel = 'unauthorized';
          
          if (creatorType === 'organisation' || creatorType === 'organization') {
            hasSpecificPageAccess = ownedPages.organizations.some(org => org.uid === creatorPageId);
            if (hasSpecificPageAccess) accessLevel = 'owner';
          } else if (creatorType === 'artist') {
            hasSpecificPageAccess = ownedPages.artists.some(artist => artist.uid === creatorPageId);
            if (hasSpecificPageAccess) accessLevel = 'owner';
          } else if (creatorType === 'venue') {
            hasSpecificPageAccess = ownedPages.venues.some(venue => venue.uid === creatorPageId);
            if (hasSpecificPageAccess) accessLevel = 'owner';
          }

          // If not owned, check for shared access
          if (!hasSpecificPageAccess) {
            console.log(`🔍 User doesn't own ${creatorType} page ${creatorPageId}, checking shared access...`);
            
            try {
              const contentType = creatorType === 'organisation' || creatorType === 'organization' ? 'organization' : creatorType as 'artist' | 'venue';
              const permissions = await ContentSharingSecurity.verifyContentAccess(contentType, creatorPageId, user.uid);
              
              // Editor and Admin can create content
              if (permissions.canEdit && (permissions.role === 'editor' || permissions.role === 'admin' || permissions.role === 'owner')) {
                hasSpecificPageAccess = true;
                accessLevel = permissions.role;
                console.log(`✅ User has ${permissions.role} access to ${creatorType} page, can create events`);
              } else {
                console.log(`❌ User has ${permissions.role} access, insufficient for creating events`);
              }
            } catch (error) {
              console.error('Error checking shared access:', error);
            }
          }

          if (!hasSpecificPageAccess) {
            setAuthError(`You don't have permission to create events as ${creatorName}. You need at least Editor access to this ${creatorType} page.`);
            setIsAuthorized(false);
            setIsLoading(false);
            return;
          }
          
          console.log(`✅ User authorized to create events as ${creatorName} with ${accessLevel} access`);
        } else {
          // No specific creator context - check if user has any pages at all
          const hasAnyPages = ownedPages.artists.length > 0 || 
                             ownedPages.organizations.length > 0 || 
                             ownedPages.venues.length > 0;

          if (!hasAnyPages) {
            setAuthError("You need to create at least one page (Artist, Organization, or Venue) before you can create events.");
            setIsAuthorized(false);
            setIsLoading(false);
            return;
          }
        }

        setIsAuthorized(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking authorization:", error);
        setAuthError("Error verifying your permissions. Please try again.");
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, checkAuthorization);
    return () => unsubscribe();
  }, [searchParams]);

  useEffect(() => {
    const fetchCreatorDetails = async () => {
      if (!auth.currentUser) return;

      try {
        // Check if we have creator info from URL parameters
        const creatorType = searchParams?.get('from');
        const creatorPageId = searchParams?.get('pageId');
        const creatorName = searchParams?.get('name');
        const creatorUsername = searchParams?.get('username');

        if (creatorType && creatorPageId && creatorName && creatorUsername) {
          // Use creator info from URL parameters
          setCreatorInfo({
            type: creatorType,
            pageId: creatorPageId,
            name: decodeURIComponent(creatorName),
            username: decodeURIComponent(creatorUsername)
          });
          setOrgName(decodeURIComponent(creatorName));
          setOrgUsername(decodeURIComponent(creatorUsername));
        } else {
          // Fallback to organization lookup (legacy behavior)
          const orgDoc = await getDoc(doc(db(), "Organisations", auth.currentUser.uid));
          if (orgDoc.exists()) {
            const data = orgDoc.data();
            setOrgName(data.name || "");
            setOrgUsername(data.username || "");
            setCreatorInfo({
              type: 'organisation',
              pageId: auth.currentUser.uid,
              name: data.name || "",
              username: data.username || ""
            });
            localStorage.setItem('orgName', data.name || "");
            localStorage.setItem('orgUsername', data.username || "");
          }
        }
      } catch (error) {
        console.error("Error fetching creator details:", error);
      }
    };

    fetchCreatorDetails();
  }, [searchParams]);

  // SESSION MANAGEMENT FUNCTIONS
  const addSession = () => {
    const newSessionId = Date.now().toString();
    setEventSessions([...eventSessions, { 
      id: newSessionId,
      date: '', 
      startTime: '', 
      endTime: '', 
      endDate: '',
      tickets: [{ name: '', capacity: '', price: '' }]
    }]);
  };

  const removeSession = (sessionId: string) => {
    if (eventSessions.length === 1) {
      setMessage("You must have at least one session");
      return;
    }
    const newSessions = eventSessions.filter(session => session.id !== sessionId);
    setEventSessions(newSessions);
    setMessage("");
  };

  const handleSessionChange = (sessionId: string, field: keyof EventSession, value: any) => {
    const newSessions = eventSessions.map(session => 
      session.id === sessionId ? { ...session, [field]: value } : session
    );
    setEventSessions(newSessions);
  };

  const addSessionTicket = (sessionId: string) => {
    const newSessions = eventSessions.map(session => 
      session.id === sessionId 
        ? { ...session, tickets: [...session.tickets, { name: '', capacity: '', price: '' }] }
        : session
    );
    setEventSessions(newSessions);
  };

  const removeSessionTicket = (sessionId: string, ticketIndex: number) => {
    const newSessions = eventSessions.map(session => 
      session.id === sessionId 
        ? { ...session, tickets: session.tickets.filter((_, i) => i !== ticketIndex) }
        : session
    );
    setEventSessions(newSessions);
  };

  const handleSessionTicketChange = (sessionId: string, ticketIndex: number, field: keyof SessionTicket, value: string) => {
    const newSessions = eventSessions.map(session => 
      session.id === sessionId 
        ? { 
            ...session, 
            tickets: session.tickets.map((ticket, index) => 
              index === ticketIndex ? { ...ticket, [field]: value } : ticket
            )
          }
        : session
    );
    setEventSessions(newSessions);
  };

  const validateSessions = (): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (eventSessions.length === 0) {
      setMessage("You must have at least one session");
      return false;
    }
    
    for (let i = 0; i < eventSessions.length; i++) {
      const session = eventSessions[i];
      
      // Validate session time and date
      if (!session.date || !session.startTime || !session.endTime) {
        setMessage(`Session ${i + 1}: Please fill in all date and time fields`);
        return false;
      }

      const sessionDate = new Date(session.date);
      const endDate = session.endDate ? new Date(session.endDate) : sessionDate;
      const startDateTime = new Date(`${session.date} ${session.startTime}`);
      const endDateTime = new Date(`${session.endDate || session.date} ${session.endTime}`);
      
      // Check if dates are not in the past
      if (sessionDate < today) {
        setMessage(`Session ${i + 1}: Start date cannot be in the past`);
        return false;
      }

      if (session.endDate && endDate < today) {
        setMessage(`Session ${i + 1}: End date cannot be in the past`);
        return false;
      }
      
      // If end date is provided, check if it's after start date
      if (session.endDate && endDate < sessionDate) {
        setMessage(`Session ${i + 1}: End date must be after or same as start date`);
        return false;
      }
      
      // Check if end time is after start time (for same day or multi-day)
      if (endDateTime <= startDateTime) {
        if (session.endDate) {
          setMessage(`Session ${i + 1}: Event must end after it starts (check dates and times)`);
        } else {
          setMessage(`Session ${i + 1}: End time must be after start time`);
        }
        return false;
      }
      
      // Check if start time is not in the past (for today's events)
      if (sessionDate.getTime() === today.getTime() && startDateTime < now) {
        setMessage(`Session ${i + 1}: Start time cannot be in the past`);
        return false;
      }

      // Validate session tickets
      if (session.tickets.length === 0) {
        setMessage(`Session ${i + 1}: Must have at least one ticket type`);
        return false;
      }

      for (let j = 0; j < session.tickets.length; j++) {
        const ticket = session.tickets[j];
        if (!ticket.name.trim()) {
          setMessage(`Session ${i + 1}: Ticket ${j + 1} name is required`);
          return false;
        }
        if (!ticket.capacity || parseInt(ticket.capacity) <= 0) {
          setMessage(`Session ${i + 1}: Ticket ${j + 1} must have valid capacity`);
          return false;
        }
        if (!ticket.price || parseFloat(ticket.price) < 0) {
          setMessage(`Session ${i + 1}: Ticket ${j + 1} must have valid price`);
          return false;
        }
      }
    }
    
    setMessage(""); // Clear any validation errors
    return true;
  };

  // Other form handlers
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        setMessage("Image size should be less than 5MB");
        return;
      }
      setEventImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAddress = async (address: string, placeId?: string) => {
    setAddress(address);
    setEventVenue(address);
    setIsLocationFocused(false);
    
    // Get coordinates and additional details from Google Places API
    if (placeId && window.google && window.google.maps) {
      try {
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));
        
        service.getDetails({
          placeId: placeId,
          fields: ['geometry', 'formatted_address', 'address_components', 'place_id']
        }, (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const coordinates = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              formatted_address: place.formatted_address || address,
              place_id: placeId,
              city: extractCityFromAddressComponents(place.address_components),
              country: extractCountryFromAddressComponents(place.address_components)
            };
            
            setVenueCoordinates(coordinates);
            console.log('Venue coordinates captured:', coordinates);
          } else {
            console.warn('Failed to get place details:', status);
            // Fallback to geocoding if place details fail
            geocodeAddress(address);
          }
        });
      } catch (error) {
        console.error('Error getting place details:', error);
        geocodeAddress(address);
      }
    } else {
      // Fallback to geocoding if no placeId
      geocodeAddress(address);
    }
  };
  
  // Helper function to extract city from Google Places address components
  const extractCityFromAddressComponents = (components: any[]): string | undefined => {
    for (const component of components) {
      if (component.types.includes('locality') || 
          component.types.includes('administrative_area_level_1') ||
          component.types.includes('sublocality_level_1')) {
        return component.long_name;
      }
    }
    return undefined;
  };
  
  // Helper function to extract country from address components
  const extractCountryFromAddressComponents = (components: any[]): string | undefined => {
    for (const component of components) {
      if (component.types.includes('country')) {
        return component.long_name;
      }
    }
    return undefined;
  };
  
  // Fallback geocoding function
  const geocodeAddress = (address: string) => {
    if (!window.google || !window.google.maps) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any[], status: any) => {
      if (status === 'OK' && results[0]) {
        const result = results[0];
        const coordinates = {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          formatted_address: result.formatted_address || address,
          city: extractCityFromAddressComponents(result.address_components),
          country: extractCountryFromAddressComponents(result.address_components)
        };
        
        setVenueCoordinates(coordinates);
        console.log('Venue coordinates from geocoding:', coordinates);
      } else {
        console.warn('Geocoding failed:', status);
      }
    });
  };

  const handleGuideToggle = (id: string) => {
    setGuides(prev =>
      id in prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)) : { ...prev, [id]: '' }
    );
  };

  const handleGuideInput = (id: string, value: string) => {
    setGuides(prev => ({ ...prev, [id]: value }));
  };

  // Image upload function
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    try {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size should be less than 5MB");
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image");
      }

      // Create a unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `events/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storageRef = ref(storage(), fileName);

      // Set metadata with CORS-friendly content type
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser?.uid || 'unknown',
          uploadTime: new Date().toISOString()
        }
      };

      // Convert file to blob for better upload handling
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });

      // Upload with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to upload image...`);
          
          // Upload the blob
          const uploadResult = await uploadBytes(storageRef, blob, metadata);
          console.log('Upload successful:', uploadResult);

          // Get download URL
          const downloadURL = await getDownloadURL(uploadResult.ref);
          console.log('Download URL obtained:', downloadURL);
          
          return downloadURL;
        } catch (error: any) {
          console.error(`Upload attempt ${retryCount + 1} failed:`, error);
          
          if (retryCount === maxRetries - 1) {
            throw new Error(`Image upload failed after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          retryCount++;
        }
      }

      throw new Error('Upload failed after all retry attempts');
    } catch (error: any) {
      console.error('Error in uploadImage:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setMessage("Please sign in to create an event");
      return;
    }

    // Validate required fields
    if (!eventTitle.trim() || !eventVenue.trim() || selectedCategories.length === 0 || !aboutEvent.trim()) {
      setMessage("Please fill in all required fields and select at least one category");
      return;
    }

    // Validate sessions
    if (!validateSessions()) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let imageUrl: string | null = null;
      let imageUploadError = false;
      let imageUploadErrorMessage = '';

      // Try to upload image first if one is selected
      if (eventImage) {
        try {
          console.log('Starting image upload process...');
          imageUrl = await uploadImage(eventImage);
          console.log('Image upload completed successfully:', imageUrl);
        } catch (uploadError: any) {
          console.error('Image upload failed:', uploadError);
          imageUploadError = true;
          imageUploadErrorMessage = 'Image upload failed. The event will be created without an image. You can add an image later by editing the event.';
        }
      }

      // Prepare event data - SESSION-CENTRIC FORMAT
      const eventData = {
        // SESSION-CENTRIC FORMAT
        title: eventTitle.trim(),
        event_type: "event",
        architecture: "session-centric",
        sessions: eventSessions.map((session, index) => ({
          id: session.id,
          name: `Session ${index + 1}`,
          date: session.date,
          start_time: session.startTime,
          end_time: session.endTime,
          end_date: session.endDate || null, // Store end date if provided
          venue: eventVenue.trim(),
          description: '',
          tickets: session.tickets.map(ticket => ({
            name: ticket.name.trim(),
            capacity: parseInt(ticket.capacity),
            price: parseFloat(ticket.price),
            available_capacity: parseInt(ticket.capacity)
          })),
          available: true,
          maxCapacity: session.maxCapacity || session.tickets.reduce((sum, ticket) => sum + parseInt(ticket.capacity || '0'), 0)
        })),
        // Legacy compatibility fields
        time_slots: eventSessions.map(session => ({
          date: session.date,
          start_time: session.startTime,
          end_time: session.endTime,
          available: true,
          session_id: session.id
        })),
        tickets: eventSessions.length > 0 ? eventSessions[0].tickets.map(ticket => ({
          name: ticket.name.trim(),
          capacity: parseInt(ticket.capacity),
          price: parseFloat(ticket.price),
          available_capacity: parseInt(ticket.capacity)
        })) : [],
        event_venue: eventVenue.trim(),
        venue_type: 'global',
        venue_coordinates: venueCoordinates,
        about_event: aboutEvent.trim(),
        event_image: imageUrl,
        organizationId: auth.currentUser.uid,
        hosting_club: orgName,
        organization_username: orgUsername,
        event_categories: selectedCategories,
        event_languages: eventLanguages.trim(),
        event_guides: guides,
        // Session statistics
        total_sessions: eventSessions.length,
        total_capacity: eventSessions.reduce((sum, session) => 
          sum + session.tickets.reduce((ticketSum, ticket) => ticketSum + parseInt(ticket.capacity || '0'), 0), 0
        ),
        // Creator information
        creator: creatorInfo ? {
          type: creatorInfo.type, // 'artist', 'organisation', or 'venue'
          pageId: creatorInfo.pageId,
          name: creatorInfo.name,
          username: creatorInfo.username,
          userId: auth.currentUser.uid
        } : {
          type: 'organisation',
          pageId: auth.currentUser.uid,
          name: orgName,
          username: orgUsername,
          userId: auth.currentUser.uid
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        image_upload_status: imageUploadError ? 'failed' : (imageUrl ? 'success' : 'none')
      };

      console.log('Creating event with data:', { 
        ...eventData, 
        event_image: imageUrl ? 'URL present' : 'No image',
        image_upload_status: eventData.image_upload_status 
      });

      // Create event document
      const eventsCollectionRef = collection(db(), "events");
      const docRef = await addDoc(eventsCollectionRef, eventData);
      console.log('Event created with ID:', docRef.id);
      
      if (imageUploadError) {
        setMessage(`Event created successfully! Note: ${imageUploadErrorMessage} You can try uploading the image again later.`);
      } else {
        setMessage("Event created successfully!");
      }

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
        router.refresh(); // Force a refresh of the page data
      }, 2000);

    } catch (error: any) {
      console.error("Error creating event:", error);
      const errorMessage = error.message || "An unexpected error occurred";
      setMessage(`Failed to create event: ${errorMessage}`);
      
      // If it's a validation error, scroll to the top
      if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.createEventPage}>
        <div className={styles.createEventContainer}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '200px',
            color: '#aeadad'
          }}>
            Verifying permissions...
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div className={styles.createEventPage}>
        <div className={styles.unauthorizedMessageContainer}>
          <div className={styles.unauthorizedMessage}>
            <h1>Access Denied</h1>
            <p>{authError}</p>
            <button 
              onClick={() => router.push("/business")}
              className={styles.backButton}
            >
              Create Your First Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createEventPage}>
      <div className={styles.createEventContainer}>
        <h1 className={styles.pageTitle}>
          Create Event
          {creatorInfo && (
            <span className={styles.creatorInfo}>
              as {creatorInfo.name} ({creatorInfo.type})
            </span>
          )}
        </h1>
        
        <form onSubmit={handleSubmit} className={styles.createEventForm}>
          {/* Image Upload Section */}
          <div className={styles.formSection}>
            <h2>Event Profile Image</h2>
            <label htmlFor="event-image-upload" className={styles.imageUploadBox}>
              <span className={styles.imageUploadLabel}>
                {imagePreview ? 'Change Event Image' : 'Click to upload event profile image'}
              </span>
              {imagePreview && (
                <div className={styles.imagePreview}>
                  <img src={imagePreview} alt="Preview" className={styles.imagePreviewImg} />
                </div>
              )}
              <input
                id="event-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.fileInput}
              />
            </label>
            <p className={styles.imageTip}>Please upload a square image for best results (max 5MB)</p>
          </div>

          {/* Event Details */}
          <div className={styles.formSection}>
            <h2>Event Details</h2>
            <div className={styles.formGroup}>
              <label>Event Name</label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Event Categories</label>
              <div className={styles.categoriesGrid}>
                {EVENT_CONFIG.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`${styles.categoryButton} ${selectedCategories.includes(category.id) ? styles.categoryButtonActive : ''}`}
                    onClick={() => handleCategoryChange(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              {selectedCategories.length === 0 && (
                <p className={styles.errorText}>Please select at least one category</p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Event Description</label>
              <textarea
                value={aboutEvent}
                onChange={(e) => setAboutEvent(e.target.value)}
                placeholder="Tell people what your event is about..."
                rows={4}
                required
              />
            </div>
          </div>

          {/* Location */}
          <div className={styles.formSection}>
            <h2>Location</h2>
            <div className={styles.formGroup}>
              <label>Event Venue</label>
              {!isMapsScriptLoaded && !mapsScriptError && (
                <Script
                  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                  strategy="afterInteractive"
                  onLoad={() => {
                    console.log('Google Maps script loaded successfully');
                    setIsMapsScriptLoaded(true);
                    setMapsScriptError(false);
                  }}
                  onError={(e) => {
                    console.error('Google Maps script failed to load:', e);
                    setMapsScriptError(true);
                    setIsMapsScriptLoaded(false);
                  }}
                />
              )}
              {isMapsScriptLoaded ? (
                <PlacesAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={(address: string, placeId: string) => handleSelectAddress(address, placeId)}
                >
                  {(props: {
                    getInputProps: (options: any) => any;
                    suggestions: Suggestion[];
                    getSuggestionItemProps: (suggestion: Suggestion, options?: any) => any;
                    loading: boolean;
                  }) => {
                    const { getInputProps, suggestions, getSuggestionItemProps, loading } = props;
                    return (
                      <div style={{ position: 'relative' }}>
                        <input
                          {...getInputProps({
                            placeholder: 'Where will your event take place?',
                            className: styles.locationInput,
                            required: true,
                            onFocus: () => setIsLocationFocused(true),
                            onBlur: () => setTimeout(() => setIsLocationFocused(false), 150),
                          })}
                        />
                        {isLocationFocused && suggestions.length > 0 && (
                          <div className={styles.autocompleteDropdown}>
                            {loading && <div className={styles.suggestionItem}>Loading...</div>}
                            {suggestions.map((suggestion: Suggestion) => {
                              const className = suggestion.active
                                ? styles.suggestionItemActive
                                : styles.suggestionItem;
                              const main = suggestion.structured_formatting?.main_text || suggestion.description;
                              const secondary = suggestion.structured_formatting?.secondary_text;
                              return (
                                <div
                                  {...getSuggestionItemProps(suggestion, { className })}
                                  key={suggestion.placeId}
                                >
                                  <span className={styles.locationIcon}><FaMapMarkerAlt /></span>
                                  <span>
                                    <span className={styles.suggestionMain}>{main}</span>
                                    {secondary && (
                                      <div className={styles.suggestionSecondary}>{secondary}</div>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }}
                </PlacesAutocomplete>
              ) : mapsScriptError ? (
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setEventVenue(e.target.value);
                  }}
                  placeholder="Where will your event take place?"
                  className={styles.locationInput}
                  required
                />
              ) : (
                <input
                  type="text"
                  placeholder="Loading Google Maps..."
                  disabled
                  className={styles.locationInput}
                />
              )}
            </div>
          </div>

          {/* Event Sessions */}
          <div className={styles.formSection}>
            <h2>Event Sessions</h2>
            <p className={styles.sectionDescription}>Set up your event sessions, timing, and ticketing</p>
            <div className={styles.sessionsBuilder}>
              {eventSessions.map((session, sessionIndex) => (
                <div key={session.id} className={styles.sessionCard}>
                  <div className={styles.sessionHeader}>
                    <h4>Session {sessionIndex + 1}</h4>
                    {eventSessions.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeSessionButton}
                        onClick={() => removeSession(session.id)}
                      >
                        Remove Session
                      </button>
                    )}
                  </div>

                  {/* Session Timing */}
                  <div className={styles.sessionTiming}>
                    <div className={styles.formGroup}>
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={session.date}
                        onChange={(e) => handleSessionChange(session.id, 'date', e.target.value)}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>End Date (Optional)</label>
                      <input
                        type="date"
                        value={session.endDate || ''}
                        onChange={(e) => handleSessionChange(session.id, 'endDate', e.target.value)}
                        min={session.date} // End date can't be before start date
                        placeholder="Leave empty for same day"
                      />
                      <small style={{ color: '#888', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Leave empty for same-day events. Fill for multi-day events like treks or conferences.
                      </small>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={session.startTime}
                        onChange={(e) => handleSessionChange(session.id, 'startTime', e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>End Time</label>
                      <input
                        type="time"
                        value={session.endTime}
                        onChange={(e) => handleSessionChange(session.id, 'endTime', e.target.value)}
                        required
                      />
                    </div>

                    {/* Duration Display */}
                    {session.date && session.startTime && session.endTime && (
                      <div className={styles.durationDisplay}>
                        <span className={styles.durationLabel}>Duration:</span>
                        <span className={styles.durationValue}>
                          {(() => {
                            const startDate = new Date(session.date);
                            const endDate = session.endDate 
                              ? new Date(session.endDate) 
                              : startDate;
                            const startDateTime = new Date(`${session.date} ${session.startTime}`);
                            const endDateTime = new Date(`${session.endDate || session.date} ${session.endTime}`);
                            
                            if (endDateTime > startDateTime) {
                              const diffMs = endDateTime.getTime() - startDateTime.getTime();
                              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                              const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                              
                              if (diffDays > 0) {
                                return `${diffDays} day${diffDays > 1 ? 's' : ''}, ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
                              } else if (diffHours > 0) {
                                return `${diffHours} hour${diffHours !== 1 ? 's' : ''}, ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
                              } else {
                                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
                              }
                            }
                            return 'Invalid duration';
                          })()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Session Tickets */}
                  <div className={styles.sessionTickets}>
                    <h5>Session Tickets</h5>
                    {session.tickets.map((ticket, ticketIndex) => (
                      <div key={ticketIndex} className={styles.ticketRow}>
                        <div className={styles.formGroup}>
                          <label>Ticket Name</label>
                          <input
                            type="text"
                            value={ticket.name}
                            onChange={(e) => handleSessionTicketChange(session.id, ticketIndex, 'name', e.target.value)}
                            placeholder="e.g., General, VIP, Student"
                            required
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Capacity</label>
                          <input
                            type="number"
                            value={ticket.capacity}
                            onChange={(e) => handleSessionTicketChange(session.id, ticketIndex, 'capacity', e.target.value)}
                            placeholder="Number"
                            min="1"
                            required
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Price (₹)</label>
                          <input
                            type="number"
                            value={ticket.price}
                            onChange={(e) => handleSessionTicketChange(session.id, ticketIndex, 'price', e.target.value)}
                            placeholder="Price"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        {session.tickets.length > 1 && (
                          <button
                            type="button"
                            className={styles.removeTicketButton}
                            onClick={() => removeSessionTicket(session.id, ticketIndex)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.addTicketButton}
                      onClick={() => addSessionTicket(session.id)}
                    >
                      Add Ticket Type
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={styles.addSessionButton}
                onClick={addSession}
              >
                Add Another Session
              </button>
            </div>
          </div>

          {/* Event Summary */}
          <div className={styles.formSection}>
            <h2>Event Summary</h2>
            <div className={styles.eventSummary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total Sessions:</span>
                <span className={styles.summaryValue}>{eventSessions.length}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total Capacity:</span>
                <span className={styles.summaryValue}>
                  {eventSessions.reduce((sum, session) => 
                    sum + session.tickets.reduce((ticketSum, ticket) => 
                      ticketSum + (parseInt(ticket.capacity) || 0), 0), 0
                  )}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Expected Revenue:</span>
                <span className={styles.summaryValue}>
                  ₹{eventSessions.reduce((sum, session) => 
                    sum + session.tickets.reduce((ticketSum, ticket) => 
                      ticketSum + ((parseInt(ticket.capacity) || 0) * (parseFloat(ticket.price) || 0)), 0), 0
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Event Information */}
          <div className={styles.formSection}>
            <h2>Event Information</h2>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Languages</label>
                <input
                  type="text"
                  value={eventLanguages}
                  onChange={(e) => setEventLanguages(e.target.value)}
                  placeholder="e.g., English, Hindi, Local language"
                />
              </div>
            </div>
          </div>

          {/* Event Guides */}
          <div className={styles.formSection}>
            <h2>Additional Information (Optional)</h2>
            <div className={styles.guidesGrid}>
              {GUIDE_OPTIONS.map(option => (
                <div key={option.id} className={styles.guideRow}>
                  <label className={styles.guideCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={option.id in guides}
                      onChange={() => handleGuideToggle(option.id)}
                    />
                    {option.label}
                  </label>
                  {option.id in guides && (
                    <input
                      type="text"
                      className={styles.guideInput}
                      placeholder={option.placeholder}
                      value={guides[option.id]}
                      onChange={e => handleGuideInput(option.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {message && (
            <div className={`${styles.message} ${message.includes("success") ? styles.success : styles.error}`}>
              {message}
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Creating Event..." : "Create Event"}
            </button>
            <button 
              type="button" 
              className={styles.cancelButton} 
              onClick={() => router.push('/')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent; 