import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import AddGuideItem from "./AddGuideItems/AddGuideItems";
import EditGuideItem from "./EditGuideItem/EditGuideItem";
import "./GuidesPage.css";
import { getAuth } from 'firebase/auth';
import { FaEdit } from 'react-icons/fa';
import { collection, getDocs, query, where } from "firebase/firestore";
import { generateSlug } from "../utils/generateSlug";

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
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isAuthorized = currentUser?.email === 'shrreyasgurav@gmail.com';

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        let guideData = null;
        
        if (slug) {
          // First try to fetch by slug
          const guidesRef = collection(db, "guides");
          const q = query(guidesRef, where("slug", "==", slug));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
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
          setGuide(guideData);
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
      navigate(`/guide-item/${guide.slug}/${index}`);
    } else {
      navigate(`/guide-profile/${guide.id}/${index}`);
    }
  };

  const handleDeleteItem = async (index) => {
    try {
      const guideDocRef = doc(db, "guides", guideId);
      const guideSnapshot = await getDoc(guideDocRef);
      
      if (guideSnapshot.exists()) {
        const currentItems = guideSnapshot.data().items || [];
        const updatedItems = currentItems.filter((_, idx) => idx !== index);
        
        await updateDoc(guideDocRef, {
          items: updatedItems
        });
        
        // Refresh the guide data after deletion
        const fetchGuide = async () => {
          const updatedSnapshot = await getDoc(guideDocRef);
          if (updatedSnapshot.exists()) {
            setGuide({
              id: updatedSnapshot.id,
              ...updatedSnapshot.data()
            });
          }
        };
        
        fetchGuide();
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item. Please try again.");
    }
  };

  if (loading) {
    return (
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
    );
  }

  if (error || !guide) {
    return (
      <div className="guide-page">
        <div className="guide-container">
          <div className="error-message">{error || "Guide not found"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="guide-page">
      <div className="guide-container">
        <div className="guide-header">
          <h1 className="guide-title">{guide.name}</h1>
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
            guideId={guideId}
            onClose={() => setShowAddItem(false)}
            onItemAdded={() => {
              const fetchGuide = async () => {
                const guideDocRef = doc(db, "guides", guideId);
                const guideSnapshot = await getDoc(guideDocRef);
                if (guideSnapshot.exists()) {
                  setGuide({
                    id: guideSnapshot.id,
                    ...guideSnapshot.data()
                  });
                }
              };
              fetchGuide();
            }}
          />
        )}

        {showEditItem && (
          <EditGuideItem
            guideId={guideId}
            itemIndex={editingItemIndex}
            item={guide.items[editingItemIndex]}
            onClose={() => {
              setShowEditItem(false);
              setEditingItemIndex(null);
            }}
            onItemUpdated={() => {
              const fetchGuide = async () => {
                const guideDocRef = doc(db, "guides", guideId);
                const guideSnapshot = await getDoc(guideDocRef);
                if (guideSnapshot.exists()) {
                  setGuide({
                    id: guideSnapshot.id,
                    ...guideSnapshot.data()
                  });
                }
              };
              fetchGuide();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default GuidePage;