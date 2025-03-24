import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import { auth, db } from "./firebase";
import { getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import Header from "./Header/header";
import Footer from "./Footer/footer";
import BlogsPage from "./Blogs/Blogs";
import EventSection from "./Sections/EventSection/EventSection";
import WorkshopSection from "./Sections/WorkshopSection/WorkshopSection";
import GuidesSection from "./Sections/GuidesSection/GuidesSection";
import UserProfile from "./Profiles/UserProfile/UserProfile";
import EventProfile from "./Profiles/EventProfile/EventProfile";
import WorkshopProfile from "./Profiles/WorkshopProfile/WorkshopProfile";
import ExperiencesProfile from "./Profiles/ExperiecesProfile/ExperiencesProfile";
import AllEvents from "./SeeAll/AllEvents/AllEvents";
import CreateEvent from "./Create/CreateEvents/CreateEvent";
import CreateGuide from "./Create/CreateGuide/CreateGuide";
import GuidePage from "./GuidesPage/GuidesPage";
import GuideItems from "./GuidesPage/GuideItems/GuideItems";
import EditGuide from "./Sections/GuidesSection/EditGuidePopup/EditGuide";
import GuideProfile from "./Profiles/GuidesProfile/GuidesProfile";
import AllGuides from "./SeeAll/AllGuides/AllGuides";
import EventTypeSelection from "./Create/CreateType/CreateType";
import CreateType from './Create/CreateType/CreateType';
import PostLoginModal from "./Authentication/components/PostLoginFlows/PostLoginFlows";
import AboutUs from "./Footer/AboutUs/AboutUs";
import OurServices from "./Footer/OurServices/OurServices";
import ContactUs from "./Footer/ContactUs/ContactUs";

function App() {
    const [events, setEvents] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [experiences, setExperiences] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        
        return () => unsubscribe();
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
                type: event.event_type,
                aboutEvent: event.about_event
            }));
    
            setEvents(formattedEvents.filter(event => event.type === "event"));
            setWorkshops(formattedEvents.filter(event => event.type === "workshop"));
            setExperiences(formattedEvents.filter(event => event.type === "experiences"));
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

    const PostLoginWithAuth = () => {
        const [userData, setUserData] = useState(null);
        const [isLoading, setIsLoading] = useState(true);
        
        useEffect(() => {
            async function fetchUserData() {
                if (!currentUser) {
                    setIsLoading(false);
                    return;
                }
                
                try {
                    const userRef = doc(db, "Users", currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        setUserData(data);
                        if (data.username && data.phone) {
                            window.location.href = "/profile";
                        }
                    }
                    setIsLoading(false);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setIsLoading(false);
                }
            }
            
            fetchUserData();
        }, [currentUser]);
        
        if (isLoading) {
            return <div>Loading...</div>;
        }
        
        if (!currentUser) {
            return <Navigate to="/" />;
        }
        
        return <PostLoginModal user={currentUser} />;
    };

    const ProtectedProfile = () => {
        const [userData, setUserData] = useState(null);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            async function fetchUserData() {
                if (!currentUser) {
                    setIsLoading(false);
                    return;
                }

                try {
                    const userRef = doc(db, "Users", currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setUserData(userSnap.data());
                    }
                    setIsLoading(false);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setIsLoading(false);
                }
            }

            fetchUserData();
        }, [currentUser]);

        if (isLoading) {
            return <div>Loading...</div>;
        }

        if (!currentUser) {
            return <Navigate to="/" />;
        }

        if (!userData?.username || !userData?.phone) {
            return <Navigate to="/postlogin" />;
        }

        return <UserProfile />;
    };

    return (
        <Router>
            <div className="App">
                <div className="app-container">
                    <Header onEventSubmit={fetchEvents} />
                    <main className="main-content">
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <>

                                        <GuidesSection experiences={experiences} />
                                       {/* <EventSection events={events} /> */}
                                    </>
                                }
                            />
                            <Route path="/blogs" element={<BlogsPage />} />
                            <Route path="/about" element={<AboutUs />} />
                            <Route path="/our-services" element={<OurServices />} />
                            <Route path="/contact" element={<ContactUs />} />
                            <Route path="/event-profile/:id" element={<EventProfile events={events} />} />
                            <Route path="/workshop-profile/:id" element={<WorkshopProfile workshops={workshops} />} />
                            <Route path="/experiences-profile/:id" element={<ExperiencesProfile experiences={experiences} />} />
                            <Route path="/profile" element={<ProtectedProfile />} />

                            <Route path="/create-event" element={<CreateEvent />} />
                            <Route path="/create-guide" element={<CreateGuide />} />
                            <Route path="/guidepage/:guideId" element={<GuidePage />} />
                            <Route path="/guide-profile/:guideId/:itemIndex" element={<GuideProfile />} />
                            <Route path="/edit-guide/:id" element={<EditGuide />} />



                            <Route path="/create" element={<EventTypeSelection />} />
                            <Route path="/create-type" element={<CreateType />} />
                            <Route path="/postlogin" element={<PostLoginWithAuth />} />
                            <Route path="/events" element={<AllEvents />} />
                            <Route path="/guides" element={<AllGuides />} />
                        </Routes>
                    </main>
                </div>
            </div>
            <Footer />
        </Router>
    );
}

export default App;