import React, { useState, useEffect } from "react";
import { HashRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
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
import { ProfileGuard } from "./ProfileGuard";
import ProfileCompletionForm from "./ProfileCompletionForm/ProfileCompletionForm";


function App() {
    const [events, setEvents] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const { isAuthenticated, isLoading } = useAuth0();

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch("http://localhost:5000/api/events");
            if (!response.ok) throw new Error('Failed to fetch events');
            const data = await response.json();
            
            const formattedEvents = data.map(event => ({
                id: event.id,
                eventImage: event.event_image,
                eventTitle: event.event_title,
                hostingClub: event.hosting_club,
                eventDateTime: event.event_date_time,
                eventVenue: event.event_venue,
                eventRegistrationLink: event.event_registration_link,
                type: event.event_type
            }));
    
            setEvents(formattedEvents.filter(event => event.type === "event"));
            setWorkshops(formattedEvents.filter(event => event.type === "workshop"));
        } catch (error) {
            console.error("Error fetching events:", error);
        }
    };

    const handleEventSubmit = async (eventData) => {
        try {
            const response = await fetch("http://localhost:5000/api/add-event", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(eventData),
            });

            if (response.ok) {
                fetchEvents();
            }
        } catch (error) {
            console.error("Error submitting event:", error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <div className="App">
                <div className="app-container">
                    <Header onEventSubmit={fetchEvents} />
                    <main className="main-content">
                        <Routes>
                            {/* Public routes */}
                            <Route
                                path="/"
                                element={
                                    <>
                                        <EventSection events={events} />
                                        <WorkshopSection workshops={workshops} />
                                    </>
                                }
                            />
                            <Route path="/about-us" element={<AboutUs />} />
                            <Route path="/our-services" element={<OurServices />} />
                            <Route path="/contact-us" element={<ContactUs />} />
                            
                            {/* Protected routes */}
                            <Route
                                path="/complete-profile"
                                element={
                                    isAuthenticated ? (
                                        <ProfileCompletionForm />
                                    ) : (
                                        <Navigate to="/" replace />
                                    )
                                }
                            />

                            {/* Routes that require completed profile */}
                            <Route
                                path="/user-profile"
                                element={
                                    isAuthenticated ? (
                                        <ProfileGuard>
                                            <UserProfile />
                                        </ProfileGuard>
                                    ) : (
                                        <Navigate to="/" replace />
                                    )
                                }
                            />
                            <Route
                                path="/council-profile"
                                element={
                                    isAuthenticated ? (
                                        <ProfileGuard>
                                            <CouncilProfile />
                                        </ProfileGuard>
                                    ) : (
                                        <Navigate to="/" replace />
                                    )
                                }
                            />
                            <Route
                                path="/event/:id"
                                element={
                                    isAuthenticated ? (
                                        <ProfileGuard>
                                            <EventProfile events={events} />
                                        </ProfileGuard>
                                    ) : (
                                        <Navigate to="/" replace />
                                    )
                                }
                            />
                            <Route
                                path="/workshop/:id"
                                element={
                                    isAuthenticated ? (
                                        <ProfileGuard>
                                            <WorkshopProfile workshops={workshops} />
                                        </ProfileGuard>
                                    ) : (
                                        <Navigate to="/" replace />
                                    )
                                }
                            />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </div>
        </Router>
    );
}

export default App;