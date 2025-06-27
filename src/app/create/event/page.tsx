'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard/RoleGuard";
import { getUserOwnedPages } from "@/utils/authHelpers";
import styles from "./CreateEvent.module.css";
// @ts-ignore
import PlacesAutocomplete, { Suggestion } from 'react-places-autocomplete';
import Script from 'next/script';
import { FaMapMarkerAlt } from 'react-icons/fa';
import LocationSelector from '@/components/LocationSelector/LocationSelector';
import StepIndicator from '@/components/StepIndicator/StepIndicator';


// A more extensive list of cities for better search results
const ALL_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur',
    'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna',
    'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali',
    'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad',
    'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota',
    'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad', 'Mysore', 'Tiruchirappalli', 'Bareilly', 'Aligarh',
    'Tiruppur', 'Gurgaon', 'Moradabad', 'Jalandhar', 'Bhubaneswar', 'Salem', 'Warangal', 'Guntur', 'Noida',
    'Dehradun', 'Kochi'
];

interface EventSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  tickets: SessionTicket[];
  maxCapacity?: number;
}

interface SessionTicket {
  name: string;
  capacity: string;
  price: string;
}

interface EventSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface Ticket {
  name: string;
  capacity: string;
  price: string;
}

const EVENT_CATEGORIES = [
  { id: 'music', label: 'Music' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'clubbing', label: 'Clubbing' },
  { id: 'party', label: 'Party' },
  { id: 'art', label: 'Art' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'sports', label: 'Sports' }
];

const GUIDE_OPTIONS = [
  { id: 'duration', label: 'Duration', placeholder: 'e.g., 2 hours' },
  { id: 'age_requirement', label: 'Age Requirement', placeholder: 'e.g., 16+ years' },
  { id: 'language', label: 'Language', placeholder: 'e.g., Hindi, English' },
  { id: 'seating', label: 'Seating Arrangement', placeholder: 'e.g., Theater, Round Table' },
  { id: 'kid_friendly', label: 'Kid Friendly', placeholder: 'e.g., Yes/No or details' },
  { id: 'pet_friendly', label: 'Pet Friendly', placeholder: 'e.g., Yes/No or details' },
  { id: 'wheelchair', label: 'Wheelchair Accessible', placeholder: 'e.g., Yes/No or details' },
  { id: 'parking', label: 'Parking Available', placeholder: 'e.g., Yes/No or details' },
  { id: 'food', label: 'Food & Beverages', placeholder: 'e.g., Snacks, Dinner, Drinks' },
  { id: 'outdoor', label: 'Outdoor Event', placeholder: 'e.g., Yes/No or details' },
  { id: 'indoor', label: 'Indoor Event', placeholder: 'e.g., Yes/No or details' },
  { id: 'dress_code', label: 'Dress Code', placeholder: 'e.g., Formal, Casual' },
  { id: 'photography', label: 'Photography Allowed?', placeholder: 'e.g., Yes/No or details' },
  { id: 'alcohol', label: 'Alcohol allowed?', placeholder: 'e.g., Yes/No or details' },
];

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
  
  // Slide navigation
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const totalSlides = 2;
  const [creatorInfo, setCreatorInfo] = useState<{
    type: string;
    pageId: string;
    name: string;
    username: string;
    profileImage?: string;
  } | null>(null);
  const [profileImageError, setProfileImageError] = useState<boolean>(false);
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [eventLanguages, setEventLanguages] = useState<string>("");
  
  // SESSION-CENTRIC: Replace eventSlots and tickets with sessions
  const [eventSessions, setEventSessions] = useState<EventSession[]>([
    { 
      id: '1',
      date: '', 
      startTime: '', 
      endTime: '', 
      tickets: [{ name: '', capacity: '', price: '' }]
    }
  ]);

  
  // Legacy support for old format
  const [eventSlots, setEventSlots] = useState<EventSlot[]>([
    { date: '', startTime: '', endTime: '' }
  ]);
  const [tickets, setTickets] = useState<Ticket[]>([
    { name: '', capacity: '', price: '' }
  ]);
  const [isLegacyMode, setIsLegacyMode] = useState<boolean>(false);
  
  const [address, setAddress] = useState('');
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [mapsScriptError, setMapsScriptError] = useState(false);
  const [guides, setGuides] = useState<{ [key: string]: string }>({});
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  
  const auth = getAuth();

  // Slide navigation functions
  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      // Validate current slide before proceeding
      if (currentSlide === 1 && !validateSlide1()) {
        return;
      }
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const validateSlide1 = (): boolean => {
    if (!eventTitle.trim()) {
      setMessage("Please enter an event name");
      return false;
    }
    
    if (selectedCategories.length === 0) {
      setMessage("Please select at least one event category");
      return false;
    }
    
    if (!eventVenue.trim()) {
      setMessage("Please enter a venue location");
      return false;
    }
    
    if (!aboutEvent.trim()) {
      setMessage("Please provide a description for your event");
      return false;
    }
    
    setMessage("");
    return true;
  };

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
          // Verify user owns the specific page they're creating from
          let hasSpecificPageAccess = false;
          
          if (creatorType === 'organisation' || creatorType === 'organization') {
            hasSpecificPageAccess = ownedPages.organizations.some(org => org.uid === creatorPageId);
          } else if (creatorType === 'artist') {
            hasSpecificPageAccess = ownedPages.artists.some(artist => artist.uid === creatorPageId);
          } else if (creatorType === 'venue') {
            hasSpecificPageAccess = ownedPages.venues.some(venue => venue.uid === creatorPageId);
          }

          if (!hasSpecificPageAccess) {
            setAuthError(`You don't have permission to create events as ${creatorName}. Please ensure you own this ${creatorType} page.`);
            setIsAuthorized(false);
            setIsLoading(false);
            return;
          }
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
          // Fetch profile image based on creator type
          let profileImage = '';
          try {
            let collectionName = '';
            if (creatorType === 'organisation' || creatorType === 'organization') {
              collectionName = 'Organisations';
            } else if (creatorType === 'artist') {
              collectionName = 'Artists';
            } else if (creatorType === 'venue') {
              collectionName = 'Venues';
            }
            
            if (collectionName) {
              const profileDoc = await getDoc(doc(db, collectionName, creatorPageId));
              if (profileDoc.exists()) {
                const profileData = profileDoc.data();
                profileImage = profileData.profileImage || profileData.profile_image || '';
              }
            }
          } catch (imageError) {
            console.log("Could not fetch profile image:", imageError);
          }

          // Use creator info from URL parameters
          setCreatorInfo({
            type: creatorType,
            pageId: creatorPageId,
            name: decodeURIComponent(creatorName),
            username: decodeURIComponent(creatorUsername),
            profileImage: profileImage
          });
          setOrgName(decodeURIComponent(creatorName));
          setOrgUsername(decodeURIComponent(creatorUsername));
          setProfileImageError(false);
        } else {
          // Fallback to organization lookup (legacy behavior)
          const orgDoc = await getDoc(doc(db, "Organisations", auth.currentUser.uid));
          if (orgDoc.exists()) {
            const data = orgDoc.data();
            setOrgName(data.name || "");
            setOrgUsername(data.username || "");
            setCreatorInfo({
              type: 'organisation',
              pageId: auth.currentUser.uid,
              name: data.name || "",
              username: data.username || "",
              profileImage: data.profileImage || data.profile_image || ""
            });
            localStorage.setItem('orgName', data.name || "");
            localStorage.setItem('orgUsername', data.username || "");
            setProfileImageError(false);
          }
        }
      } catch (error) {
        console.error("Error fetching creator details:", error);
      }
    };

    fetchCreatorDetails();
  }, [searchParams]);

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

  // SESSION MANAGEMENT FUNCTIONS
  const addSession = () => {
    const newSessionId = Date.now().toString();
    setEventSessions([...eventSessions, { 
      id: newSessionId,
      date: '', 
      startTime: '', 
      endTime: '', 
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
    
    return eventSessions.every(session => {
      // Validate session time and date
      if (!session.date || !session.startTime || !session.endTime) {
        return false;
      }
      
      const sessionDate = new Date(session.date);
      const startDateTime = new Date(`${session.date} ${session.startTime}`);
      const endDateTime = new Date(`${session.date} ${session.endTime}`);
      
      // Check if date is not in the past
      if (sessionDate < today) {
        return false;
      }
      
      // Check if end time is after start time
      if (endDateTime <= startDateTime) {
        return false;
      }
      
      // Check if start time is not in the past (for today's events)
      if (sessionDate.getTime() === today.getTime() && startDateTime < now) {
        return false;
      }

      // Validate session tickets
      if (session.tickets.length === 0) {
        return false;
      }

      return session.tickets.every(ticket => 
        ticket.name.trim() && 
        ticket.capacity && 
        ticket.price && 
        parseInt(ticket.capacity) > 0 && 
        parseFloat(ticket.price) >= 0
      );
    });
  };

  // Toggle between legacy and session-centric modes
  const toggleMode = () => {
    setIsLegacyMode(!isLegacyMode);
    if (!isLegacyMode) {
      // Convert sessions to legacy format
      if (eventSessions.length > 0) {
        const firstSession = eventSessions[0];
        setEventSlots([{ 
          date: firstSession.date, 
          startTime: firstSession.startTime, 
          endTime: firstSession.endTime 
        }]);
        setTickets(firstSession.tickets.map(t => ({ ...t })));
      }
          } else {
        // Convert legacy format to sessions
        if (eventSlots.length > 0 && tickets.length > 0) {
          const firstSlot = eventSlots[0];
          setEventSessions([{
            id: '1',
            date: firstSlot.date,
            startTime: firstSlot.startTime,
            endTime: firstSlot.endTime,
            tickets: tickets.map(t => ({ ...t }))
          }]);
        }
      }
  };

  // Ticket management functions
  const addTicketType = () => {
    setTickets([...tickets, { name: '', capacity: '', price: '' }]);
  };

  const removeTicketType = (index: number) => {
    const newTickets = tickets.filter((_, i) => i !== index);
    setTickets(newTickets);
  };

  const handleTicketChange = (index: number, field: keyof Ticket, value: string) => {
    const newTickets = [...tickets];
    newTickets[index][field] = value;
    setTickets(newTickets);
  };

  const validateTickets = (): boolean => {
    return tickets.every(ticket => 
      ticket.name && 
      ticket.capacity && 
      ticket.price && 
      parseInt(ticket.capacity) > 0 && 
      parseFloat(ticket.price) >= 0
    );
  };

  // Time slot functions
  const addTimeSlot = () => {
    setEventSlots([...eventSlots, { date: '', startTime: '', endTime: '' }]);
  };

  const removeTimeSlot = (index: number) => {
    const newSlots = eventSlots.filter((_, i) => i !== index);
    setEventSlots(newSlots);
  };

  const handleSlotChange = (index: number, field: keyof EventSlot, value: string) => {
    const newSlots = [...eventSlots];
    newSlots[index][field] = value;
    setEventSlots(newSlots);
  };

  const validateSlots = (): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return eventSlots.every(slot => {
      if (!slot.date || !slot.startTime || !slot.endTime) {
        return false;
      }
      
      const slotDate = new Date(slot.date);
      const startDateTime = new Date(`${slot.date} ${slot.startTime}`);
      const endDateTime = new Date(`${slot.date} ${slot.endTime}`);
      
      // Check if date is not in the past
      if (slotDate < today) {
        return false;
      }
      
      // Check if end time is after start time
      if (endDateTime <= startDateTime) {
        return false;
      }
      
      // Check if start time is not in the past (for today's events)
      if (slotDate.getTime() === today.getTime() && startDateTime < now) {
        return false;
      }
      
      return true;
    });
  };

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
      const storageRef = ref(storage, fileName);

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

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAddress = (address: string) => {
    setAddress(address);
    setEventVenue(address);
    
    // Extract city from the address
    const addressParts = address.split(',');
    if (addressParts.length >= 2) {
      // Try to find a city name from the address parts
      // Usually the city is one of the later parts in Google Places results
      for (let i = addressParts.length - 3; i >= 0; i--) {
        const part = addressParts[i].trim();
        // Check if this part might be a city (not a postal code or country)
        if (part && !/^\d+$/.test(part) && part.length > 2) {
          // Check if it matches any of our known cities
          const matchedCity = ALL_CITIES.find((city: string) => 
            city.toLowerCase().includes(part.toLowerCase()) || 
            part.toLowerCase().includes(city.toLowerCase())
          );
          if (matchedCity) {
            setSelectedCity(matchedCity);
            break;
          } else {
            // If no exact match, use the first valid part as city
            setSelectedCity(part);
            break;
          }
        }
      }
    }
    
    setIsLocationFocused(false);
  };

  const handleGuideToggle = (id: string) => {
    setGuides(prev =>
      id in prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)) : { ...prev, [id]: '' }
    );
  };

  const handleGuideInput = (id: string, value: string) => {
    setGuides(prev => ({ ...prev, [id]: value }));
  };

  // 🚀 NEW ARCHITECTURE: Clean sessions-based event structure
  const createNewEventData = (imageUrl: string | null, imageUploadError: boolean) => {
    const currentTimestamp = serverTimestamp();
    const currentUser = auth.currentUser!;
    
    // Helper to create ISO timestamp from date and time
    const createISOTimestamp = (date: string, time: string) => {
      const datetime = new Date(`${date}T${time}:00`);
      return datetime.toISOString();
    };

    // 🎯 Convert to NEW sessions structure
    const newSessions = isLegacyMode 
      ? convertLegacyToNewSessions()
      : convertSessionCentricToNew();

    function convertLegacyToNewSessions() {
      return eventSlots.map((slot, index) => {
        const sessionTickets = tickets.map((ticket) => ({
          name: ticket.name.trim(),
          price: parseFloat(ticket.price),
          capacity: parseInt(ticket.capacity),
          available_capacity: parseInt(ticket.capacity)
        }));

        return {
          sessionId: `session_${String(index + 1).padStart(3, '0')}`,
          title: eventSlots.length === 1 ? "Main Event" : `Session ${index + 1}`,
          start_time: createISOTimestamp(slot.date, slot.startTime),
          end_time: createISOTimestamp(slot.date, slot.endTime),
          tickets: sessionTickets
        };
      });
    }

    function convertSessionCentricToNew() {
      return eventSessions.map((session, index) => {
        const sessionTickets = session.tickets.map((ticket) => ({
          name: ticket.name.trim(),
          price: parseFloat(ticket.price),
          capacity: parseInt(ticket.capacity),
          available_capacity: parseInt(ticket.capacity)
        }));

        return {
          sessionId: session.id,
          title: `Session ${index + 1}`,
          start_time: createISOTimestamp(session.date, session.startTime),
          end_time: createISOTimestamp(session.date, session.endTime),
          tickets: sessionTickets
        };
      });
    }

    // 📊 Build new event document with clean structure
    return {
      // === CORE FIELDS ===
      title: eventTitle.trim(),
      about_event: aboutEvent.trim(),
      event_type: "event" as const,
      event_venue: eventVenue.trim(),
      event_image: imageUrl,
      event_categories: selectedCategories,
      event_languages: eventLanguages.trim(),
      event_guides: guides,
      
      // === CREATOR INFO ===
      creator: creatorInfo ? {
        type: creatorInfo.type,
        pageId: creatorInfo.pageId,
        name: creatorInfo.name,
        username: creatorInfo.username,
        userId: currentUser.uid
      } : {
        type: 'organisation',
        pageId: currentUser.uid,
        name: orgName,
        username: orgUsername,
        userId: currentUser.uid
      },
      
      // 🎯 NEW SESSIONS STRUCTURE (Clean & Simple)
      sessions: newSessions,
      
      // === ORGANIZATION INFO ===
      organizationId: currentUser.uid,
      hosting_club: orgName,
      organization_username: orgUsername,
      
      // === STATUS & METADATA ===
      status: 'active' as const,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
      image_upload_status: imageUploadError ? 'failed' as const : (imageUrl ? 'success' as const : 'none' as const)
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setMessage("Please sign in to create an event");
      return;
    }

    // Comprehensive validation with specific error messages
    if (!eventTitle.trim()) {
      setMessage("Please enter an event name");
      return;
    }
    
    if (!eventVenue.trim()) {
      setMessage("Please enter a venue location");
      return;
    }
    
    if (selectedCategories.length === 0) {
      setMessage("Please select at least one event category");
      return;
    }
    
    // Validate based on mode
    if (isLegacyMode) {
      if (!validateTickets()) {
        setMessage("Please ensure all ticket types have valid names, capacities (greater than 0), and prices (0 or greater)");
        return;
      }
      
      if (!validateSlots()) {
        setMessage("Please ensure all time slots have valid dates (not in the past), start times, and end times (end time must be after start time)");
        return;
      }
    } else {
      if (!validateSessions()) {
        setMessage("Please ensure all sessions have valid details: date, time slots, and at least one ticket type with valid capacity and pricing");
        return;
      }
    }
    
    if (!aboutEvent.trim()) {
      setMessage("Please provide a description for your event");
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

      // 🚀 NEW ARCHITECTURE: Clean sessions-based structure
      const eventData = createNewEventData(imageUrl, imageUploadError);

      console.log('✅ Creating NEW event:', { 
        title: eventData.title,
        sessions: eventData.sessions.length,
        event_venue: eventData.event_venue,
        event_image: imageUrl ? 'URL present' : 'No image',
        image_upload_status: eventData.image_upload_status 
      });

      // Create event document
      const eventsCollectionRef = collection(db, "events");
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
      setMessage(`Failed to create event: ${error.message}`);
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
        {/* Header Row - Step Indicator */}
        <div className={styles.headerRow}>
          <StepIndicator 
            steps={[
              { id: 1, title: 'Event Details', description: 'Basic information about your event' },
              { id: 2, title: 'Event Structure', description: 'Sessions, tickets, and scheduling' }
            ]}
            currentStep={currentSlide}
          />
        </div>
        
        <form onSubmit={handleSubmit} className={styles.createEventForm}>

          {/* Slide Content */}
          <div className={styles.slideContainer}>
            {currentSlide === 1 && (
              <div className={styles.slide}>
                {/* Two Column Layout */}
                <div className={styles.slideContent}>
                  {/* Left Side - Event Cover */}
                  <div className={styles.leftSection}>
                    <div className={styles.eventCover}>
                      <div className={styles.coverImageContainer}>
                        {imagePreview ? (
                          <img src={imagePreview} alt="Event Cover" className={styles.coverImagePreview} />
                        ) : (
                          <div className={styles.gradientPlaceholder}></div>
                        )}
                        <label htmlFor="event-image-upload" className={styles.uploadButton}>
                          <span className={styles.cameraIcon}>📷</span>
                          <input
                            id="event-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className={styles.fileInput}
                          />
                        </label>
                      </div>
                    </div>
                    <p className={styles.imageTip}>Click to upload event cover image (max 5MB)</p>
                  </div>

                  {/* Right Side - Form */}
                  <div className={styles.rightSection}>
                    <form className={styles.eventDetailsForm}>
                      {/* Event Title */}
                      <div className={styles.eventTitleSection}>
                        <input
                          type="text"
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                          placeholder="Event Name"
                          className={styles.eventTitleInput}
                          required
                        />
                      </div>

                      {/* Categories */}
                      <div className={styles.categoriesSection}>
                        <h4 className={styles.sectionLabel}>📋 Event Categories</h4>
                        <div className={styles.categoriesGrid}>
                          {EVENT_CATEGORIES.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              className={`${styles.categoryTag} ${selectedCategories.includes(category.id) ? styles.categoryTagActive : ''}`}
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

                      {/* Location */}
                      <div className={styles.locationSection}>
                        <h4 className={styles.sectionLabel}>📍 Event Location</h4>
                        <div className={styles.locationInputGroup}>
                          <input
                            type="text"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            placeholder="City (e.g., Mumbai, Delhi)"
                            className={styles.cityInputCompact}
                            list="cities-list"
                          />
                          <datalist id="cities-list">
                            {ALL_CITIES.map(city => (
                              <option key={city} value={city} />
                            ))}
                          </datalist>
                        </div>
                        <div className={styles.venueInputGroup}>
                          {!isMapsScriptLoaded && !mapsScriptError && (
                            <Script
                              src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                              strategy="afterInteractive"
                              onLoad={() => {
                                setIsMapsScriptLoaded(true);
                                setMapsScriptError(false);
                              }}
                              onError={() => {
                                setMapsScriptError(true);
                                setIsMapsScriptLoaded(false);
                              }}
                            />
                          )}
                          {isMapsScriptLoaded ? (
                            <PlacesAutocomplete
                              value={address}
                              onChange={setAddress}
                              onSelect={handleSelectAddress}
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
                                        placeholder: 'Venue address...',
                                        className: styles.venueInputCompact,
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
                          ) : (
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => {
                                setAddress(e.target.value);
                                setEventVenue(e.target.value);
                              }}
                              placeholder="Venue address..."
                              className={styles.venueInputCompact}
                              required
                            />
                          )}
                        </div>
                      </div>

                      {/* About Event */}
                      <div className={styles.aboutSection}>
                        <h4 className={styles.sectionLabel}>📝 About Event</h4>
                        <textarea
                          value={aboutEvent}
                          onChange={(e) => setAboutEvent(e.target.value)}
                          placeholder="Tell people what your event is about..."
                          className={styles.aboutTextarea}
                          rows={4}
                          required
                        />
                      </div>

                      {/* Event Guides */}
                      <div className={styles.guidesSection}>
                        <h4 className={styles.sectionLabel}>📖 Event Information</h4>
                        <div className={styles.guidesCompactGrid}>
                          {GUIDE_OPTIONS.slice(0, 6).map(option => (
                            <div key={option.id} className={styles.guideRowCompact}>
                              <label className={styles.guideCheckboxCompact}>
                                <input
                                  type="checkbox"
                                  checked={option.id in guides}
                                  onChange={() => handleGuideToggle(option.id)}
                                />
                                <span className={styles.checkboxLabel}>{option.label}</span>
                              </label>
                              {option.id in guides && (
                                <input
                                  type="text"
                                  className={styles.guideInputCompact}
                                  placeholder={option.placeholder}
                                  value={guides[option.id]}
                                  onChange={e => handleGuideInput(option.id, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        {GUIDE_OPTIONS.length > 6 && (
                          <details className={styles.moreGuides}>
                            <summary className={styles.moreGuidesToggle}>Show more options</summary>
                            <div className={styles.guidesCompactGrid}>
                              {GUIDE_OPTIONS.slice(6).map(option => (
                                <div key={option.id} className={styles.guideRowCompact}>
                                  <label className={styles.guideCheckboxCompact}>
                                    <input
                                      type="checkbox"
                                      checked={option.id in guides}
                                      onChange={() => handleGuideToggle(option.id)}
                                    />
                                    <span className={styles.checkboxLabel}>{option.label}</span>
                                  </label>
                                  {option.id in guides && (
                                    <input
                                      type="text"
                                      className={styles.guideInputCompact}
                                      placeholder={option.placeholder}
                                      value={guides[option.id]}
                                      onChange={e => handleGuideInput(option.id, e.target.value)}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {currentSlide === 2 && (
              <div className={styles.slide}>
                {/* MODE TOGGLE */}
                <div className={styles.formSection}>
                  <div className={styles.modeToggleContainer}>
                    <h3>Choose Event Type</h3>
                    <div className={styles.modeToggle}>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          checked={!isLegacyMode}
                          onChange={toggleMode}
                          className={styles.toggleInput}
                        />
                        <span className={styles.toggleSlider}></span>
                        <span className={styles.toggleText}>
                          {isLegacyMode ? 'Simple Mode (Legacy)' : 'Session-Centric Mode (Recommended)'}
                        </span>
                      </label>
                      <div className={styles.modeDescription}>
                        {isLegacyMode ? (
                          <p>Simple mode: One set of tickets applies to all time slots. Good for basic events.</p>
                        ) : (
                          <p>Session-centric mode: Each session can have its own tickets, pricing, and capacity. Perfect for multi-day events, workshops, or concerts with different pricing tiers.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isLegacyMode ? (
                  <>
                    {/* LEGACY: Tickets Section */}
                    <div className={styles.formSection}>
                      <h3>Create Tickets</h3>
                      {tickets.map((ticket, index) => (
                        <div key={index} className={styles.ticketSlot}>
                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label>Ticket Name</label>
                              <input
                                type="text"
                                value={ticket.name}
                                onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                                placeholder="e.g., General, VIP, Fan Pit"
                                required
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label>Capacity</label>
                              <input
                                type="number"
                                value={ticket.capacity}
                                onChange={(e) => handleTicketChange(index, 'capacity', e.target.value)}
                                placeholder="Number of tickets"
                                min="1"
                                required
                              />
                            </div>
                            <div className={styles.formGroup}>
                              <label>Price (₹)</label>
                              <input
                                type="number"
                                value={ticket.price}
                                onChange={(e) => handleTicketChange(index, 'price', e.target.value)}
                                placeholder="Ticket price"
                                min="0"
                                step="0.01"
                                required
                              />
                            </div>
                            {tickets.length > 1 && (
                              <button
                                type="button"
                                className={styles.removeDateButton}
                                onClick={() => removeTicketType(index)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.addDateButton}
                        onClick={addTicketType}
                      >
                        Add Another Ticket Type
                      </button>
                    </div>

                    {/* LEGACY: Time Slots Section */}
                    <div className={styles.formSection}>
                      <h3>Event Schedule</h3>
                      {eventSlots.map((slot, index) => (
                        <div key={index} className={styles.scheduleSlotContainer}>
                          <div className={styles.scheduleRow}>
                            <div className={styles.scheduleIndicatorCol}>
                              <span className={styles.scheduleCircleFilled}></span>
                              <span className={styles.scheduleDashedLine}></span>
                              <span className={styles.scheduleCircle}></span>
                            </div>
                            <div className={styles.scheduleLabelsCol}>
                              <span className={styles.scheduleLabel}>Start</span>
                              <span className={styles.scheduleLabel}>End</span>
                            </div>
                            <div className={styles.schedulePickersCol}>
                              <div className={styles.schedulePickerRow}>
                                <input
                                  type="date"
                                  value={slot.date}
                                  onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                                  className={styles.scheduleDateInput}
                                  required
                                />
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                                  className={styles.scheduleTimeInput}
                                  required
                                />
                              </div>
                              <div className={styles.schedulePickerRow}>
                                <input
                                  type="date"
                                  value={slot.date}
                                  onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                                  className={styles.scheduleDateInput}
                                  required
                                  disabled
                                />
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                                  className={styles.scheduleTimeInput}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                          {eventSlots.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeDateButton}
                              onClick={() => removeTimeSlot(index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.addDateButton}
                        onClick={addTimeSlot}
                      >
                        Add Another Time Slot
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* SESSION-CENTRIC: Sessions Builder */}
                    <div className={styles.formSection}>
                      <h3>Event Sessions</h3>
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
                                <label>Date</label>
                                <input
                                  type="date"
                                  value={session.date}
                                  onChange={(e) => handleSessionChange(session.id, 'date', e.target.value)}
                                  required
                                />
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
                  </>
                )}
              </div>
            )}
          </div>

          {message && (
            <div className={`${styles.message} ${message.includes("success") ? styles.success : styles.error}`}>
              {message}
            </div>
          )}

          {/* Slide Navigation */}
          <div className={styles.slideNavigation}>
            {currentSlide > 1 && (
              <button 
                type="button" 
                className={styles.prevButton} 
                onClick={prevSlide}
                disabled={loading}
              >
                ← Previous
              </button>
            )}
            
            {currentSlide < totalSlides ? (
              <button 
                type="button" 
                className={styles.nextButton} 
                onClick={nextSlide}
                disabled={loading}
              >
                Next →
              </button>
            ) : (
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? "Creating Event..." : "Create Event"}
              </button>
            )}
            
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