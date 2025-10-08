'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase';
import { createOrganizationDocument } from '@/domains/authentication/services/auth.service';
import { toast } from 'react-toastify';
import { ArrowLeft, Building2, Users, AtSign, FileText, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import styles from '../create.module.css';

const CreateOrganizationPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const router = useRouter();

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
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
      newErrors.name = 'Organization name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
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
                             usernameCheck.takenBy === 'organisation' ? 'another organization' :
                             usernameCheck.takenBy === 'venue' ? 'a venue' : 'someone else';
        setErrors({ username: `Username is already taken by ${takenByMessage}` });
        setLoading(false);
        return;
      }

      // Create organization page
      const organizationData = await createOrganizationDocument(user, {
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
        bio: formData.bio.trim(),
        phoneNumber: formData.phoneNumber
      });

      toast.success('Organization page created successfully!');
      console.log('Organization page created:', organizationData);
      
      // Show success with public page info
      setTimeout(() => {
        toast.success(
          `🎉 Your organization page is live! Visit your public page at /organisation/${organizationData.username}`, 
          { autoClose: 8000 }
        );
      }, 1000);
      
      // Set session to indicate we're switching to organization mode
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('authType', 'organization');
        sessionStorage.setItem('organizationLogin', 'true');
        sessionStorage.removeItem('userLogin');
        sessionStorage.removeItem('artistLogin');
        sessionStorage.removeItem('venueLogin');
        
        // Store the newly created organization page ID for immediate access
        sessionStorage.setItem('selectedOrganizationPageId', organizationData.uid);
      }
      
      // Redirect to the organization page
      router.push('/organisation');
    } catch (error) {
      console.error('Error creating organization page:', error);
      toast.error('Failed to create organization page. Please try again.');
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
            <Building2 size={24} />
            <h1>Create Organization Page</h1>
          </div>
        </div>

        <div className={styles.createPageContent}>
          <p className={styles.createPageDescription}>
            Create your organization page to manage events, activities, and connect with your audience.
          </p>

          <form onSubmit={handleSubmit} className={styles.createForm}>
            <div className={styles.inputGroup}>
              <label>Organization Name *</label>
              <div className={styles.fieldWithIcon}>
                <Users className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your organization name"
                  className={errors.name ? styles.inputError : ''}
                />
                {validFields.name && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.name && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.name && <span className={styles.errorText}><AlertCircle size={14} />{errors.name}</span>}
              {validFields.name && !errors.name && <span className={styles.successMessage}><CheckCircle size={14} />Perfect!</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>Username *</label>
              <div className={styles.fieldWithIcon}>
                <AtSign className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="organizationusername"
                  className={errors.username ? styles.inputError : ''}
                />
                {validFields.username && <CheckCircle className={styles.validIcon} size={18} />}
                {errors.username && <AlertCircle className={styles.invalidIcon} size={18} />}
              </div>
              {errors.username && <span className={styles.errorText}><AlertCircle size={14} />{errors.username}</span>}
              {validFields.username && !errors.username && <span className={styles.successMessage}><CheckCircle size={14} />Username available!</span>}
            </div>

            <div className={styles.inputGroup}>
              <label>About Organization</label>
              <div className="relative">
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell people about your organization's mission, values, history, and the amazing experiences you create..."
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
                {loading ? 'Creating...' : 'Create Organization Page'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateOrganizationPage; 