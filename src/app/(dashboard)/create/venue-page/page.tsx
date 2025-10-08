'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { createVenueDocument } from '@/domains/authentication/services/auth.service';
import { toast } from 'react-toastify';
import { ArrowLeft, MapPin, Building, AtSign, Tag, Map, Users, FileText, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import styles from '../create.module.css';

const CreateVenuePage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    venueType: '',
    address: '',
    city: '',
    capacity: '',
    phoneNumber: ''
  });

  const [errors, setErrors] = useState<any>({});
  const [validFields, setValidFields] = useState<any>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setFormData(prev => ({
          ...prev,
          phoneNumber: currentUser.phoneNumber || ''
        }));
      } else {
        router.push('/login');
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Venue name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.venueType.trim()) {
      newErrors.venueType = 'Venue type is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear previous errors and validations
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation feedback
    const trimmedValue = value.trim();
    let isValid = false;
    
    switch (field) {
      case 'name':
        isValid = trimmedValue.length >= 2;
        break;
      case 'username':
        isValid = trimmedValue.length >= 3 && /^[a-zA-Z0-9_]+$/.test(trimmedValue);
        break;
      case 'venueType':
        isValid = trimmedValue.length >= 2;
        break;
      case 'address':
        isValid = trimmedValue.length >= 5;
        break;
      case 'city':
        isValid = trimmedValue.length >= 2;
        break;
      case 'capacity':
        isValid = parseInt(value) > 0;
        break;
      case 'bio':
        isValid = true; // Bio is optional
        break;
    }
    
    setValidFields((prev: any) => ({ ...prev, [field]: isValid && trimmedValue.length > 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    setLoading(true);

    try {
      // Check username availability globally before creating
      const { checkGlobalUsernameAvailability } = await import('@/domains/authentication/services/auth.service');
      const usernameCheck = await checkGlobalUsernameAvailability(formData.username);
      
      if (!usernameCheck.available) {
        const takenByMessage = usernameCheck.takenBy === 'user' ? 'a user' :
                             usernameCheck.takenBy === 'artist' ? 'an artist' :
                             usernameCheck.takenBy === 'organisation' ? 'an organization' :
                             usernameCheck.takenBy === 'venue' ? 'another venue' : 'someone else';
        setErrors({ username: `Username is already taken by ${takenByMessage}` });
        setLoading(false);
        return;
      }

      // Create venue page
      const venueData = await createVenueDocument(user, {
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
        bio: formData.bio.trim(),
        venueType: formData.venueType.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        capacity: parseInt(formData.capacity) || 0,
        phoneNumber: formData.phoneNumber
      });

      toast.success('Venue page created successfully!');
      console.log('Venue page created:', venueData);
      
      // Show success with public page info
      setTimeout(() => {
        toast.success(
          `🎉 Your venue page is live! Visit your public page at /venue/${venueData.username}`, 
          { autoClose: 8000 }
        );
      }, 1000);
      
      // Set session to indicate we're switching to venue mode
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('authType', 'venue');
        sessionStorage.setItem('venueLogin', 'true');
        sessionStorage.removeItem('userLogin');
        sessionStorage.removeItem('artistLogin');
        sessionStorage.removeItem('organizationLogin');
        
        // Store the newly created venue page ID for immediate access
        sessionStorage.setItem('selectedVenuePageId', venueData.uid);
      }
      
      // Redirect to the venue page
      router.push('/venue');
    } catch (error) {
      console.error('Error creating venue page:', error);
      toast.error('Failed to create venue page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/business');
  };

  if (isAuthChecking) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.createPageContainer}>
      <div className={styles.createPageCard}>
        <div className={styles.createPageHeader}>
          <button onClick={handleBack} className={styles.backButton}>
            <ArrowLeft size={20} />
            Back
          </button>
          <div className={styles.createPageTitle}>
            <MapPin size={24} />
            <h1>Create Venue Page</h1>
          </div>
        </div>

        <div className={styles.createPageContent}>
          <p className={styles.createPageDescription}>
            Create your venue page to showcase your space, manage bookings, and connect with event organizers looking for the perfect location.
          </p>

          <form onSubmit={handleSubmit} className={styles.createForm}>
            <div className={styles.inputGroup}>
              <label>Venue Name *</label>
              <div className={styles.fieldWithIcon}>
                <Building className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your venue name"
                  className={errors.name ? styles.inputError : ''}
                />
                {validFields.name && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.name && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.name && <span className={styles.errorText}><AlertCircle size={14} />{errors.name}</span>}
              {validFields.name && !errors.name && <span className={styles.successMessage}><CheckCircle size={14} />Great venue name!</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>Username *</label>
              <div className={styles.fieldWithIcon}>
                <AtSign className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="venueusername"
                  className={errors.username ? styles.inputError : ''}
                />
                {validFields.username && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.username && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.username && <span className={styles.errorText}><AlertCircle size={14} />{errors.username}</span>}
              {validFields.username && !errors.username && <span className={styles.successMessage}><CheckCircle size={14} />Username available!</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>Venue Type *</label>
              <div className={styles.fieldWithIcon}>
                <Tag className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.venueType}
                  onChange={(e) => handleInputChange('venueType', e.target.value)}
                  placeholder="e.g., Concert Hall, Club, Restaurant, Auditorium"
                  className={errors.venueType ? styles.inputError : ''}
                />
                {validFields.venueType && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.venueType && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.venueType && <span className={styles.errorText}><AlertCircle size={14} />{errors.venueType}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>Address *</label>
              <div className="relative">
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter complete address including street, area, landmarks..."
                  rows={3}
                  className={errors.address ? styles.inputError : ''}
                />
                {validFields.address && <CheckCircle className={`${styles.validIcon} absolute right-4 top-4`} size={18} />}
                {errors.address && <AlertCircle className={`${styles.invalidIcon} absolute right-4 top-4`} size={18} />}
              </div>
              {errors.address && <span className={styles.errorText}><AlertCircle size={14} />{errors.address}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>City</label>
              <div className={styles.fieldWithIcon}>
                <Map className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="e.g., Mumbai"
                />
                {validFields.city && <CheckCircle className={styles.validIcon} size={18} />}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Capacity</label>
              <div className={styles.fieldWithIcon}>
                <Users className={styles.fieldIcon} size={18} />
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  placeholder="Maximum capacity (number of people)"
                  min="0"
                />
                {validFields.capacity && <CheckCircle className={styles.validIcon} size={18} />}
              </div>
              <span className={styles.helperText}>Leave blank if capacity varies by setup</span>
            </div>

            <div className={styles.inputGroup}>
              <label>About Venue</label>
              <div className="relative">
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Describe your venue's atmosphere, facilities, amenities, parking, accessibility, and what makes it special for events..."
                  rows={4}
                  maxLength={500}
                />
                <div className={`${styles.characterCount} ${formData.bio.length > 450 ? styles.warning : ''} ${formData.bio.length > 480 ? styles.error : ''}`}>
                  {formData.bio.length}/500
                </div>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Phone Number</label>
              <div className={styles.fieldWithIcon}>
                <Phone className={styles.fieldIcon} size={18} />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  disabled
                  className={styles.disabledInput}
                />
              </div>
              <span className={styles.helperText}>This will be used for booking inquiries</span>
            </div>

            <div className={styles.formActions}>
              <button 
                type="button" 
                onClick={handleBack}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className={styles.createButton}
              >
                {loading ? 'Creating...' : 'Create Venue Page'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateVenuePage; 