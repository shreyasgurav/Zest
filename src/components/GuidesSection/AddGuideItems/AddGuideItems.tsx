import React, { useState, ChangeEvent, FormEvent } from 'react';
import { getFirebaseDb, getFirebaseStorage } from "../../../lib/firebase";
import { doc, updateDoc, arrayUnion, Firestore } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";
import styles from "./AddGuideItems.module.css";
import { generateSlug } from '../../../utils/generateSlug';

interface ItemData {
  name: string;
  price: string;
  contactInfo: string;
  website: string;
  address: string;
  addressLink: string;
  pricingUrl: string;
}

interface GuideItem extends ItemData {
  photos: string[];
  itemSlug: string;
}

interface AddGuideItemProps {
  guideId: string;
  onClose: () => void;
  onItemAdded: (newItem: GuideItem) => void;
  getDb: () => Firestore;
}

const AddGuideItem: React.FC<AddGuideItemProps> = ({ guideId, onClose, onItemAdded }) => {
  const [itemData, setItemData] = useState<ItemData>({
    name: '',
    price: '',
    contactInfo: '',
    website: '',
    address: '',
    addressLink: '',
    pricingUrl: ''
  });
  const [itemImages, setItemImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 10) {
      setError("Maximum 10 images allowed");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5242880) {
        setError("Each image should be less than 5MB");
        return false;
      }
      return true;
    });

    setItemImages(validFiles);
    setImagePreviews(validFiles.map(file => URL.createObjectURL(file)));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (itemImages.length === 0 || !itemData.name || !itemData.price || !itemData.contactInfo || !itemData.address || !itemData.addressLink) {
      setError('Please fill in all required fields and upload at least one image');
      return;
    }

    setLoading(true);
    try {
      const storage = getFirebaseStorage();
      const db = getFirebaseDb();

      // Upload all images
      const imageUrls = await Promise.all(
        itemImages.map(async (image) => {
          const fileName = `guides/items/${Date.now()}-${Math.random().toString(36).substring(7)}.${image.name.split('.').pop()}`;
          const storageRef = ref(storage, fileName);
          await uploadBytes(storageRef, image);
          return getDownloadURL(storageRef);
        })
      );

      const newItem: GuideItem = {
        ...itemData,
        photos: imageUrls,
        itemSlug: generateSlug(itemData.name)
      };

      // Add item to guide with multiple images
      const guideRef = doc(db, "guides", guideId);
      await updateDoc(guideRef, {
        items: arrayUnion(newItem)
      });

      onItemAdded(newItem);
      onClose();
    } catch (error) {
      console.error("Error adding guide item:", error);
      setError("Failed to add item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.addItemModal}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Images (Max 10)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.fileInput}
              multiple
              required
            />
            {imagePreviews.length > 0 && (
              <div className={styles.imagePreviews}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} className={styles.previewItem}>
                    <img src={preview} alt={`Preview ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Name</label>
            <input
              type="text"
              value={itemData.name}
              onChange={(e) => setItemData({...itemData, name: e.target.value})}
              placeholder="Enter item name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Price</label>
            <input
              type="text"
              value={itemData.price}
              onChange={(e) => setItemData({...itemData, price: e.target.value})}
              placeholder="Enter price"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Contact Info</label>
            <input
              type="text"
              value={itemData.contactInfo}
              onChange={(e) => setItemData({...itemData, contactInfo: e.target.value})}
              placeholder="Enter contact information"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Website (Optional)</label>
            <input
              type="url"
              value={itemData.website}
              onChange={(e) => setItemData({...itemData, website: e.target.value})}
              placeholder="Enter website URL"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Address Text</label>
            <input
              type="text"
              value={itemData.address}
              onChange={(e) => setItemData({...itemData, address: e.target.value})}
              placeholder="Enter address text to display"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Address Link</label>
            <input
              type="url"
              value={itemData.addressLink}
              onChange={(e) => setItemData({...itemData, addressLink: e.target.value})}
              placeholder="Enter Google Maps or location URL"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Pricing URL (Optional)</label>
            <input
              type="url"
              value={itemData.pricingUrl}
              onChange={(e) => setItemData({...itemData, pricingUrl: e.target.value})}
              placeholder="Enter pricing details URL"
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.modalActions}>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Adding Item..." : "Add Item"}
            </button>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGuideItem; 