// AllEvents.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import EventBox from '../../Sections/EventSection/EventBox/EventBox';
import AllEventsSkeleton from './AllEventsSkeleton';
import './AllEvents.css';

const AllEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsCollection = collection(db, 'events');
        const eventSnapshot = await getDocs(eventsCollection);
        const eventsList = eventSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <AllEventsSkeleton />;
  }

  return (
    <div className="all-events-container">
      <div className="all-events-content">
        <h1 className="all-events-title">All Events</h1>
        {events.length === 0 ? (
          <div className="no-events">
            <p>No events found</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <div key={event.id} className="event-item">
                <EventBox event={event} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllEvents;