import logo from './header-images/zest-logo.png';
import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
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
            if (user && user.providerData[0].providerId === 'google.com') {
                setUserEmail(user.email);
            } else {
                setUserEmail(null);
            }
        });

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

    const isAuthorizedUser = () => {
        return userEmail === "shrreyasgurav@gmail.com";
    };

    const handleNavItemClick = () => {
        setNavActive(false);
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
                        <Link to="/" className="link-logo" onClick={handleNavItemClick}>
                            <img className='link-logo' src={logo} alt="Zest Logo" />
                        </Link>
                    </li>
                    <li><Link to="/about" onClick={handleNavItemClick}>About</Link></li>
                    <li><Link to="/guides" onClick={handleNavItemClick}>Guides</Link></li>
                    {isAuthorizedUser() && (
                        <li>
                            <Link to="/create" onClick={handleNavItemClick}>Create</Link>
                        </li>
                    )}
                    <li>
                       {/* <a href="#" className="link-search" onClick={toggleSearch}></a> */}
                    </li>
                    <li>
                        <a className="link-Profile-logo" onClick={handleNavItemClick}><PersonLogo /></a>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Header;