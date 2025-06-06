"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import styles from "./CreateGuide.module.css";

const CreateGuide = () => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [guideName, setGuideName] = useState("");
  const [guideImage, setGuideImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [auth, setAuth] = useState<ReturnType<typeof getAuth> | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Initialize auth only on the client side
    setAuth(getAuth());
  }, []);

  useEffect(() => {
    if (!isClient || !auth) return;

    const checkAuth = () => {
      const user = auth.currentUser;
      setIsAuthorized(user?.email === "shrreyasgurav@gmail.com");
    };

    checkAuth();
    const unsubscribe = onAuthStateChanged(auth, checkAuth);
    return () => unsubscribe();
  }, [auth, isClient]);

  if (!isClient) {
    return null; // Return null during server-side rendering
  }

  if (!isAuthorized) {
    return (
      <div className={styles["unauthorized-message-container"]}>
        <div className={styles["unauthorized-message"]}>
          <h1>Unauthorized Access</h1>
          <p>You can't create anything because you are not Shreyas.</p>
          <button onClick={() => router.push("/")} className={styles["back-button"]}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        setMessage("Image size should be less than 5MB");
        return;
      }
      setGuideImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideName.trim()) {
      setMessage("Please enter a guide name");
      return;
    }
    if (!guideImage) {
      setMessage("Please upload a cover image");
      return;
    }
    if (!auth) {
      setMessage("Authentication not initialized. Please try again later.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const storage = getFirebaseStorage();
      const db = getFirebaseDb();

      // Upload guide image
      const fileExtension = guideImage.name.split(".").pop();
      const fileName = `guides/covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, guideImage);
      const coverImageUrl = await getDownloadURL(storageRef);
      // Generate the slug from the guide name
      const slug = generateSlug(guideName);
      const guideData = {
        name: guideName.trim(),
        slug: slug,
        cover_image: coverImageUrl,
        items: [],
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      };
      const guidesCollectionRef = collection(db, "guides");
      await addDoc(guidesCollectionRef, guideData);
      setMessage("Guide created successfully!");
      setTimeout(() => router.push(`/guides/${slug}`), 2000);
    } catch (error: any) {
      console.error("Error creating guide:", error);
      setMessage(`Failed to create guide: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["create-event-page"]}>
      <div className={styles["create-event-container"]}>
        <h1 className={styles["page-title"]}>Create City Guide</h1>
        <form onSubmit={handleSubmit} className={styles["create-event-form"]}>
          {/* Guide Cover Section */}
          <div className={styles["form-section"]}>
            <h2>Guide Cover</h2>
            <div className={styles["form-group"]}>
              <label>Guide Name</label>
              <input
                type="text"
                value={guideName}
                onChange={(e) => setGuideName(e.target.value)}
                placeholder="Enter guide name"
                required
              />
            </div>
            <p className={styles["image-tip"]}>Please upload a landscape image for best results (max 5MB)</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles["file-input"]}
              required
            />
            {imagePreview && (
              <div className={styles["image-preview"]}>
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>

          {message && (
            <div className={`${styles["message"]} ${message.includes("success") ? styles["success"] : styles["error"]}`}>
              {message}
            </div>
          )}

          <div className={styles["form-actions"]}>
            <button type="submit" className={styles["submit-button"]} disabled={loading}>
              {loading ? "Creating Guide..." : "Create Guide"}
            </button>
            <button
              type="button"
              className={styles["cancel-button"]}
              onClick={() => router.push("/guides")}
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