import React, { useEffect, useState } from 'react';
import { db, storage } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./CreateGuide.css";

const CreateGuide = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [guideName, setGuideName] = useState("");
  const [guideImage, setGuideImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const auth = getAuth();

  useEffect(() => {
    const checkAuth = () => {
      const user = auth.currentUser;
      setIsAuthorized(user?.email === 'shrreyasgurav@gmail.com');
    };

    checkAuth();
    const unsubscribe = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribe();
  }, [auth]);

  if (!isAuthorized) {
    return (
      <div className="unauthorized-message-container">
        <div className="unauthorized-message">
          <h1>Unauthorized Access</h1>
          <p>You can't create anything because you are not Shreyas.</p>
          <button onClick={() => navigate('/')} className="back-button">
            Back to Home
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
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Remove consecutive hyphens
      .trim();                   // Trim whitespace
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!guideName.trim()) {
      setMessage("Please enter a guide name");
      return;
    }

    if (!guideImage) {
      setMessage("Please upload a cover image");
      return;
    }
  
    setLoading(true);
    setMessage("");
  
    try {
      // Upload guide image
      const fileExtension = guideImage.name.split('.').pop();
      const fileName = `guides/covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, guideImage);
      const coverImageUrl = await getDownloadURL(storageRef);
  
      // Generate the slug from the guide name
      const slug = generateSlug(guideName);
      console.log("Generated slug:", slug); // e.g., "best-go-karting-in-bombay"
  
      const guideData = {
        name: guideName.trim(),
        slug: slug, // Store the slug in Firestore
        cover_image: coverImageUrl,
        items: [], // Initialize with empty items array
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      };
  
      const guidesCollectionRef = collection(db, "guides");
      const docRef = await addDoc(guidesCollectionRef, guideData);
      
      setMessage("Guide created successfully!");
      setTimeout(() => navigate(`/guides/${slug}`), 2000);
    } catch (error) {
      console.error("Error creating guide:", error);
      setMessage(`Failed to create guide: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-page">
      <div className="create-event-container">
        <h1 className="page-title">Create City Guide</h1>
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
              required
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
              {loading ? "Creating Guide..." : "Create Guide"}
            </button>
            <button 
              type="button" 
              className="cancel-button" 
              onClick={() => navigate('/guides')}
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

export default CreateGuide;