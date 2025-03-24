import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import "./GuideItems.css";

const GuideItems = () => {
  const { guideId, itemIndex } = useParams();
  const navigate = useNavigate();
  const [guideItem, setGuideItem] = useState(null);
  const [guideName, setGuideName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuideItem = async () => {
      try {
        const guideDocRef = doc(db, "guides", guideId);
        const guideSnapshot = await getDoc(guideDocRef);
        
        if (guideSnapshot.exists()) {
          const guideData = guideSnapshot.data();
          setGuideName(guideData.name);
          
          if (guideData.items && guideData.items[itemIndex]) {
            setGuideItem(guideData.items[itemIndex]);
          } else {
            setError("Guide item not found");
          }
        } else {
          setError("Guide not found");
        }
      } catch (err) {
        console.error("Error fetching guide item:", err);
        setError("Failed to load guide item");
      } finally {
        setLoading(false);
      }
    };

    if (guideId && itemIndex !== undefined) {
      fetchGuideItem();
    }
  }, [guideId, itemIndex]);

  if (loading) return <div className="loading-state">Loading...</div>;
  if (error || !guideItem) return <div className="error-state">{error}</div>;

  return (
    <div className="guide-item-profile">
      <div className="guide-item-container">
        <div className="guide-item-header">
          <h1 className="guide-item-title">{guideItem.name}</h1>
        </div>

        <div className="guide-item-content">
          <div className="guide-item-image">
            {guideItem.photo ? (
              <img src={guideItem.photo} alt={guideItem.name} />
            ) : (
              <div className="image-placeholder">No Image Available</div>
            )}
          </div>

          <div className="guide-item-info">
            <div className="info-section">
              <h3>Price</h3>
              <p>{guideItem.price}</p>
            </div>

            <div className="info-section">
              <h3>Location</h3>
              <p>{guideItem.address}</p>
            </div>

            <div className="info-section">
              <h3>Contact</h3>
              <p>{guideItem.contactInfo}</p>
              {guideItem.website && (
                <a 
                  href={guideItem.website.startsWith('http') ? guideItem.website : `https://${guideItem.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="website-link"
                >
                  Visit Website
                </a>
              )}
            </div>

            <div className="info-section">
              <h3>From Guide</h3>
              <p>{guideName}</p>
            </div>
          </div>
        </div>

        <div className="navigation-buttons">
          <button onClick={() => navigate(`/guidepage/${guideId}`)}>
            Back to Guide
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideItems;