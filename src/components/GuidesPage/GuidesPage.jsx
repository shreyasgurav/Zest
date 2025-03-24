import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import AddGuideItem from "./AddGuideItems/AddGuideItems";
import "./GuidesPage.css";
import { getAuth } from 'firebase/auth';

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
  const { guideId } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isAuthorized = currentUser?.email === 'shrreyasgurav@gmail.com';

  const fetchGuide = async () => {
    try {
      const guideDocRef = doc(db, "guides", guideId);
      const guideSnapshot = await getDoc(guideDocRef);
      
      if (guideSnapshot.exists()) {
        setGuide({
          id: guideSnapshot.id,
          ...guideSnapshot.data()
        });
      } else {
        setError("Guide not found");
      }
    } catch (err) {
      console.error("Error fetching guide:", err);
      setError("Failed to load guide");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guideId) {
      fetchGuide();
    }
  }, [guideId]);

  const handleItemClick = (index) => {
    navigate(`/guide-profile/${guideId}/${index}`);
  };

  const handleAddItemClick = () => {
    setShowAddItem(true);
  };

  const handleCloseAddItem = () => {
    setShowAddItem(false);
  };

  const handleItemAdded = () => {
    fetchGuide(); // Refresh the guide data after adding a new item
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
          <button className="back-button" onClick={() => navigate("/guides")}>
            Back to Guides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guide-page">
      <div className="guide-container">
        <div className="guide-header">
          <h1 className="guide-title">{guide.name}</h1>
        </div>

        <div className="guide-items-container">
          {isAuthorized && (
            <div className="items-header">
              <button className="add-item-button" onClick={() => setShowAddItem(true)}>
                Add New
              </button>
            </div>
          )}
          
          {guide.items && guide.items.length > 0 ? (
            <div className="guide-items-grid">
              {guide.items.map((item, index) => (
                <div 
                  key={index} 
                  className="guide-item-card" 
                  onClick={() => handleItemClick(index)}
                >
                  {isAuthorized && (
                    <button 
                      className="delete-item-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this item?')) {
                          handleDeleteItem(index);
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                  <div className="item-image">
                    {item.photo ? (
                      <img src={item.photo} alt={item.name} />
                    ) : (
                      <div className="item-image-placeholder">No Image</div>
                    )}
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-price">Starts from: {item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-items-message">No items in this guide</div>
          )}
        </div>

        <button className="back-button" onClick={() => navigate("/guides")}>
          Back to Guides
        </button>
        

        {showAddItem && (
          <AddGuideItem
            guideId={guideId}
            onClose={() => setShowAddItem(false)}
            onItemAdded={fetchGuide}
          />
        )}
      </div>
    </div>
  );
};

export default GuidePage;