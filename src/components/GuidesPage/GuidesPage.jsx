import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import AddGuideItem from "./AddGuideItems/AddGuideItems";
import EditGuideItem from "./EditGuideItem/EditGuideItem";
import "./GuidesPage.css";
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FaEdit } from 'react-icons/fa';
import { collection, getDocs, query, where } from "firebase/firestore";
import { Helmet } from 'react-helmet-async';

// Helper function to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove consecutive hyphens
    .trim();                   // Trim whitespace
};

const GuideItemSkeleton = () => {
  return (
    <div className="guide-item-card skeleton-loading">
      <div className="item-image skeleton-background"></div>
      <div className="item-details">
        <div className="skeleton-line skeleton-name"></div>
        <div className="skeleton-line skeleton-price"></div>
      </div>
    </div>
  );
};

const GuidePage = () => {
  const { guideId, slug } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Set up auth listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const isAuthorized = currentUser?.email === 'shrreyasgurav@gmail.com';

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        setLoading(true);
        let guideData = null;
        let actualGuideId = guideId;
        
        if (slug) {
          // First try to fetch by slug
          const guidesRef = collection(db, "guides");
          const q = query(guidesRef, where("slug", "==", slug));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            actualGuideId = doc.id;
            guideData = {
              id: doc.id,
              ...doc.data()
            };
          }
        } else if (guideId) {
          // Fetch by ID if no slug
          const guideDocRef = doc(db, "guides", guideId);
          const guideSnapshot = await getDoc(guideDocRef);
          
          if (guideSnapshot.exists()) {
            guideData = {
              id: guideSnapshot.id,
              ...guideSnapshot.data()
            };
            
            // If guide doesn't have a slug, generate and add one
            if (!guideData.slug && guideData.name) {
              const newSlug = generateSlug(guideData.name);
              await updateDoc(guideDocRef, {
                slug: newSlug
              });
              guideData.slug = newSlug;
              // Redirect to the new slug URL
              navigate(`/guides/${newSlug}`, { replace: true });
              return;
            } else if (guideData.slug) {
              // If guide has a slug but we're on the ID URL, redirect to slug URL
              navigate(`/guides/${guideData.slug}`, { replace: true });
              return;
            }
          }
        }
        
        if (guideData) {
          setGuide({ ...guideData, actualId: actualGuideId });
        } else {
          setError("Guide not found");
        }
      } catch (error) {
        console.error("Error fetching guide:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [guideId, slug, navigate]);

  const handleItemClick = (index) => {
    if (guide.slug) {
      navigate(`/guide-profile/${guide.slug}/${index}`);
    } else {
      navigate(`/guide-profile/${guide.id}/${index}`);
    }
  };

  const handleDeleteItem = async (index) => {
    try {
      const actualId = guide.actualId || guide.id;
      const guideDocRef = doc(db, "guides", actualId);
      const guideSnapshot = await getDoc(guideDocRef);
      
      if (guideSnapshot.exists()) {
        const currentItems = guideSnapshot.data().items || [];
        const updatedItems = currentItems.filter((_, idx) => idx !== index);
        
        await updateDoc(guideDocRef, {
          items: updatedItems
        });
        
        // Refresh the guide data after deletion
        const updatedSnapshot = await getDoc(guideDocRef);
        if (updatedSnapshot.exists()) {
          setGuide({
            ...guide,
            ...updatedSnapshot.data(),
            id: updatedSnapshot.id,
            actualId: actualId
          });
        }
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item. Please try again.");
    }
  };

  if (loading || authLoading) {
    return (
      <>
        <Helmet>
          <title>Loading... - Zest</title>
        </Helmet>
        <div className="guide-page">
          <div className="guide-container">
            <div className="guide-header">
              <div className="skeleton-line skeleton-guide-title"></div>
            </div>

            <div className="guide-items-container">
              <div className="guide-items-grid">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <GuideItemSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !guide) {
    return (
      <>
        <Helmet>
          <title>Guide Not Found - Zest</title>
          <meta name="description" content="The requested guide could not be found." />
        </Helmet>
        <div className="guide-page">
          <div className="guide-container">
            <div className="error-message">{error || "Guide not found"}</div>
          </div>
        </div>
      </>
    );
  }

  const actualGuideId = guide.actualId || guide.id;
  
  // Generate SEO-friendly title based on guide name
  const generateSEOTitle = (guideName) => {
    const titleMap = {
      'Go Karting': 'Best Go-Karting Tracks in Mumbai',
      'Bowling': 'Best Bowling Alleys in Mumbai',
      'Paintball': 'Best Paintball Arenas in Mumbai',
      'Laser Tag': 'Best Laser Tag Arenas in Mumbai',
      'Trampoline Parks': 'Best Trampoline Parks in Mumbai',
      'Escape Rooms': 'Best Escape Rooms in Mumbai'
    };
    
    return titleMap[guideName] || `Best ${guideName} in Mumbai`;
  };
  
  // Generate rich meta description with keywords
  const generateMetaDescription = () => {
    if (guide.items && guide.items.length > 0) {
      const topItems = guide.items.slice(0, 3).map(item => item.name).join(', ');
      const priceRange = guide.items.reduce((acc, item) => {
        const price = parseInt(item.price);
        return {
          min: Math.min(acc.min, price),
          max: Math.max(acc.max, price)
        };
      }, { min: Infinity, max: 0 });
      
      return `Find the best ${guide.name.toLowerCase()} in Mumbai with Zest. Compare ${guide.items.length} top-rated venues including ${topItems}. Prices from ₹${priceRange.min} to ₹${priceRange.max}. Book now!`;
    }
    return `Discover the best ${guide.name.toLowerCase()} in Mumbai with Zest. Compare prices, locations, and book your experience today!`;
  };
  
  // Generate keywords based on guide type
  const generateKeywords = () => {
    const baseKeywords = `${guide.name.toLowerCase()} mumbai, best ${guide.name.toLowerCase()} mumbai, ${guide.name.toLowerCase()} near me, zest ${guide.name.toLowerCase()}`;
    const locationKeywords = guide.items ? guide.items.map(item => {
      const location = item.address?.split(',')[0] || '';
      return `${guide.name.toLowerCase()} ${location.toLowerCase()}`;
    }).join(', ') : '';
    
    return `${baseKeywords}, ${locationKeywords}`;
  };
  
  const seoTitle = generateSEOTitle(guide.name);
  const metaDescription = generateMetaDescription();
  const keywords = generateKeywords();

  return (
    <>
      <Helmet>
        <title>{seoTitle} (2025) - Zest | Book Now</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="Zest Mumbai" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content={`${seoTitle} - Zest Mumbai`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://zestlive.in/guides/${guide.slug || guide.id}`} />
        {guide.cover_image && <meta property="og:image" content={guide.cover_image} />}
        <meta property="og:site_name" content="Zest Mumbai" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${seoTitle} - Zest`} />
        <meta name="twitter:description" content={metaDescription} />
        {guide.cover_image && <meta name="twitter:image" content={guide.cover_image} />}
        <meta name="twitter:site" content="@zestmumbai" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`https://zestlive.in/guides/${guide.slug || guide.id}`} />
        
        {/* Structured Data for Local Business */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": seoTitle,
            "description": metaDescription,
            "numberOfItems": guide.items?.length || 0,
            "itemListElement": guide.items?.map((item, index) => ({
              "@type": "LocalBusiness",
              "position": index + 1,
              "name": item.name,
              "address": item.address,
              "priceRange": `₹${item.price}`,
              "telephone": item.contactInfo,
              "url": item.website
            })) || []
          })}
        </script>
      </Helmet>
      <div className="guide-page">
        <div className="guide-container">
          <div className="guide-header">
            <h1 className="guide-title">{seoTitle}</h1>
            {isAuthorized && (
              <div className="header-actions">
                <button className="add-item-button" onClick={() => setShowAddItem(true)}>
                  Add New
                </button>
              </div>
            )}
          </div>

          <div className="guide-items-container">
            {guide.items && guide.items.length > 0 ? (
              <div className="guide-items-grid">
                {guide.items.map((item, index) => (
                  <div 
                    key={index} 
                    className="guide-item-card" 
                    onClick={() => handleItemClick(index)}
                  >
                    {isAuthorized && (
                      <div className="item-actions">
                        <button 
                          className="edit-item-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItemIndex(index);
                            setShowEditItem(true);
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="delete-item-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this item?')) {
                              handleDeleteItem(index);
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className="item-image">
                      {item.photos && item.photos.length > 0 ? (
                        <img src={item.photos[0]} alt={item.name} />
                      ) : (
                        <div className="item-image-placeholder">No Image</div>
                      )}
                    </div>
                    <div className="item-details">
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-price">₹{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items-message">No items in this guide</div>
            )}
          </div>

          {showAddItem && (
            <AddGuideItem
              guideId={actualGuideId}
              onClose={() => setShowAddItem(false)}
              onItemAdded={() => {
                const fetchGuide = async () => {
                  const guideDocRef = doc(db, "guides", actualGuideId);
                  const guideSnapshot = await getDoc(guideDocRef);
                  if (guideSnapshot.exists()) {
                    setGuide({
                      ...guide,
                      ...guideSnapshot.data(),
                      id: guideSnapshot.id,
                      actualId: actualGuideId
                    });
                  }
                };
                fetchGuide();
              }}
            />
          )}

          {showEditItem && (
            <EditGuideItem
              guideId={actualGuideId}
              itemIndex={editingItemIndex}
              item={guide.items[editingItemIndex]}
              onClose={() => {
                setShowEditItem(false);
                setEditingItemIndex(null);
              }}
              onItemUpdated={() => {
                const fetchGuide = async () => {
                  const guideDocRef = doc(db, "guides", actualGuideId);
                  const guideSnapshot = await getDoc(guideDocRef);
                  if (guideSnapshot.exists()) {
                    setGuide({
                      ...guide,
                      ...guideSnapshot.data(),
                      id: guideSnapshot.id,
                      actualId: actualGuideId
                    });
                  }
                };
                fetchGuide();
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default GuidePage;