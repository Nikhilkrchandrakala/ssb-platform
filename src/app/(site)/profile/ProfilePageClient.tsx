"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BiArrowBack } from "react-icons/bi";
import CustomButton from "@/components/site/CustomButton";
import "@/style/custom-theme.css";
import styles from "@/style/ProfilePage.module.css";

export interface ProfilePageUser {
  name: string;
  email: string;
  phone: string;
  Address: string;
  profileImage: string;
}

// Ported from legacy pages/profile/ProfilePage.jsx. This is the simpler
// standalone profile page (distinct from ProfileDashboard's richer tabbed
// view) — legacy edited all 4 fields directly with no OTP gate, so this port
// keeps that same behavior via PUT /api/user/profile.
export default function ProfilePageClient({ user }: { user: ProfilePageUser }) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<ProfilePageUser>(user);
  const [formData, setFormData] = useState<ProfilePageUser>(user);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          Address: formData.Address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      setPreviewData({ ...formData });
      toast.success("Profile updated successfully!");
      setIsEditMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setFormData({ ...previewData });
    setIsEditMode(false);
  }

  return (
    <div className="thm-content-layer">
      <div className="thm-content-bg"></div>
      <div onClick={() => router.back()} className="arrow_button">
        <BiArrowBack />
      </div>

      <div className="container position-relative">
        <h1 className="thm-big-title">{isEditMode ? "Edit Profile" : "My Profile"}</h1>

        <div className="position-relative" style={{ zIndex: 55555 }}>
          <div className="row col-xl-7 g-4 g-md-2 col-lg-9 mx-auto justify-content-center">
            <div className={styles.profileImageWrapper}>
              <div className="profile_image">
                <img src={previewData.profileImage || "/assets/profile_image.png"} alt="profile" />
              </div>
            </div>

            {!isEditMode ? (
              <>
                <div className="col-lg-12">
                  <div className={styles.previewItem}>
                    <label>Full Name</label>
                    <div className={styles.previewValue}>{previewData.name}</div>
                  </div>
                </div>

                <div className="col-lg-12">
                  <div className={styles.previewItem}>
                    <label>Email Address</label>
                    <div className={styles.previewValue}>{previewData.email}</div>
                  </div>
                </div>

                <div className="col-lg-12">
                  <div className={styles.previewItem}>
                    <label>Contact Number</label>
                    <div className={styles.previewValue}>{previewData.phone}</div>
                  </div>
                </div>

                <div className="col-lg-12">
                  <div className={styles.previewItem}>
                    <label>Address</label>
                    <div className={styles.previewValue}>{previewData.Address}</div>
                  </div>
                </div>

                <div className="col-12 d-flex justify-content-center mt-5">
                  <CustomButton text="EDIT PROFILE" onClick={() => setIsEditMode(true)} />
                </div>

                <div className={styles.CustomBtnOfHistory}>
                  <CustomButton text="Order History" onClick={() => router.push("/OrderHistory")} />
                  <CustomButton text="Payment History" onClick={() => router.push("/PaymentHistory")} />
                </div>
              </>
            ) : (
              <>
                <div className="col-lg-12">
                  <input
                    type="text"
                    name="name"
                    className="form-control thm-input"
                    placeholder="Your Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="col-lg-12">
                  <input
                    type="email"
                    name="email"
                    className="form-control thm-input"
                    placeholder="Your Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="col-lg-12">
                  <input
                    type="text"
                    name="phone"
                    className="form-control thm-input"
                    placeholder="Your Contact Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    maxLength={10}
                    required
                  />
                </div>

                <div className="col-lg-12">
                  <textarea
                    name="Address"
                    className="form-control thm-input"
                    placeholder="Your Complete Address"
                    value={formData.Address}
                    onChange={handleInputChange}
                    rows={3}
                    required
                  />
                </div>

                <div className="col-12 d-flex justify-content-center gap-3 mt-5">
                  <CustomButton text="CANCEL" onClick={handleCancel} />
                  <CustomButton text={isSaving ? "SAVING..." : "SAVE CHANGES"} onClick={handleSave} disabled={isSaving} />
                </div>
              </>
            )}
          </div>
        </div>

        <span style={{ zIndex: 654 }} className="thm-glow"></span>
      </div>
    </div>
  );
}
