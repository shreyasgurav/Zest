'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { db, storage } from "@/infrastructure/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useRouter, useParams } from "next/navigation";
import styles from "./EditEvent.module.css";
// @ts-ignore
import PlacesAutocomplete, { Suggestion } from 'react-places-autocomplete';
import Script from 'next/script';
import { FaMapMarkerAlt } from 'react-icons/fa';


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

const EditEvent = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  
  // Basic form states
  const [eventTitle, setEventTitle] = useState<string>("");
  const [eventVenue, setEventVenue] = useState<string>("");
  const [aboutEvent, setAboutEvent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  
  // Image states
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  
  // Category and guides states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [guides, setGuides] = useState<{ [key: string]: string }>({});
  
  // Location states
  const [address, setAddress] = useState('');
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [mapsScriptError, setMapsScriptError] = useState(false);
  
  const auth = getAuth();

  // Google Maps script loading
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
      setIsMapsScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsMapsScriptLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isMapsScriptLoaded) {
          setMapsScriptError(true);
        }
      }, 10000);
    }
  }, []);

  // Fetch event details
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!auth.currentUser) {
        router.push('/login');
        return;
      }

      if (!params?.id) {
        setMessage("Event ID not found");
        setLoading(false);
        return;
      }

      try {
        const eventDoc = await getDoc(doc(db(), "events", params.id));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          
          // Check if the current user is the event creator or has edit permissions
          const hasEditPermission = data.organizationId === auth.currentUser.uid ||
                                   data.creator?.userId === auth.currentUser.uid;
          
          if (!hasEditPermission) {
            setMessage("You don't have permission to edit this event");
            setLoading(false);
            return;
          }

          // Set form data
          setEventTitle(data.title || "");
          setEventVenue(data.event_venue || "");
          setAddress(data.event_venue || "");
          setAboutEvent(data.about_event || "");
          setCurrentImageUrl(data.event_image || "");
          setImagePreview(data.event_image || null);
          setSelectedCategories(data.event_categories || []);
          setGuides(data.event_guides || {});
        } else {
          setMessage("Event not found");
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
        setMessage("Error loading event details");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [params?.id, auth.currentUser, router]);

  // Image upload handler
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
      setMessage(""); // Clear any previous messages
    }
  };

  // Image upload function
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size should be less than 5MB");
      }

      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image");
      }

      const fileExtension = file.name.split('.').pop();
      const fileName = `events/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storageRef = ref(storage(), fileName);

      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser?.uid || 'unknown',
          uploadTime: new Date().toISOString()
        }
      };

      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const uploadResult = await uploadBytes(storageRef, blob, metadata);
      return await getDownloadURL(uploadResult.ref);
    } catch (error: any) {
      console.error('Error in uploadImage:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  };

  // Category selection handler
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Location selection handler
  const handleSelectAddress = (address: string) => {
    setAddress(address);
    setEventVenue(address);
    setIsLocationFocused(false);
  };

  // Guide toggle handler
  const handleGuideToggle = (id: string) => {
    setGuides(prev =>
      id in prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)) : { ...prev, [id]: '' }
    );
  };

  // Guide input handler
  const handleGuideInput = (id: string, value: string) => {
    setGuides(prev => ({ ...prev, [id]: value }));
  };

  // Form submission handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setMessage("Please sign in to update the event");
      return;
    }

    // Validate required fields
    if (!eventTitle.trim() || !eventVenue.trim() || !aboutEvent.trim() || selectedCategories.length === 0) {
      setMessage("Please fill in all required fields and select at least one category");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      let imageUrl = currentImageUrl;
      let imageUploadError = false;
      let imageUploadErrorMessage = '';

      // Upload new image if selected
      if (eventImage) {
        try {
          const uploadedUrl = await uploadImage(eventImage);
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        } catch (uploadError: any) {
          console.error('Image upload failed:', uploadError);
          imageUploadError = true;
          imageUploadErrorMessage = uploadError.message;
        }
      }

      // Prepare update data - only update the allowed fields
      const eventData = {
        title: eventTitle.trim(),
        event_venue: eventVenue.trim(),
        about_event: aboutEvent.trim(),
        event_image: imageUrl,
        event_categories: selectedCategories,
        event_guides: guides,
        updatedAt: serverTimestamp(),
        image_upload_status: imageUploadError ? 'failed' : (imageUrl ? 'success' : 'none')
      };

      if (!params?.id) {
        throw new Error("Event ID not found");
      }
      
      await updateDoc(doc(db(), "events", params.id), eventData);
      
      if (imageUploadError) {
        setMessage(`Event updated successfully! Note: ${imageUploadErrorMessage}`);
      } else {
        setMessage("Event updated successfully!");
      }

      setTimeout(() => {
        router.push(`/event-dashboard/${params.id}`);
      }, 2000);

    } catch (error: any) {
      console.error("Error updating event:", error);
      setMessage(`Failed to update event: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.editEventPage}>
        <div className={styles.editEventContainer}>
          <div className={styles.loadingState}>Loading event details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (message && !eventTitle) {
    return (
      <div className={styles.editEventPage}>
        <div className={styles.editEventContainer}>
          <div className={styles.loadingState} style={{color: '#ef4444'}}>{message}</div>
          <button 
            onClick={() => router.push('/')}
            className={styles.cancelButton}
            style={{marginTop: '20px'}}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editEventPage}>
      <div className={styles.editEventContainer}>
        <h1 className={styles.pageTitle}>Edit Event</h1>
        
        <form onSubmit={handleSubmit} className={styles.editEventForm}>
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
                {EVENT_CATEGORIES.map((category) => (
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
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "Updating Event..." : "Update Event"}
            </button>
            <button 
              type="button" 
              className={styles.cancelButton} 
              onClick={() => router.push(`/event-dashboard/${params?.id}`)}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEvent; 