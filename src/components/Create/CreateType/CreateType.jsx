import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateType.css';

const CreateType = () => {
  const navigate = useNavigate();

  const handleTypeSelection = (type) => {
    switch(type) {
      case 'event':
        navigate('/create-event');
        break;
      case 'workshop':
        navigate('/create-workshop');
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
            <div className="type-icon">🛠️</div>
            <h2>Workshop</h2>
            <p>Host an interactive learning session</p>
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
            <div className="type-icon">🔧</div>
            <h2>Service</h2>
            <p>Offer a professional service</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateType;
