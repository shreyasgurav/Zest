import React, { useState, ChangeEvent, FormEvent } from 'react';
import { getFirebaseDb, getFirebaseStorage } from "../../../lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, Firestore } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from "firebase/storage";
import styles from "./EditGuideItem.module.css";
import { generateSlug } from '../../../utils/generateSlug';

interface ItemData {
  name: string;
  price: string;
  contactInfo: string;
  website: string;
  address: string;
  addressLink: string;
  pricingUrl: string;
  photos: string[];
}

interface GuideItem extends ItemData {
  itemSlug: string;
}

interface EditGuideItemProps {
  guideId: string;
  itemIndex: number;
  item: GuideItem;
  onClose: () => void;
  onItemUpdated: (updatedItem: GuideItem) => void;
  getDb: () => Firestore;
}

const EditGuideItem: React.FC<EditGuideItemProps> = ({ guideId, item, onClose, onItemUpdated }) => {
  const [itemData, setItemData] = useState<GuideItem>(item);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + itemData.photos.length > 10) {
      setError("Maximum 10 images allowed in total");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5242880) {
        setError("Each image should be less than 5MB");
        return false;
      }
      return true;
    });

    setNewImages(validFiles);
    setImagePreviews(validFiles.map(file => URL.createObjectURL(file)));
  };

  const handleRemoveExistingImage = (index: number) => {
    const updatedPhotos = [...itemData.photos];
    updatedPhotos.splice(index, 1);
    setItemData({ ...itemData, photos: updatedPhotos });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!itemData.name || !itemData.price || !itemData.contactInfo || !itemData.address || !itemData.addressLink) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const storage = getFirebaseStorage();
      const db = getFirebaseDb();

      // Upload new images
      const newImageUrls = await Promise.all(
        newImages.map(async (image) => {
          const fileName = `guides/items/${Date.now()}-${Math.random().toString(36).substring(7)}.${image.name.split('.').pop()}`;
          const storageRef = ref(storage, fileName);
          await uploadBytes(storageRef, image);
          return getDownloadURL(storageRef);
        })
      );

      // Update guide item
      const guideRef = doc(db, "guides", guideId);
      await updateDoc(guideRef, {
        items: arrayRemove(item)
      });

      const updatedItem: GuideItem = {
        ...itemData,
        photos: [...itemData.photos, ...newImageUrls],
        itemSlug: generateSlug(itemData.name)
      };

      await updateDoc(guideRef, {
        items: arrayUnion(updatedItem)
      });

      onItemUpdated(updatedItem);
      onClose();
    } catch (error) {
      console.error("Error updating guide item:", error);
      setError("Failed to update item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.editItemModal}>
      <div className={styles.modalContent}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Existing Images</label>
            <div className={styles.existingImages}>
              {itemData.photos.map((photo, index) => (
                <div key={index} className={styles.imageItem}>
                  <img src={photo} alt={`Item ${index + 1}`} />
                  <button
                    type="button"
                    className={styles.removeImage}
                    onClick={() => handleRemoveExistingImage(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Add More Images (Max 10 total)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.fileInput}
              multiple
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
              {loading ? "Updating Item..." : "Update Item"}
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

export default EditGuideItem; 