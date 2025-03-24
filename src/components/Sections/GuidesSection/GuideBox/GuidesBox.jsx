import React from "react";
import "./GuidesBox.css";
import { useNavigate } from "react-router-dom";
import { getAuth } from 'firebase/auth';
import { db } from "../../../firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { FaTrash, FaEdit } from 'react-icons/fa';

function GuidesBox({ guide, onDelete }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const isGuideCreator = currentUser && currentUser.uid === guide?.createdBy;

  const handleClick = () => {
    navigate(`/guidepage/${guide.id}`);
  };

  const handleDelete = async (e) => {
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

  const handleEdit = (e) => {
    e.stopPropagation();
    if (!isGuideCreator) return;
    navigate(`/edit-guide/${guide.id}`);
  };

  return (
    <div className="guides-box-wrapper" onClick={handleClick}>
      <div className="guides-box-card">
        {isGuideCreator && (
          <>
            <div className="guides-box-delete-btn" onClick={handleDelete}>
              <FaTrash />
            </div>
            <div className="guides-box-edit-btn" onClick={handleEdit}>
              <FaEdit />
            </div>
          </>
        )}
        {guide.cover_image ? (
          <img 
            src={guide.cover_image} 
            alt={guide.name}
            className="guides-box-image"
          />
        ) : (
          <div className="guides-box-image-placeholder">
            No Image Available
          </div>
        )}

        <div className="guides-box-info">
          <h3>{guide.name}</h3>
        </div>
      </div>
    </div>
  );
}

export default GuidesBox;