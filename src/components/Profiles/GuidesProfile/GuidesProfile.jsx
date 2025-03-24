import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaMapMarkerAlt, FaPhone, FaGlobe, FaDollarSign } from 'react-icons/fa';
import "./GuidesProfile.css";

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
  const { guideId, itemIndex } = useParams();
  const [guideItem, setGuideItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuideItem = async () => {
      try {
        const guideDocRef = doc(db, "guides", guideId);
        const guideSnapshot = await getDoc(guideDocRef);
        
        if (guideSnapshot.exists()) {
          const guideData = guideSnapshot.data();
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

  if (loading) {
    return <GuideProfileSkeleton />;
  }

  if (error || !guideItem) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="guide-profile-container">
      <div className="guide-content">
        <div className="guide-profile-image">
          {guideItem.photo ? (
            <img src={guideItem.photo} alt={guideItem.name} />
          ) : (
            <div className="no-image">No Image Available</div>
          )}
        </div>
        
        <div className="guide-info-box">
          <div className="guide-info">
            <h2>{guideItem.name}</h2>
            
            <div className="guide-detail">
              <FaDollarSign />
              {guideItem.price}
            </div>
            
            <div className="guide-detail">
              <FaMapMarkerAlt />
              <a 
                href={guideItem.addressLink}
                target="_blank"
                rel="noopener noreferrer"
                className="address-link"
              >
                {guideItem.address}
              </a>
            </div>

            <div className="guide-detail">
              <FaPhone />
              {guideItem.contactInfo}
            </div>

            {guideItem.website && (
              <div className="guide-detail">
                <FaGlobe />
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
    </div>
  );
};

export default GuideProfile;
