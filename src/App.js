import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {

  // State for desktop search, overlay, and mobile nav
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isMobileNavActive, setIsMobileNavActive] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  // Event handlers for desktop search
  const handleSearchClick = () => {
    setIsSearchActive(true);
    setIsOverlayVisible(true);
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setIsOverlayVisible(false);
  };

  const handleOverlayClick = () => {
    setIsSearchActive(false);
    setIsOverlayVisible(false);
  };

  // Event handlers for mobile menu
  const handleMenuClick = () => {
    setIsMobileNavActive(!isMobileNavActive);
  };

  const handleSearchInputClick = () => {
    setIsMobileSearchActive(true);
  };

  const handleCancelClick = () => {
    setIsMobileSearchActive(false);
  };

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {/* Desktop Navigation */}
      <nav className="desktop-nav">
        <button className="link-search" onClick={handleSearchClick}>Search</button>
        {/* Other nav items */}
      </nav>

      {/* Search Container for Desktop */}
      <div className={`search-container ${isSearchActive ? '' : 'hide'}`}>
        <button className="link-close" onClick={handleCloseSearch}>Close</button>
        {/* Search form */}
      </div>

      {/* Overlay */}
      <div className={`overlay ${isOverlayVisible ? 'show' : ''}`} onClick={handleOverlayClick}></div>

      {/* Mobile Menu */}
      <nav className="mobile-nav">
        <div className="menu-icon-container" onClick={handleMenuClick}>
          <span className="menu-icon">Menu</span>
        </div>
        <div className={`nav-container ${isMobileNavActive ? 'active' : ''}`}>
          {/* Mobile navigation links */}
        </div>
      </nav>

      {/* Mobile Search */}
      <div className="mobile-search-container">
        <input 
          type="text" 
          onClick={handleSearchInputClick} 
          className="search-bar"
          placeholder="Search..."
        />
        <button className="cancel-btn" onClick={handleCancelClick}>Cancel</button>
      </div>
    </div>
  
  );

}

export default App;
