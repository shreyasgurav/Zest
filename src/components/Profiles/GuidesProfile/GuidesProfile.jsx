import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { FaMapMarkerAlt, FaPhone, FaGlobe, FaDollarSign, FaExternalLinkAlt, FaCopy, FaCheck } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import "./GuidesProfile.css";
import { Helmet } from 'react-helmet-async';

const GuideProfileSkeleton = () => {
  return (
    <div className="guide-profile-container">
      <div className="guide-content">
        <div className="guide-profile-image skeleton-loading">
          <div className="skeleton-background"></div>
        </div>
        
        <div className="guide-info-box skeleton-loading">
          <div className="guide-info">
            <div className="skeleton-line skeleton-title"></div>
            
            <div className="guide-detail">
              <FaDollarSign />
              <div className="skeleton-line skeleton-price"></div>
            </div>
            
            <div className="guide-detail">
              <FaMapMarkerAlt />
              <div className="skeleton-line skeleton-address"></div>
            </div>

            <div className="guide-detail">
              <FaPhone />
              <div className="skeleton-line skeleton-contact"></div>
            </div>

            <div className="guide-detail">
              <FaGlobe />
              <div className="skeleton-line skeleton-website"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GuideProfile = () => {
  const { guideId, itemIndex, slug } = useParams();
  const navigate = useNavigate();
  const [guideItem, setGuideItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Touch/swipe handling refs
  const carouselRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const fetchGuideItem = async () => {
      try {
        let guideData;
        let actualGuideId = guideId;
        
        if (slug) {
          // If accessed via slug URL, first get the guide by slug
          const guidesRef = collection(db, "guides");
          const q = query(guidesRef, where("slug", "==", slug));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            guideData = doc.data();
            actualGuideId = doc.id; // Store the actual guide ID
          }
        } else if (guideId) {
          // Direct access via guide ID
          const guideDocRef = doc(db, "guides", guideId);
          const guideSnapshot = await getDoc(guideDocRef);
          
          if (guideSnapshot.exists()) {
            guideData = guideSnapshot.data();
          }
        }
        
        if (guideData && guideData.items && guideData.items[itemIndex]) {
          setGuideItem(guideData.items[itemIndex]);
          
          // Redirect to slug URL if we accessed via ID and a slug exists
          if (guideId && !slug && guideData.slug) {
            navigate(`/guide-item/${guideData.slug}/${itemIndex}`, { replace: true });
            return;
          }
        } else {
          setError("Guide item not found");
        }
      } catch (err) {
        console.error("Error fetching guide item:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuideItem();
  }, [guideId, slug, itemIndex, navigate]);

  const nextImage = () => {
    if (guideItem && guideItem.photos) {
      setCurrentImageIndex((prev) => (prev + 1) % guideItem.photos.length);
    }
  };

  const prevImage = () => {
    if (guideItem && guideItem.photos) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? guideItem.photos.length - 1 : prev - 1
      );
    }
  };

  // Touch/swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50; // Minimum distance for a swipe

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        nextImage(); // Swipe left
      } else {
        prevImage(); // Swipe right
      }
    }
    
    isDragging.current = false;
  };

  const handleCopyPhone = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(guideItem.contactInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading... - Zest</title>
        </Helmet>
        <GuideProfileSkeleton />
      </>
    );
  }

  if (error || !guideItem) {
    return (
      <>
        <Helmet>
          <title>Item Not Found - Zest</title>
          <meta name="description" content="The requested item could not be found." />
        </Helmet>
        <div className="guide-profile-container" style={{ textAlign: 'center', color: 'white', padding: '30px' }}>
          <h2>Error</h2>
          <p>{error || "Guide item not found"}</p>
        </div>
      </>
    );
  }

  // Generate structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": guideItem.name,
    "address": guideItem.address,
    "telephone": guideItem.contactInfo,
    "url": guideItem.website,
    "priceRange": `₹${guideItem.price}`,
    "image": guideItem.photos && guideItem.photos.length > 0 ? guideItem.photos[0] : null
  };

  return (
    <>
      <Helmet>
        <title>{guideItem.name} - ₹{guideItem.price} | Zest Mumbai Guide</title>
        <meta name="description" content={`${guideItem.name} in Mumbai. Price: ₹${guideItem.price}. Location: ${guideItem.address}. Contact: ${guideItem.contactInfo}`} />
        <meta property="og:title" content={`${guideItem.name} - ₹${guideItem.price} | Zest Mumbai Guide`} />
        <meta property="og:description" content={`${guideItem.name} in Mumbai. Price: ₹${guideItem.price}. Location: ${guideItem.address}`} />
        <meta property="og:type" content="place" />
        {guideItem.photos && guideItem.photos[0] && <meta property="og:image" content={guideItem.photos[0]} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${guideItem.name} - ₹${guideItem.price} | Zest`} />
        <meta name="twitter:description" content={`${guideItem.name} in Mumbai. Price: ₹${guideItem.price}. Location: ${guideItem.address}`} />
        {guideItem.photos && guideItem.photos[0] && <meta name="twitter:image" content={guideItem.photos[0]} />}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      <div className="guide-profile-container">
        <div className="guide-content">
          <div className="guide-profile-image">
            {guideItem.photos && guideItem.photos.length > 0 ? (
              <div 
                className="image-carousel"
                ref={carouselRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="carousel-track" style={{ 
                  transform: `translateX(-${currentImageIndex * 100}%)`
                }}>
                  {guideItem.photos.map((photo, index) => (
                    <div key={index} className="carousel-slide">
                      <img 
                        src={photo} 
                        alt={`${guideItem.name} - ${index + 1}`}
                        draggable="false"
                      />
                    </div>
                  ))}
                </div>
                
                {guideItem.photos.length > 1 && (
                  <>
                    <button 
                      className="carousel-btn prev" 
                      onClick={prevImage}
                      style={{ opacity: currentImageIndex > 0 ? 1 : 0.5 }}
                    >
                      <FiChevronLeft />
                    </button>
                    <button 
                      className="carousel-btn next" 
                      onClick={nextImage}
                      style={{ opacity: currentImageIndex < guideItem.photos.length - 1 ? 1 : 0.5 }}
                    >
                      <FiChevronRight />
                    </button>
                    
                    <div className="carousel-dots">
                      {guideItem.photos.map((_, index) => (
                        <span
                          key={index}
                          className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                        >
                          {index + 1}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="no-image">No Image Available</div>
            )}
          </div>
          
          <div className="guide-info-box">
            <div className="guide-info">
              <h2 className="guide-item-title">{guideItem.name}</h2>
              
              <div className="guide-detail price-detail">
                <span className="price-amount">₹{guideItem.price}</span>
                {guideItem.pricingUrl && (
                  <a
                    href={guideItem.pricingUrl.startsWith('http') ? guideItem.pricingUrl : `https://${guideItem.pricingUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pricing-link"
                  >
                    <FaExternalLinkAlt />
                    Check Pricing
                  </a>
                )}
              </div>
              
              <div className="guide-detail location-detail">
                <FaMapMarkerAlt className="icon" />
                <a 
                  href={guideItem.addressLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="address-link"
                >
                  {guideItem.address}
                </a>
              </div>

              <div className="guide-detail contact-detail">
                <FaPhone />
                <span>{guideItem.contactInfo}</span>
                <button className="copy-button" onClick={handleCopyPhone}>
                  {copied ? <FaCheck className="icon" /> : <FaCopy className="icon" />}
                </button>
              </div>

              {guideItem.website && (
                <div className="guide-detail website-detail">
                  <FaGlobe className="icon" />
                  <a 
                    href={guideItem.website.startsWith('http') ? guideItem.website : `https://${guideItem.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="website-link"
                  >
                    {guideItem.website
                      .replace(/^https?:\/\//i, '')
                      .replace(/^www\./i, '')
                      .split('/')[0]}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button 
            className="back-button"
            onClick={() => {
              if (slug) {
                navigate(`/guides/${slug}`);
              } else if (guideId) {
                navigate(`/guidepage/${guideId}`);
              } else {
                navigate('/guides');
              }
            }}
            style={{
              padding: '10px 20px',
              background: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Back to Guide
          </button>
        </div>
      </div>
    </>
  );
};

export default GuideProfile;
