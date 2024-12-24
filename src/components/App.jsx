import React, { useState } from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./Header/header";
import EventSection from "./EventSection/EventSection";
import WorkshopSection from "./WorkshopSection/WorkshopSection";
import Footer from "./Footer/footer";
import EventProfile from "./Profiles/EventProfile/EventProfile";
import WorkshopProfile from "./Profiles/WorkshopProfile/WorkshopProfile";
import UserProfile from "./Profiles/UserProfile/UserProfile";
import CouncilProfile from "./Profiles/CouncilProfile/CouncilProfile";
import AboutUs from "./Footer/AboutUs/AboutUs";
import OurServices from "./Footer/OurServices/OurServices";
import ContactUs from "./Footer/ContactUs/ContactUs";
import "./App.css";

function App() {
    const [events, setEvents] = useState([
        {
            id: 1,
            eventImage: "data:image/jpeg;base64,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",
            eventTitle: "Sample Event",
            type: "Event",
            eventDateTime: new Date().toISOString(),
            eventVenue: "Auditorium",
            eventRegistrationLink: "https://example.com/register",
            hostingClub: "Nigga Club",
            aboutEvent: "Woof woof mf, it's an sample event nigga don't register."
        }
    ]);
    const [workshops, setWorkshops] = useState([]);

    const handleEventSubmit = (eventData) => {
        if (eventData.type === "workshop") {
            setWorkshops((prevWorkshops) => [
                ...prevWorkshops,
                { ...eventData, id: Date.now() },
            ]);
        } else {
            setEvents((prevEvents) => [
                ...prevEvents,
                { ...eventData, id: Date.now() },
            ]);
        }
    };

    return (
        <Router>
            <div className="App">
                <div className="app-container">
                    <Header onEventSubmit={handleEventSubmit} />
                    <main className="main-content">
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <>
                                        <EventSection events={events} />
                                        <WorkshopSection workshops={workshops} />
                                    </>
                                }
                            />
                            <Route
                                path="/event/:id"
                                element={<EventProfile events={events} />}
                            />
                            <Route
                                path="/workshop/:id"
                                element={<WorkshopProfile workshops={workshops} />}
                            />
                            <Route path="/user-profile" element={<UserProfile />} />
                            <Route path="/council-profile" element={<CouncilProfile />} />
                            <Route path="/about-us" element={<AboutUs />} />
                            <Route path="/our-services" element={<OurServices />} />
                            <Route path="/contact-us" element={<ContactUs />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </div>
        </Router>
    );
}

export default App;
