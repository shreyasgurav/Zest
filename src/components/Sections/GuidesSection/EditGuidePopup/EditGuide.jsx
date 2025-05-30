import React, { useEffect, useState } from 'react';
import { db, storage } from "../../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import "./EditGuide.css"; // We'll create this file next

const EditGuide = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [guideName, setGuideName] = useState("");
  const [guideImage, setGuideImage] = useState(null);
  const [currentImageURL, setCurrentImageURL] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const auth = getAuth();

  useEffect(() => {
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get the guide document
        const guideDoc = await getDoc(doc(db, "guides", id));
        
        if (!guideDoc.exists()) {
          navigate('/guides');
          return;
        }
        
        const guideData = guideDoc.data();
        
        // Check if user is the creator
        const isCreator = user.uid === guideData.createdBy;
        const isAdmin = user.email === 'shrreyasgurav@gmail.com';
        
        setIsAuthorized(isCreator || isAdmin);
        
        if (isCreator || isAdmin) {
          // Load the guide data
          setGuideName(guideData.name);
          setCurrentImageURL(guideData.cover_image);
          setImagePreview(guideData.cover_image);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching guide:", error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [auth, id, navigate]);

  if (isLoading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="unauthorized-message-container">
        <div className="unauthorized-message">
          <h1>Unauthorized Access</h1>
          <p>You don't have permission to edit this guide.</p>
          <button onClick={() => navigate('/guides')} className="back-button">
            Back to Guides
          </button>
        </div>
      </div>
    );
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5242880) { // 5MB limit
        setMessage("Image size should be less than 5MB");
        return;
      }
      setGuideImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Remove consecutive hyphens
      .trim();                      // Remove leading/trailing spaces
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!guideName.trim()) {
      setMessage("Please enter a guide name");
      return;
    }
  
    setLoading(true);
    setMessage("");
  
    try {
      let coverImageUrl = currentImageURL;
      
      // Upload new guide image if provided
      if (guideImage) {
        const fileExtension = guideImage.name.split('.').pop();
        const fileName = `guides/covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, guideImage);
        coverImageUrl = await getDownloadURL(storageRef);
      }
  
      // Generate new slug from updated name
      const newSlug = generateSlug(guideName.trim());
  
      const guideData = {
        name: guideName.trim(),
        slug: newSlug,
        cover_image: coverImageUrl,
        updatedAt: new Date()
      };
  
      const guideRef = doc(db, "guides", id);
      await updateDoc(guideRef, guideData);
      
      setMessage("Guide updated successfully!");
      setTimeout(() => navigate(`/guides/${newSlug}`), 2000);
    } catch (error) {
      console.error("Error updating guide:", error);
      setMessage(`Failed to update guide: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      <div className="create-event-container">
        <h1 className="page-title">Edit City Guide</h1>
        <form onSubmit={handleSubmit} className="create-event-form">
          {/* Guide Cover Section */}
          <div className="form-section">
            <h2>Guide Cover</h2>
            <div className="form-group">
              <label>Guide Name</label>
              <input
                type="text"
                value={guideName}
                onChange={(e) => setGuideName(e.target.value)}
                placeholder="Enter guide name"
                required
              />
            </div>
            <p className="image-tip">Please upload a landscape image for best results (max 5MB)</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>

          {message && (
            <div className={`message ${message.includes("success") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Updating Guide..." : "Update Guide"}
            </button>
            <button 
              type="button" 
              className="cancel-button" 
              onClick={() => navigate(`/guidepage/${id}`)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGuide;