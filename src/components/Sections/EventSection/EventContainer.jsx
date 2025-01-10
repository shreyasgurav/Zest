import React, { useState, useEffect } from 'react';
import EventSection from './EventSection';
import { Routes, Route } from 'react-router-dom';
import EventProfile from './EventProfile';

function EventContainer() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch('http://localhost:5000/events');
            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }
            const data = await response.json();
            setEvents(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <Routes>
            <Route 
                path="/" 
                element={<EventSection events={events} />} 
            />
            <Route 
                path="/event/:id" 
                element={<EventProfile events={events} />} 
            />
        </Routes>
    );
}

export default EventContainer;