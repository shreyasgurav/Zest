import React, { useState } from "react";
import Header from "./Header/header";
import EventSection from "./EventSection/EventSection";
import WorkshopSection from "./WorkshopSection/WorkshopSection";
import Footer from "./Footer/footer";
import ImageAvatars from "./Avatar/avatar";

function App() {
    const [events, setEvents] = useState([]); // State to hold events
    const [workshops, setWorkshops] = useState([]); // State to hold workshops

    const addEvent = (eventData) => {
        if (eventData.type === 'event') {
            const newEvent = {
                eventImage: eventData.eventImage,
                eventTitle: eventData.eventTitle,
                eventDateTime: eventData.eventDateTime,
                eventVenue: eventData.eventVenue,
                eventRegistrationLink: eventData.eventRegistrationLink, // Include registration link if needed
            };
            setEvents([...events, newEvent]); // Add new event to the events array
        } else if (eventData.type === 'workshop') {
            const newWorkshop = {
                eventImage: eventData.eventImage,
                eventTitle: eventData.eventTitle,
                eventDateTime: eventData.eventDateTime,
                eventVenue: eventData.eventVenue,
                eventRegistrationLink: eventData.eventRegistrationLink, // Include registration link if needed
            };
            setWorkshops([...workshops, newWorkshop]); // Add new workshop to the workshops array
        }
    };

    return (
        <div className="App">
            <Header onAddEvent={addEvent} /> {/* Pass addEvent function to Header */}
            <EventSection events={events} /> {/* Pass events to EventSection */}
            <WorkshopSection workshops={workshops} /> {/* Pass workshops to WorkshopSection */}
            <Footer />
        </div>
    );
}

export default App;