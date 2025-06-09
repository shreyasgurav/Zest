import React, { useState } from 'react';
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import styles from './EditGuideItem.module.css';

// Generate slug utility function
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

interface GuideItem {
  name: string;
  slug: string;
  price: string;
  contactInfo: string;
  website: string;
  address: string;
  addressLink: string;
  pricingUrl: string;
  photos: string[];
}

interface EditGuideItemProps {
  guideId: string;
  itemIndex: number;
  item: GuideItem;
  onClose: () => void;
  onItemUpdated: () => void;
}

const EditGuideItem: React.FC<EditGuideItemProps> = ({ 
  guideId, 
  itemIndex, 
  item, 
  onClose, 
  onItemUpdated 
}) => {
  const [itemData, setItemData] = useState<GuideItem>({
    name: item.name || '',
    slug: item.slug || generateSlug(item.name) || '',
    price: item.price || '',
    contactInfo: item.contactInfo || '',
    website: item.website || '',
    address: item.address || '',
    addressLink: item.addressLink || '',
    pricingUrl: item.pricingUrl || '',
    photos: item.photos || []
  });
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const removeExistingImage = (index: number) => {
    setItemData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!itemData.name || !itemData.price || !itemData.contactInfo || !itemData.address || !itemData.addressLink) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Upload new images if any
      const newImageUrls = await Promise.all(
        newImages.map(async (image) => {
          const fileName = `guides/items/${Date.now()}-${Math.random().toString(36).substring(7)}.${image.name.split('.').pop()}`;
          const storageRef = ref(storage, fileName);
          await uploadBytes(storageRef, image);
          return getDownloadURL(storageRef);
        })
      );

      // Get current guide data
      const guideRef = doc(db, "guides", guideId);
      const guideSnap = await getDoc(guideRef);
      const guideData = guideSnap.data();
      const items = [...(guideData?.items || [])];

      // Update the specific item with new slug
      items[itemIndex] = {
        ...itemData,
        slug: generateSlug(itemData.name),
        photos: [...itemData.photos, ...newImageUrls]
      };

      // Update the guide document
      await updateDoc(guideRef, { items });

      onItemUpdated();
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
            <label>Current Images</label>
            <div className={styles.currentImages}>
              {itemData.photos.map((photo, index) => (
                <div key={index} className={styles.previewItem}>
                  <img src={photo} alt={`Current ${index + 1}`} />
                  <button
                    type="button"
                    className={styles.removeImage}
                    onClick={() => removeExistingImage(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Add New Images (Max 10 total)</label>
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
              {loading ? "Updating..." : "Update Item"}
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