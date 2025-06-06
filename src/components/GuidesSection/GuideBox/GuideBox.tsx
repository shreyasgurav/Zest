'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { getAuth } from 'firebase/auth';
import { db } from "@/lib/firebase";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { FaTrash, FaEdit } from 'react-icons/fa';
import styles from './GuideBox.module.css';

interface Guide {
  id: string;
  name: string;
  cover_image?: string;
  slug?: string;
  createdBy?: string;
}

interface GuideBoxProps {
  guide: Guide;
  onDelete?: (id: string) => void;
}

// Helper function to generate slug
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

function GuideBox({ guide, onDelete }: GuideBoxProps) {
  const router = useRouter();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isGuideCreator = currentUser && currentUser.uid === guide?.createdBy;

  const handleClick = async () => {
    try {
      if (!guide.slug && guide.name) {
        // If guide doesn't have a slug, generate and add one
        const newSlug = generateSlug(guide.name);
        const guideRef = doc(db, "guides", guide.id);
        await updateDoc(guideRef, {
          slug: newSlug
        });
        router.push(`/guides/${newSlug}`);
      } else if (guide.slug) {
        router.push(`/guides/${guide.slug}`);
      } else {
        router.push(`/guides/${generateSlug(guide.name)}`);
      }
    } catch (error) {
      console.error("Error handling guide click:", error);
      // Fallback to ID-based navigation if something goes wrong
      router.push(`/guidepage/${guide.id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGuideCreator) return;

    try {
      if (window.confirm("Are you sure you want to delete this guide?")) {
        await deleteDoc(doc(db, "guides", guide.id));
        if (onDelete) {
          onDelete(guide.id);
        }
      }
    } catch (error) {
      console.error("Error deleting guide:", error);
      alert("Failed to delete guide. Please try again.");
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGuideCreator) return;
    router.push(`/edit-guide/${guide.id}`);
  };

  return (
    <div className={styles['guides-box-wrapper']} onClick={handleClick}>
      <div className={styles['guides-box-card']}>
        {isGuideCreator && (
          <>
            <div className={styles['guides-box-delete-btn']} onClick={handleDelete}>
              <FaTrash />
            </div>
            <div className={styles['guides-box-edit-btn']} onClick={handleEdit}>
              <FaEdit />
            </div>
          </>
        )}
        {guide.cover_image ? (
          <img 
            src={guide.cover_image} 
            alt={guide.name}
            className={styles['guides-box-image']}
          />
        ) : (
          <div className={styles['guides-box-image-placeholder']}>
            No Image Available
          </div>
        )}

        <div className={styles['guides-box-info']}>
          <h3>{guide.name}</h3>
        </div>
      </div>
    </div>
  );
}

export default GuideBox; 