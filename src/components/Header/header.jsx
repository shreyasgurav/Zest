import logo from './header-images/zest-logo.png';
import React, { useState } from 'react';
import AddEventForm from './AddEventForm/AddEventForm'; // Import the new component
import PersonLogo from "./PersonLogo/PersonLogo";
import "./header.css";
import { useNavigate, Link } from 'react-router-dom';

const Header = ({ onEventSubmit }) => {
    const [isSearchVisible, setSearchVisible] = useState(false);
    const [isNavActive, setNavActive] = useState(false);
    const [isEventFormVisible, setEventFormVisible] = useState(false); // New state for event form visibility
    const navigate = useNavigate();

    const toggleSearch = () => {
        setSearchVisible(!isSearchVisible);
        if (!isSearchVisible) {
            setNavActive(false); // Close nav when search is opened
        }
    };

    const toggleNav = () => {
        setNavActive(!isNavActive);
        if (isNavActive) {
            setSearchVisible(false); // Close search when nav is opened
        }
    };

    const toggleEventForm = () => {
        setEventFormVisible(!isEventFormVisible); // Toggle event form visibility
    };

    const handleProfileClick = () => {
        navigate('/user-profile'); // Redirect to user profile page
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
                    <li>
                            <a className="link-add-event" onClick={toggleEventForm}>List Events</a>
                        </li>
                   
                    <li>
                        <a href="#" className="link-search" onClick={toggleSearch}></a>
                    </li>
                    <li>
                        <a className="link-Profile-logo"><PersonLogo /></a>
                    </li>
                </ul>
            </nav>

            {/* Event Form Popup */}
            {isEventFormVisible && (
                <AddEventForm onClose={toggleEventForm} onSubmit={onEventSubmit} /> // Pass onAddEvent function
            )}
        </div>
    );
};

export default Header;
