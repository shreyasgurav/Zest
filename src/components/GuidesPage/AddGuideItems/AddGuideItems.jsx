import React, { useState } from 'react';
import { db, storage } from "../../firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./AddGuideItems.css";

const AddGuideItem = ({ guideId, onClose, onItemAdded }) => {
  const [itemData, setItemData] = useState({
    name: '',
    price: '',
    contactInfo: '',
    website: '',
    address: '',
    addressLink: ''
  });
  const [itemImage, setItemImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5242880) {
        setError("Image size should be less than 5MB");
        return;
      }
      setItemImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemImage || !itemData.name || !itemData.price || !itemData.contactInfo || !itemData.address || !itemData.addressLink) {
      setError('Please fill in all required fields and upload an image');
      return;
    }

    setLoading(true);
    try {
      // Upload item image
      const fileName = `guides/items/${Date.now()}-${Math.random().toString(36).substring(7)}.${itemImage.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, itemImage);
      const imageUrl = await getDownloadURL(storageRef);

      // Add item to guide
      const guideRef = doc(db, "guides", guideId);
      await updateDoc(guideRef, {
        items: arrayUnion({
          ...itemData,
          photo: imageUrl
        })
      });

      onItemAdded();
      onClose();
    } catch (error) {
      console.error("Error adding guide item:", error);
      setError("Failed to add item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-item-modal">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Image</label>
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

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={itemData.name}
              onChange={(e) => setItemData({...itemData, name: e.target.value})}
              placeholder="Enter item name"
              required
            />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input
              type="text"
              value={itemData.price}
              onChange={(e) => setItemData({...itemData, price: e.target.value})}
              placeholder="Enter price"
              required
            />
          </div>

          <div className="form-group">
            <label>Contact Info</label>
            <input
              type="text"
              value={itemData.contactInfo}
              onChange={(e) => setItemData({...itemData, contactInfo: e.target.value})}
              placeholder="Enter contact information"
              required
            />
          </div>

          <div className="form-group">
            <label>Website (Optional)</label>
            <input
              type="url"
              value={itemData.website}
              onChange={(e) => setItemData({...itemData, website: e.target.value})}
              placeholder="Enter website URL"
            />
          </div>

          <div className="form-group">
            <label>Address Text</label>
            <input
              type="text"
              value={itemData.address}
              onChange={(e) => setItemData({...itemData, address: e.target.value})}
              placeholder="Enter address text to display"
              required
            />
          </div>

          <div className="form-group">
            <label>Address Link</label>
            <input
              type="url"
              value={itemData.addressLink}
              onChange={(e) => setItemData({...itemData, addressLink: e.target.value})}
              placeholder="Enter Google Maps or location URL"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? "Adding Item..." : "Add Item"}
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGuideItem;