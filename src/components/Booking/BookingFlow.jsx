import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../Header/PersonLogo/components/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './BookingFlow.css';

const BookingFlow = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const [step, setStep] = useState(1);
  const [event, setEvent] = useState(null);
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [userInfo, setUserInfo] = useState({
    name: '',
    username: '',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() });
        } else {
          setError('Event not found');
        }
      } catch (err) {
        setError('Error fetching event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      }
    };

    fetchUserInfo();
  }, []);

  const handleTicketSelect = () => {
    if (selectedDateTime && ticketQuantity > 0) {
      setStep(2);
    }
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      const bookingData = {
        eventId,
        userId: auth.currentUser.uid,
        organizerId: event.organizationId,
        eventTitle: event.title,
        dateTime: selectedDateTime,
        ticketQuantity,
        userInfo,
        status: 'confirmed',
        createdAt: serverTimestamp(),
      };

      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
      navigate(`/booking-confirmation/${bookingRef.id}`);
    } catch (err) {
      setError('Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="booking-flow">
      {/* Progress Bar */}
      <div className="booking-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1. Select Tickets</div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2. Review & Pay</div>
      </div>

      {/* Step 1: Combined Date & Ticket Selection */}
      {step === 1 && (
        <div className="booking-step">
          <h2>Select Tickets</h2>
          <div className="ticket-selector">
            <div className="event-info">
              <img src={event.event_image} alt={event.title} className="event-thumbnail" />
              <h3>{event.title}</h3>
              <p className="event-venue">{event.event_venue}</p>
            </div>

            <div className="datetime-selector">
              <h4>Select Date & Time</h4>
              <div className="available-dates">
                {/* You can map through available dates here */}
                <button 
                  className={`date-option ${selectedDateTime === event.event_date_time ? 'selected' : ''}`}
                  onClick={() => setSelectedDateTime(event.event_date_time)}
                >
                  <div className="date">
                    {new Date(event.event_date_time).toLocaleDateString()}
                  </div>
                  <div className="time">
                    {new Date(event.event_date_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </button>
                {/* Add more date options if available */}
              </div>
            </div>

            {selectedDateTime && (
              <div className="ticket-quantity-section">
                <h4>Number of Tickets</h4>
                <div className="ticket-quantity">
                  <button 
                    onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                    className="quantity-button"
                  >
                    -
                  </button>
                  <span>{ticketQuantity}</span>
                  <button 
                    onClick={() => setTicketQuantity(ticketQuantity + 1)}
                    className="quantity-button"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
          <button 
            className="next-button"
            onClick={handleTicketSelect}
            disabled={!selectedDateTime || ticketQuantity < 1}
          >
            Continue to Review
          </button>
        </div>
      )}

      {/* Step 2: Summary & Confirmation */}
      {step === 2 && (
        <div className="booking-step">
          <h2>Booking Summary</h2>
          <div className="booking-summary">
            <div className="event-summary">
              <img src={event.event_image} alt={event.title} />
              <div className="event-details">
                <h3>{event.title}</h3>
                <p>Date: {new Date(selectedDateTime).toLocaleDateString()}</p>
                <p>Time: {new Date(selectedDateTime).toLocaleTimeString()}</p>
                <p>Tickets: {ticketQuantity}</p>
                <p>Venue: {event.event_venue}</p>
              </div>
            </div>
            
            <div className="user-info">
              <h3>Your Information</h3>
              <p>Name: {userInfo.name}</p>
              <p>Username: {userInfo.username}</p>
              <p>Phone: {userInfo.phone}</p>
            </div>
          </div>
          <button 
            className="book-button"
            onClick={handleBooking}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Book Tickets'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingFlow; 