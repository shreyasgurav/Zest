// src/components/ProfileGuard.js
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ProfileGuard = ({ children }) => {
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await fetch('/api/profile/status', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const { isProfileCompleted } = await response.json();
        
        if (!isProfileCompleted) {
          navigate('/complete-profile');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfile();
  }, [getAccessTokenSilently, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return children;
};