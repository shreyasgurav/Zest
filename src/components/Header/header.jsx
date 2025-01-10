import logo from './header-images/zest-logo.png';
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import AddEventForm from './AddEventForm/AddEventForm';
import PersonLogo from "./PersonLogo/PersonLogo";
import "./header.css";
import { useNavigate, Link } from 'react-router-dom';

const Header = ({ onEventSubmit }) => {
    const [isSearchVisible, setSearchVisible] = useState(false);
    const [isNavActive, setNavActive] = useState(false);
    const [isEventFormVisible, setEventFormVisible] = useState(false);
    const [userEmail, setUserEmail] = useState(null);
    const navigate = useNavigate();
    
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserEmail(user.email);
            } else {
                setUserEmail(null);
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const toggleSearch = () => {
        setSearchVisible(!isSearchVisible);
        if (!isSearchVisible) {
            setNavActive(false);
        }
    };

    const toggleNav = () => {
        setNavActive(!isNavActive);
        if (isNavActive) {
            setSearchVisible(false);
        }
    };

    const toggleEventForm = () => {
        setEventFormVisible(!isEventFormVisible);
    };

    const handleProfileClick = () => {
        navigate('/user-profile');
    };

    // Function to check if user has admin privileges
    const isAdmin = () => {
        return userEmail === "shrreyasgurav@gmail.com";
    };

    return (
        <div className={`nav-container ${isNavActive ? 'active' : ''}`}>
            <nav>
                <ul className="mobile-nav">
                    <li>
                        <div className="menu-icon-container" onClick={toggleNav}>
                            <div className="menu-icon">
                                <span className="line-1"></span>
                                <span className="line-2"></span>
                            </div>
                        </div>
                    </li>
                    <li>
                        <Link to="/" className="link-logo">
                            <img className='link-logo' src={logo} alt="Zest Logo" />
                        </Link>
                    </li>
                    <li>
                        <a className="link-Profile-logo"><PersonLogo /></a>
                    </li>
                </ul>

                <ul className={`desktop-nav ${isNavActive ? 'show' : ''}`}>
                    <li>
                        <Link to="/" className="link-logo">
                            <img className='link-logo' src={logo} alt="Zest Logo" />
                        </Link>
                    </li>
                    <li><a href="#">Events</a></li>
                    <li><a href="#">Workshops</a></li>
                    <li><a href="#">Experiences</a></li>
                    <li><a href="#">Leisures</a></li>
                    {isAdmin() && (
                        <li>
                            <a className="link-add-event" onClick={toggleEventForm}>List Events</a>
                        </li>
                    )}
                    <li>
                        <a href="#" className="link-search" onClick={toggleSearch}></a>
                    </li>
                    <li>
                        <a className="link-Profile-logo"><PersonLogo /></a>
                    </li>
                </ul>
            </nav>

            {isEventFormVisible && (
                <AddEventForm onClose={toggleEventForm} onSubmit={onEventSubmit} />
            )}
        </div>
    );
};

export default Header;