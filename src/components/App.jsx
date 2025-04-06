import React, { useState, useEffect, Suspense } from "react";
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

// Create a simple error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
          <h2>Something went wrong</h2>
          <p>We're working on fixing this issue. Please try again later.</p>
          <button onClick={() => window.location.href = '/'} 
                  style={{ padding: '10px 20px', marginTop: '15px', cursor: 'pointer' }}>
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create a loading component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    color: 'white' 
  }}>
    <div>
      <h3>Loading...</h3>
      <p>Please wait while we prepare your content</p>
    </div>
  </div>
);

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
            const apiUrl = window.location.hostname === 'localhost' 
                ? "http://localhost:5000/api/events" 
                : "https://zestlive.in";
            
            const response = await fetch(apiUrl);
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
            const apiUrl = window.location.hostname === 'localhost' 
                ? "http://localhost:5000/api/add-event" 
                : "https://zestlive.in";
            
            const response = await fetch(apiUrl, {
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
        
        if (userData && userData.username && userData.phone) {
            return <Navigate to="/profile" />;
        }
        
        const handleComplete = () => {
            window.location.href = "/profile";
        };
        
        return <PostLoginModal user={currentUser} onComplete={handleComplete} />;
    };

    const ProtectedProfile = () => {
        if (!currentUser) {
            return <Navigate to="/" />;
        }
        return <UserProfile />;
    };

    return (
        <Router>
            <div className="App">
                <div className="app-container">
                    <Header onEventSubmit={fetchEvents} />
                    <main className="main-content">
                        <ErrorBoundary>
                            <Suspense fallback={<LoadingFallback />}>
                                <Routes>
                                    <Route
                                        path="/"
                                        element={
                                            <>
                                                <GuidesSection experiences={experiences} />
                                            </>
                                        }
                                    />
                                    <Route path="/blogs" element={<BlogsPage />} />
                                    <Route path="/about" element={<AboutUs />} />
                                    <Route path="/our-services" element={<OurServices />} />
                                    <Route path="/contact" element={<ContactUs />} />
                                    <Route path="/event-profile/:id" element={
                                        <ErrorBoundary>
                                            <EventProfile events={events} />
                                        </ErrorBoundary>
                                    } />
                                    <Route path="/workshop-profile/:id" element={
                                        <ErrorBoundary>
                                            <WorkshopProfile workshops={workshops} />
                                        </ErrorBoundary>
                                    } />
                                    <Route path="/experiences-profile/:id" element={
                                        <ErrorBoundary>
                                            <ExperiencesProfile experiences={experiences} />
                                        </ErrorBoundary>
                                    } />
                                    <Route path="/profile" element={<ProtectedProfile />} />
                                    <Route path="/create-event" element={<CreateEvent />} />
                                    <Route path="/create-guide" element={<CreateGuide />} />
                                    <Route path="/guides/:slug" element={<GuidePage />} />
                                    <Route path="/guidepage/:guideId" element={<GuidePage />} />
                                    <Route path="/guide-item/:slug/:itemIndex" element={<GuideProfile />} />
                                    <Route path="/guide-profile/:guideId/:itemIndex" element={<GuideProfile />} />
                                    <Route path="/edit-guide/:id" element={<EditGuide />} />
                                    <Route path="/create" element={<EventTypeSelection />} />
                                    <Route path="/create-type" element={<CreateType />} />
                                    <Route path="/postlogin" element={<PostLoginWithAuth />} />
                                    <Route path="/events" element={<AllEvents />} />
                                    <Route path="/guides" element={<AllGuides />} />
                                    <Route path="*" element={
                                        <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
                                            <h2>Page Not Found</h2>
                                            <p>The page you're looking for doesn't exist.</p>
                                            <button onClick={() => window.location.href = '/'} 
                                                    style={{ padding: '10px 20px', marginTop: '15px', cursor: 'pointer' }}>
                                                Return to Home
                                            </button>
                                        </div>
                                    } />
                                </Routes>
                            </Suspense>
                        </ErrorBoundary>
                    </main>
                </div>
            </div>
            <Footer />
        </Router>
    );
}

export default App;