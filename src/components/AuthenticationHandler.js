import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AuthenticationHandler() {
  const { user, isAuthenticated } = useAuth0();
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserExists = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await axios.get(`/api/users/check/${user.sub}`);
          if (response.data.exists) {
            // User exists, redirect to profile
            navigate('/user-profile');
          } else {
            // New user, redirect to setup form
            navigate('/setup-profile');
          }
        } catch (error) {
          console.error('Error checking user:', error);
          alert('Something went wrong while verifying your profile. Please try again.');
        } finally {
          setIsLoading(false); // Stop loading after check
        }
      }
    };

    checkUserExists();
  }, [isAuthenticated, user, navigate]);

  if (isLoading) {
    return <p>Loading...</p>; // Loading state feedback
  }

  return null;
}

export default AuthenticationHandler;
