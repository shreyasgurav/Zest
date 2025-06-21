'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import styles from "./EditEvent.module.css";
// @ts-ignore
import PlacesAutocomplete, { Suggestion } from 'react-places-autocomplete';
import Script from 'next/script';
import { FaMapMarkerAlt } from 'react-icons/fa';
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

const EditEvent = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [eventTitle, setEventTitle] = useState<string>("");
  const [eventVenue, setEventVenue] = useState<string>("");
  const [aboutEvent, setAboutEvent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>("");
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [eventLanguages, setEventLanguages] = useState<string>("");
  const [eventSlots, setEventSlots] = useState<EventSlot[]>([
    { date: '', startTime: '', endTime: '' }
  ]);
  const [tickets, setTickets] = useState<Ticket[]>([
    { name: '', capacity: '', price: '' }
  ]);
  const [address, setAddress] = useState('');
  const [isMapsScriptLoaded, setIsMapsScriptLoaded] = useState(false);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [guides, setGuides] = useState<{ [key: string]: string }>({});
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  
  const auth = getAuth();

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!auth.currentUser) {
        router.push('/');
        return;
      }

      try {
        const eventDoc = await getDoc(doc(db, "events", params.id));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          
          // Check if the current user is the event creator
          if (data.organizationId !== auth.currentUser.uid) {
            router.push('/');
            return;
          }

          setEventTitle(data.title || "");
          setEventVenue(data.event_venue || "");
          setAddress(data.event_venue || "");
          setAboutEvent(data.about_event || "");
          setCurrentImageUrl(data.event_image || "");
          setImagePreview(data.event_image || null);
          setSelectedCategories(data.event_categories || []);
          setEventLanguages(data.event_languages || "");
          setGuides(data.event_guides || {});
          setSelectedCity(data.city || "Mumbai");

          // Format time slots
          if (data.time_slots && data.time_slots.length > 0) {
            const formattedSlots = data.time_slots.map((slot: any) => ({
              date: slot.date || '',
              startTime: slot.start_time || '',
              endTime: slot.end_time || ''
            }));
            setEventSlots(formattedSlots);
          }

          // Format tickets
          if (data.tickets && data.tickets.length > 0) {
            const formattedTickets = data.tickets.map((ticket: any) => ({
              name: ticket.name || '',
              capacity: ticket.capacity.toString() || '',
              price: ticket.price.toString() || ''
            }));
            setTickets(formattedTickets);
          }
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
        setMessage("Error loading event details");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [params.id, auth.currentUser, router]);

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
    return eventSlots.every(slot => 
      slot.date && slot.startTime && slot.endTime && 
      new Date(`${slot.date} ${slot.endTime}`) > new Date(`${slot.date} ${slot.startTime}`)
    );
  };

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
      const storageRef = ref(storage, fileName);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setMessage("Please sign in to update the event");
      return;
    }

    if (!eventTitle.trim() || !eventVenue.trim() || !validateSlots() || !validateTickets() || selectedCategories.length === 0) {
      setMessage("Please fill in all required fields and ensure valid time slots, tickets, and at least one category");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let imageUrl = currentImageUrl;
      let imageUploadError = false;
      let imageUploadErrorMessage = '';

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

      const eventData = {
        title: eventTitle.trim(),
        time_slots: eventSlots.map(slot => ({
          date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          available: true
        })),
        tickets: tickets.map(ticket => ({
          name: ticket.name.trim(),
          capacity: parseInt(ticket.capacity),
          price: parseFloat(ticket.price),
          available_capacity: parseInt(ticket.capacity)
        })),
        event_venue: eventVenue.trim(),
        about_event: aboutEvent.trim(),
        event_image: imageUrl,
        event_categories: selectedCategories,
        event_languages: eventLanguages.trim(),
        event_guides: guides,
        updatedAt: serverTimestamp(),
        image_upload_status: imageUploadError ? 'failed' : (imageUrl ? 'success' : 'none')
      };

      await updateDoc(doc(db, "events", params.id), eventData);
      
      if (imageUploadError) {
        setMessage(`Event updated successfully! Note: ${imageUploadErrorMessage}`);
      } else {
        setMessage("Event updated successfully!");
      }

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);

    } catch (error: any) {
      console.error("Error updating event:", error);
      setMessage(`Failed to update event: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.editEventPage}>
        <div className={styles.loadingState}>Loading event details...</div>
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
          </div>

          {/* Tickets Section */}
          <div className={styles.formSection}>
            <h2>Update Tickets</h2>
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

          {/* Time Slots Section */}
          <div className={styles.formSection}>
            <h2>Event Schedule</h2>
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

          {/* Location */}
          <div className={styles.formSection}>
            <h2>Location</h2>
            <div className={styles.formGroup}>
              <label>City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className={styles.citySelect}
                required
              >
                {ALL_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Venue</label>
              <Script
                src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDjDazO71t0Deh_h6fMe_VHoKmVNEKygSM&libraries=places"
                strategy="afterInteractive"
                onLoad={() => setIsMapsScriptLoaded(true)}
              />
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
                            placeholder: 'Search location...',
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

          {/* About Event */}
          <div className={styles.formSection}>
            <h2>About Event</h2>
            <div className={styles.formGroup}>
              <textarea
                value={aboutEvent}
                onChange={(e) => setAboutEvent(e.target.value)}
                placeholder="Enter event description"
                rows={4}
                required
              />
            </div>
          </div>

          {/* Event Guides */}
          <div className={styles.formSection}>
            <h2>Event Guides</h2>
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
              {loading ? "Updating Event..." : "Update Event"}
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

export default EditEvent; 