"use client";

import { useRef } from "react";
import { BiX } from "react-icons/bi";
import { FaCamera } from "react-icons/fa";
import styles from "@/style/ProfileDashboard.module.css";

interface ImageUploadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  previewImage: string | null;
  existingImage?: string | null;
  selectedImage: File | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}

// Ported from legacy components/ImageUploadPopup.jsx (unchanged behavior) —
// used by ProfileDashboard's avatar editor. Saves via the caller-supplied
// onSave, which PUTs to /api/user/profile with a multipart profileImage file.
export default function ImageUploadPopup({
  isOpen,
  onClose,
  onSave,
  previewImage,
  existingImage,
  selectedImage,
  onImageChange,
  isUploading,
}: ImageUploadPopupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent}>
        <div className={styles.popupHeader}>
          <h3>Change Profile Photo</h3>
          <button className={styles.closePopupBtn} onClick={onClose} type="button">
            <BiX />
          </button>
        </div>

        <div className={styles.popupBody}>
          <div className={styles.currentImageContainer}>
            <img src={previewImage || existingImage || "/assets/profileImage.png"} alt="Profile Preview" className={styles.previewImage} />
          </div>

          <input type="file" ref={fileInputRef} onChange={onImageChange} accept="image/*" style={{ display: "none" }} />

          {!selectedImage && (
            <div className={styles.imageSelectionArea}>
              <button className={styles.selectImageBtn} onClick={() => fileInputRef.current?.click()} type="button">
                <FaCamera />
                Select Image
              </button>
              <p className={styles.imageHint}>Supported formats: JPG, PNG, GIF, WEBP (Max 5MB)</p>
            </div>
          )}

          {selectedImage && (
            <div className={styles.popupActions}>
              <button className={styles.cancelPopupBtn} onClick={onClose} disabled={isUploading} type="button">
                Cancel
              </button>

              <button className={styles.savePopupBtn} onClick={onSave} disabled={isUploading} type="button">
                {isUploading ? "Uploading..." : "Save Photo"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
