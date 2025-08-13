'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { createArtistDocument } from '@/domains/authentication/services/auth.service';
import { toast } from 'react-toastify';
import { ArrowLeft, Music, User, AtSign, Tag, MapPin, FileText, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import styles from '../create.module.css';

const CreateArtistPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    genre: '',
    location: '',
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
      newErrors.name = 'Artist name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.genre.trim()) {
      newErrors.genre = 'Genre is required';
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
      case 'genre':
        isValid = trimmedValue.length >= 2;
        break;
      case 'location':
        isValid = trimmedValue.length >= 2;
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
                             usernameCheck.takenBy === 'artist' ? 'another artist' :
                             usernameCheck.takenBy === 'organisation' ? 'an organization' :
                             usernameCheck.takenBy === 'venue' ? 'a venue' : 'someone else';
        setErrors({ username: `Username is already taken by ${takenByMessage}` });
        setLoading(false);
        return;
      }

      // Create artist page
      const artistData = await createArtistDocument(user, {
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
        bio: formData.bio.trim(),
        genre: formData.genre.trim(),
        location: formData.location.trim(),
        phoneNumber: formData.phoneNumber
      });

      toast.success('Artist page created successfully!');
      console.log('Artist page created:', artistData);
      
      // Show success with public page info
      setTimeout(() => {
        toast.success(
          `🎉 Your artist page is live! Visit your public page at /artist/${artistData.username}`, 
          { autoClose: 8000 }
        );
      }, 1000);
      
      // Set session to indicate we're switching to artist mode
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('authType', 'artist');
        sessionStorage.setItem('artistLogin', 'true');
        sessionStorage.removeItem('userLogin');
        sessionStorage.removeItem('organizationLogin');
        sessionStorage.removeItem('venueLogin');
        
        // Store the newly created artist page ID for immediate access
        sessionStorage.setItem('selectedArtistPageId', artistData.uid);
      }
      
      // Redirect to the artist page
      router.push('/artist');
    } catch (error) {
      console.error('Error creating artist page:', error);
      toast.error('Failed to create artist page. Please try again.');
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
            <Music size={24} />
            <h1>Create Artist Page</h1>
          </div>
        </div>

        <div className={styles.createPageContent}>
          <p className={styles.createPageDescription}>
            Create your artist page to showcase your talent, connect with venues, and grow your fanbase.
          </p>

          <form onSubmit={handleSubmit} className={styles.createForm}>
            <div className={styles.inputGroup}>
              <label>Artist Name *</label>
              <div className={styles.fieldWithIcon}>
                <User className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your artist name"
                  className={errors.name ? styles.inputError : ''}
                />
                {validFields.name && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.name && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.name && <span className={styles.errorText}><AlertCircle size={14} />{errors.name}</span>}
              {validFields.name && !errors.name && <span className={styles.successMessage}><CheckCircle size={14} />Looks good!</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>Username *</label>
              <div className={styles.fieldWithIcon}>
                <AtSign className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="artistusername"
                  className={errors.username ? styles.inputError : ''}
                />
                {validFields.username && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.username && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.username && <span className={styles.errorText}><AlertCircle size={14} />{errors.username}</span>}
              {validFields.username && !errors.username && <span className={styles.successMessage}><CheckCircle size={14} />Username available!</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>Genre *</label>
              <div className={styles.fieldWithIcon}>
                <Tag className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => handleInputChange('genre', e.target.value)}
                  placeholder="e.g., Rock, Pop, Jazz, Electronic"
                  className={errors.genre ? styles.inputError : ''}
                />
                {validFields.genre && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.genre && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.genre && <span className={styles.errorText}><AlertCircle size={14} />{errors.genre}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>Location</label>
              <div className={styles.fieldWithIcon}>
                <MapPin className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Mumbai, India"
                />
                {validFields.location && <CheckCircle className={styles.validIcon} size={18} />}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Bio</label>
              <div className="relative">
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell people about your music, journey, influences, and what makes you unique..."
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
              <span className={styles.helperText}>This will be used for contact purposes</span>
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
                {loading ? 'Creating...' : 'Create Artist Page'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateArtistPage; 