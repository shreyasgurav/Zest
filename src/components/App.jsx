import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./Header/header";
import EventSection from "./EventSection/EventSection";
import WorkshopSection from "./WorkshopSection/WorkshopSection";
import Footer from "./Footer/footer";
import EventProfile from "./EventProfile/EventProfile";
import WorkshopProfile from "./WorkshopProfile/WorkshopProfile";
import UserProfile from "./UserProfile/UserProfile";
import CouncilProfile from "./CouncilProfile/CouncilProfile";

function App() {
    const [events, setEvents] = useState([]);
    const [workshops, setWorkshops] = useState([]);

    const handleEventSubmit = (eventData) => {
        if (eventData.type === 'workshop') {
            setWorkshops(prevWorkshops => [...prevWorkshops, { ...eventData, id: Date.now() }]);
        } else {
            setEvents(prevEvents => [...prevEvents, { ...eventData, id: Date.now() }]);
        }
    };

    return (
        <Router>
            <div className="App">
                <Header onEventSubmit={handleEventSubmit} />
                <Routes>
                    <Route path="/" element={<><EventSection events={events} /><WorkshopSection workshops={workshops} /></>} />
                    <Route path="/event/:id" element={<EventProfile events={events} />} />
                    <Route path="/workshop/:id" element={<WorkshopProfile workshops={workshops} />} />
                    <Route path="/user-profile" element={<UserProfile />} />
                    <Route path="/council-profile" element={<CouncilProfile />} />
                </Routes>
                <Footer />
            </div>
        </Router>
    );
}

export default App;