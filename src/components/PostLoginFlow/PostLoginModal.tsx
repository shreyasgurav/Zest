'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { toast } from 'react-toastify';
import { signOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import styles from './PostLoginModal.module.css';

interface FormData {
  name: string;
  username: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  username?: string;
  phone?: string;
  [key: string]: string | undefined;
}

const PostLoginModal = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // Safety check - if no user, redirect to homepage
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);
  
  // Prevent navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Default form data with additional fallbacks
  const [formData, setFormData] = useState<FormData>({
    name: user?.displayName || '',
    username: '',
    phone: '',
  });
  
  // Load existing data if available
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setFormData(prev => ({
            name: userData.name || user.displayName || prev.name,
            username: userData.username || prev.username,
            phone: userData.phone || prev.phone,
          }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    
    fetchUserData();
  }, [user]);
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isChecking, setIsChecking] = useState(false);

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (username.length < 3) return false;
    
    const q = query(
      collection(db, "Users"),
      where("username", "==", username.toLowerCase())
    );
    
    const querySnapshot = await getDocs(q);
    // Only consider username taken if it belongs to a different user
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      if (querySnapshot.docs[0].id !== user?.uid) {
        return false; // Username is taken by someone else
      }
    }
    return true; // Username is available or belongs to current user
  };

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value.toLowerCase().trim();
    setFormData(prev => ({ ...prev, username: newUsername }));
    setErrors(prev => ({ ...prev, username: '' }));
    
    if (newUsername.length >= 3) {
      setIsChecking(true);
      const isAvailable = await checkUsernameAvailability(newUsername);
      setIsChecking(false);
      
      if (!isAvailable) {
        setErrors(prev => ({ 
          ...prev, 
          username: 'Username is already taken' 
        }));
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: value }));
    setErrors(prev => ({ 
      ...prev, 
      phone: value.length === 10 ? '' : 'Phone number must be 10 digits' 
    }));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info("You've been logged out");
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    // Trim whitespace from inputs
    const trimmedName = formData.name.trim();
    const trimmedUsername = formData.username.trim();
    const phone = formData.phone;

    if (!trimmedName) {
      newErrors.name = 'Name is required';
    }

    if (!trimmedUsername) {
      newErrors.username = 'Username is required';
    } else if (trimmedUsername.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.length !== 10) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Check if phone is already linked to another account
      if (phone) {
        const phoneQuery = query(
          collection(db, "Users"),
          where("phone", "==", phone)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty && phoneSnapshot.docs[0].id !== user?.uid) {
          setErrors(prev => ({ 
            ...prev, 
            phone: 'This phone number is already linked to another account' 
          }));
          return;
        }
      }

      const isUsernameAvailable = await checkUsernameAvailability(trimmedUsername);
      if (!isUsernameAvailable) {
        setErrors(prev => ({ 
          ...prev, 
          username: 'Username is already taken' 
        }));
        return;
      }

      if (!user) {
        toast.error("User not found");
        return;
      }

      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, {
        name: trimmedName,
        username: trimmedUsername.toLowerCase(),
        phone: phone,
        updatedAt: new Date().toISOString()
      });

      toast.success("Profile setup completed!");
      router.push('/profile');

    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error setting up profile");
    }
  };

  // If user is not provided, show nothing
  if (!user) {
    return null;
  }

  return (
    <div className={styles.loginModalWrapper}>
      <div className={styles.loginModalInner}>
        <h2 className={styles.loginHeading}>Complete Your Profile</h2>
        <p className={styles.createOrgInfo}>Please set up your profile to continue</p>
        
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label>Name :</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={styles.loginInput}
              placeholder="Enter your name"
            />
            {errors.name && (
              <span className={styles.error}>{errors.name}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label>Username :</label>
            <div className={styles.usernameInputContainer}>
              <span className={styles.usernameAtSymbol}>@</span>
              <input
                type="text"
                value={formData.username}
                onChange={handleUsernameChange}
                className={styles.usernameInput}
                placeholder="username"
              />
            </div>
            {isChecking && (
              <span className={styles.checking}>Checking availability...</span>
            )}
            {errors.username && (
              <span className={styles.error}>{errors.username}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label>Phone :</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              className={styles.loginInput}
              placeholder="Enter 10-digit phone number"
              maxLength={10}
            />
            {errors.phone && (
              <span className={styles.error}>{errors.phone}</span>
            )}
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleLogout}
              className={`${styles.orgCreateButton} ${styles.logoutButton}`}
            >
              Log Out
            </button>
            <button
              type="submit"
              disabled={isChecking || Object.keys(errors).some(key => errors[key])}
              className={styles.orgCreateButton}
            >
              Complete Setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostLoginModal; 