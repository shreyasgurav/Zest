import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import './CreateType.css';

const CreateType = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      setIsAuthorized(user?.email === 'shrreyasgurav@gmail.com');
    };

    checkAuth();
    const unsubscribe = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribe();
  }, [auth]);

  if (!isAuthorized) {
    return (
      <div className="unauthorized-message-container">
        <div className="unauthorized-message">
          <h1>Unauthorized Access</h1>
          <p>You can't create anything because you are not Shreyas.</p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleTypeSelection = (type) => {
    switch(type) {
      case 'event':
        navigate('/create-event');
        break;
      case 'workshop':
        navigate('/create-guide');
        break;
      case 'experience':
        navigate('/create-experience');
        break;
      case 'service':
        navigate('/create-service');
        break;
      default:
        break;
    }
  };

  return (
    <div className="type-selection-page">
      <div className="type-selection-container">
        <h1 className="page-title">What would you like to create?</h1>
        
        <div className="type-grid">
          <div 
            className="type-card"
            onClick={() => handleTypeSelection('event')}
          >
            <div className="type-icon">🎉</div>
            <h2>Event</h2>
            <p>Create a one-time or recurring event</p>
          </div>

          <div 
            className="type-card"
            onClick={() => handleTypeSelection('workshop')}
          >
            <div className="type-icon">🌟</div>
            <h2>Guide</h2>
            <p>Create a Guide excluding bullshit.</p>
          </div>

          <div 
            className="type-card"
            onClick={() => handleTypeSelection('experience')}
          >
            <div className="type-icon">🌟</div>
            <h2>Experience</h2>
            <p>Create an immersive experience</p>
          </div>

          <div 
            className="type-card"
            onClick={() => handleTypeSelection('service')}
          >
            <div className="type-icon">🎮</div>
            <h2>Activities</h2>
            <p>Offer fun activities</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateType;
