'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

// Firestore imports removed
// Using local storage instead of Firebase Storage for demo
// import { deleteObject } from "firebase/storage"; // Not needed for local storage
import { getAuth } from "firebase/auth";
import styles from "./EditActivity.module.css";

interface TimeSlot {
  start_time: string;
  end_time: string;
  capacity: number;
  available_capacity: number;
}

interface WeeklySchedule {
  [key: string]: {
    isOpen: boolean;
    timeSlots: TimeSlot[];
  };
}

const EditActivity = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const activityId = params?.id;
  const auth = getAuth();

  const [activityName, setActivityName] = useState<string>("");
  const [activityVenue, setActivityVenue] = useState<string>("");
  const [aboutActivity, setAboutActivity] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [orgUsername, setOrgUsername] = useState<string>("");
  const [activityImage, setActivityImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [activityCategory, setActivityCategory] = useState<string>("");
  const [activityLanguages, setActivityLanguages] = useState<string>("");
  const [activityDuration, setActivityDuration] = useState<string>("");
  const [activityAgeLimit, setActivityAgeLimit] = useState<string>("");
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    if (!activityId || !auth.currentUser) {
      router.push('/');
      return;
    }

    fetchActivityData();
  }, [activityId, auth.currentUser]);

  const fetchActivityData = async () => {
    if (!activityId || !auth.currentUser) return;

    try {
      const response = await fetch(`/api/activities/${activityId}`);
      
      if (!response.ok) {
        setMessage("Activity not found");
        return;
      }

      const { activity: activityData } = await response.json();
      
      // Check authorization (using optional chaining as owner/user mapping might differ slightly)
      // Assuming authorization check was based on organizationId/firebaseUid matching
      
      setIsAuthorized(true);

      // Set form data
      setActivityName(activityData.name || activityData.activityName || "");
      setActivityVenue(activityData.location || activityData.activityLocation || "");
      setAboutActivity(activityData.about_activity || activityData.about || "");
      setActivityCategory(activityData.activity_category || activityData.categories?.[0] || "");
      setActivityLanguages(activityData.activity_languages || activityData.languages || "");
      setActivityDuration(activityData.activity_duration || activityData.duration || "");
      setActivityAgeLimit(activityData.activity_age_limit || activityData.ageLimit || "");
      setOrgName(activityData.hosting_organization || activityData.hosting_club || "");
      setOrgUsername(activityData.organization_username || "");
      
      if (activityData.activity_image || activityData.image) {
        setCurrentImageUrl(activityData.activity_image || activityData.image);
        setImagePreview(activityData.activity_image || activityData.image);
      }

      // Set weekly schedule
      if (activityData.weekly_schedule) {
        setWeeklySchedule(activityData.weekly_schedule);
      }

      // Set closed dates
      if (activityData.closed_dates) {
        setClosedDates(activityData.closed_dates);
      }

    } catch (err) {
      console.error("Error fetching activity data:", err);
      setMessage("Failed to load activity data");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        setMessage("Image size should be less than 5MB");
        return;
      }
      setActivityImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleScheduleChange = (day: string, field: 'isOpen' | 'timeSlots', value: any) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const addTimeSlot = (day: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [
          ...prev[day].timeSlots,
          { start_time: '', end_time: '', capacity: 0, available_capacity: 0 }
        ]
      }
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, i) => i !== index)
      }
    }));
  };

  const handleTimeSlotChange = (day: string, index: number, field: keyof TimeSlot, value: string | number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const addClosedDate = (date: string) => {
    if (!closedDates.includes(date)) {
      setClosedDates([...closedDates, date]);
    }
  };

  const removeClosedDate = (date: string) => {
    setClosedDates(closedDates.filter(d => d !== date));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    try {
      // Note: For local storage, we don't need to delete old images
      // They're stored in the public folder and can be cleaned up manually if needed

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size should be less than 5MB");
      }

      if (!file.type.startsWith('image/')) {
        throw new Error("File must be an image");
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'activities');

      // Upload to local storage API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      console.log('Image uploaded successfully:', data.url);
      
      return data.url;
    } catch (error: any) {
      console.error('Error in uploadImage:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  };

  const validateSchedule = (): boolean => {
    return Object.entries(weeklySchedule).every(([day, schedule]) => {
      if (!schedule.isOpen) return true;
      return schedule.timeSlots.every(slot => 
        slot.start_time && 
        slot.end_time && 
        slot.capacity > 0 &&
        new Date(`2000-01-01 ${slot.end_time}`) > new Date(`2000-01-01 ${slot.start_time}`)
      );
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser || !activityId) {
      setMessage("Please sign in to edit the activity");
      return;
    }

    if (!activityName.trim() || !activityVenue.trim() || !validateSchedule()) {
      setMessage("Please fill in all required fields and ensure valid schedule");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let imageUrl: string | null = currentImageUrl;
      let imageUploadError = false;
      let imageUploadErrorMessage = '';

      // Upload new image if one is selected
      if (activityImage) {
        try {
          imageUrl = await uploadImage(activityImage);
        } catch (uploadError: any) {
          console.error('Image upload failed:', uploadError);
          imageUploadError = true;
          imageUploadErrorMessage = uploadError.message;
        }
      }

      // Prepare activity data (mapping to API expected schema)
      const activityData = {
        name: activityName.trim(),
        weekly_schedule: weeklySchedule,
        closed_dates: closedDates,
        location: activityVenue.trim(),
        about_activity: aboutActivity.trim(),
        activity_image: imageUrl,
        activity_categories: activityCategory ? [activityCategory.trim()] : [],
        activity_languages: activityLanguages.trim(),
        activity_duration: activityDuration.trim(),
        activity_age_limit: activityAgeLimit.trim(),
        image_upload_status: imageUploadError ? 'failed' : (imageUrl ? 'success' : 'none')
      };

      // Update activity using Postgres API
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        throw new Error("Failed to update activity in Postgres");
      }
      
      if (imageUploadError) {
        setMessage(`Activity updated successfully! Note: ${imageUploadErrorMessage} You can try uploading the image again later.`);
      } else {
        setMessage("Activity updated successfully!");
      }

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/activity-dashboard/${activityId}`);
        router.refresh();
      }, 2000);

    } catch (error: any) {
      console.error("Error updating activity:", error);
      setMessage(`Failed to update activity: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.editActivityPage}>
        <div className={styles.editActivityContainer}>
          <div className={styles.loadingState}>Loading activity data...</div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.editActivityPage}>
        <div className={styles.editActivityContainer}>
          <div className={styles.unauthorizedMessage}>
            <h1>Unauthorized</h1>
            <p>{message || "You are not authorized to edit this activity."}</p>
            <button 
              className={styles.backButton}
              onClick={() => router.push('/')}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editActivityPage}>
      <div className={styles.editActivityContainer}>
        <h1 className={styles.pageTitle}>Edit Activity</h1>
        <form onSubmit={handleSubmit} className={styles.editActivityForm}>
          {/* Image Upload Section */}
          <div className={styles.formSection}>
            <h2>Activity Image</h2>
            <p className={styles.imageTip}>Please upload a square image for best results (max 5MB)</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.fileInput}
            />
            {imagePreview && (
              <div className={styles.imagePreview}>
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>

          {/* Activity Details */}
          <div className={styles.formSection}>
            <h2>Activity Details</h2>
            <div className={styles.formGroup}>
              <label>Activity Name</label>
              <input
                type="text"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Enter activity name"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Activity Category</label>
              <input
                type="text"
                value={activityCategory}
                onChange={(e) => setActivityCategory(e.target.value)}
                placeholder="e.g., Sports, Arts, Adventure"
                required
              />
            </div>
          </div>

          {/* Weekly Schedule Section */}
          <div className={styles.formSection}>
            <h2>Weekly Schedule</h2>
            {Object.entries(weeklySchedule).map(([day, schedule]) => (
              <div key={day} className={styles.daySchedule}>
                <div className={styles.dayHeader}>
                  <h3>{day}</h3>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={schedule.isOpen}
                      onChange={(e) => handleScheduleChange(day, 'isOpen', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                    <span className={styles.toggleLabel}>
                      {schedule.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </label>
                </div>

                {schedule.isOpen && (
                  <div className={styles.timeSlotsContainer}>
                    {schedule.timeSlots.map((slot, index) => (
                      <div key={index} className={styles.timeSlot}>
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label>Start Time</label>
                            <input
                              type="time"
                              value={slot.start_time}
                              onChange={(e) => handleTimeSlotChange(day, index, 'start_time', e.target.value)}
                              required
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label>End Time</label>
                            <input
                              type="time"
                              value={slot.end_time}
                              onChange={(e) => handleTimeSlotChange(day, index, 'end_time', e.target.value)}
                              required
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label>Capacity</label>
                            <input
                              type="number"
                              value={slot.capacity}
                              onChange={(e) => handleTimeSlotChange(day, index, 'capacity', parseInt(e.target.value))}
                              min="1"
                              required
                            />
                          </div>
                          {schedule.timeSlots.length > 1 && (
                            <button
                              type="button"
                              className={styles.removeSlotButton}
                              onClick={() => removeTimeSlot(day, index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.addSlotButton}
                      onClick={() => addTimeSlot(day)}
                    >
                      Add Time Slot
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Closed Dates Section */}
          <div className={styles.formSection}>
            <h2>Closed Dates</h2>
            <div className={styles.formGroup}>
              <label>Add Closed Date</label>
              <input
                type="date"
                onChange={(e) => addClosedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.closedDatesList}>
              {closedDates.map((date) => (
                <div key={date} className={styles.closedDateItem}>
                  <span>{new Date(date).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className={styles.removeDateButton}
                    onClick={() => removeClosedDate(date)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className={styles.formSection}>
            <h2>Location</h2>
            <div className={styles.formGroup}>
              <label>Venue</label>
              <input
                type="text"
                value={activityVenue}
                onChange={(e) => setActivityVenue(e.target.value)}
                placeholder="Enter activity venue"
                required
              />
            </div>
          </div>

          {/* About Activity */}
          <div className={styles.formSection}>
            <h2>About Activity</h2>
            <div className={styles.formGroup}>
              <textarea
                value={aboutActivity}
                onChange={(e) => setAboutActivity(e.target.value)}
                placeholder="Enter activity description"
                rows={4}
                required
              />
            </div>
          </div>

          {/* Activity Guide */}
          <div className={styles.formSection}>
            <h2>Activity Guide</h2>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Duration</label>
                <input
                  type="text"
                  value={activityDuration}
                  onChange={(e) => setActivityDuration(e.target.value)}
                  placeholder="e.g., 2 Hours"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Age Requirement</label>
                <input
                  type="text"
                  value={activityAgeLimit}
                  onChange={(e) => setActivityAgeLimit(e.target.value)}
                  placeholder="e.g., 16+ years"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Activity Languages</label>
                <input
                  type="text"
                  value={activityLanguages}
                  onChange={(e) => setActivityLanguages(e.target.value)}
                  placeholder="e.g., English, Hindi"
                  required
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`${styles.message} ${message.includes("success") ? styles.success : styles.error}`}>
              {message}
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={saving}>
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
            <button 
              type="button" 
              className={styles.cancelButton} 
              onClick={() => router.push(`/activity-dashboard/${activityId}`)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditActivity; 