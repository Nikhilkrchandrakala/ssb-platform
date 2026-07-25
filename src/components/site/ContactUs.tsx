"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { RxCross1 } from "react-icons/rx";
import toast from "react-hot-toast";
import CustomButton from "./CustomButton";

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const EMPTY_FORM: ContactFormData = { name: "", email: "", phone: "", subject: "", message: "" };

export default function ContactUs({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const [formData, setFormData] = useState<ContactFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormData, boolean>>>({});

  const validate = () => {
    const newErrors: Partial<Record<keyof ContactFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]*$/.test(formData.name)) {
      newErrors.name = "Name can only contain letters and spaces";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (formData.phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "Phone number must be at least 10 digits";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    } else if (formData.subject.length < 3) {
      newErrors.subject = "Subject must be at least 3 characters";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    } else if (formData.message.length > 1000) {
      newErrors.message = "Message must be less than 1000 characters";
    }

    return newErrors;
  };

  const handleBlur = (field: keyof ContactFormData) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const newErrors = validate();
    setErrors((prev) => {
      const updated = { ...prev };
      if (newErrors[field]) updated[field] = newErrors[field];
      else delete updated[field];
      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name as keyof ContactFormData]) return prev;
      const updated = { ...prev };
      delete updated[name as keyof ContactFormData];
      return updated;
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) setFormData((prev) => ({ ...prev, phone: value }));
  };

  const hasError = (field: keyof ContactFormData) => Boolean(touched[field] && errors[field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    setTouched({ name: true, email: true, phone: true, subject: true, message: true });
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(false);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone,
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to send email");
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "form_submit", formName: "Contact Form" });

      toast.success("Thank you for your enquiry. We will reach out to you soon");
      setOpen(false);
      setFormData(EMPTY_FORM);
      setErrors({});
      setTouched({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setLoading(true);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            background:
              "radial-gradient(circle at top left, rgba(202, 162, 77, 0.15), transparent 45%), radial-gradient(circle at bottom right, rgba(202, 162, 77, 0.12), transparent 45%), #0b0b0b",
            px: { xs: 1, sm: 0, md: 3 },
            py: { xs: 1, sm: 0 },
          },
        },
      }}
    >
      <DialogContent sx={{ position: "relative" }}>
        <RxCross1
          onClick={() => setOpen(false)}
          style={{ position: "absolute", top: 15, right: 15, cursor: "pointer", color: "white", fontSize: "1.5rem", zIndex: 10 }}
        />
        <section>
          <div className="container">
            <div className="sct-title">
              <h2>Contact Us</h2>
              <span style={{ fontSize: "13px", color: "#8a8978", textTransform: "none", fontWeight: "normal", display: "block", marginTop: "5px" }}>
                [For business enquiries only, not for SSB course queries]
              </span>
            </div>

            <form className="enquiry-form" onSubmit={handleSubmit} noValidate>
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="form-group">
                    <input
                      type="text"
                      name="name"
                      placeholder="Your Name"
                      onChange={handleChange}
                      onBlur={() => handleBlur("name")}
                      value={formData.name}
                      className={hasError("name") ? "error" : ""}
                      required
                    />
                    {hasError("name") && <div className="error-message">{errors.name}</div>}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-group">
                    <input
                      type="email"
                      name="email"
                      placeholder="Your Email"
                      onChange={handleChange}
                      onBlur={() => handleBlur("email")}
                      value={formData.email}
                      className={hasError("email") ? "error" : ""}
                      required
                    />
                    {hasError("email") && <div className="error-message">{errors.email}</div>}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-group">
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Enter 10 digit mobile number"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      onBlur={() => handleBlur("phone")}
                      className={hasError("phone") ? "error" : ""}
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      required
                    />
                    {hasError("phone") && <div className="error-message">{errors.phone}</div>}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-group">
                    <input
                      type="text"
                      name="subject"
                      placeholder="Subject"
                      onChange={handleChange}
                      onBlur={() => handleBlur("subject")}
                      value={formData.subject}
                      className={hasError("subject") ? "error" : ""}
                      required
                    />
                    {hasError("subject") && <div className="error-message">{errors.subject}</div>}
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-group">
                    <textarea
                      name="message"
                      placeholder="Write Your Message (minimum 10 characters)"
                      onChange={handleChange}
                      onBlur={() => handleBlur("message")}
                      value={formData.message}
                      className={hasError("message") ? "error" : ""}
                      rows={5}
                      required
                    ></textarea>
                    {hasError("message") && <div className="error-message">{errors.message}</div>}
                  </div>
                </div>

                <div className="col-12 text-center d-flex justify-content-center mb-4">
                  <CustomButton
                    text={loading ? "SUBMIT" : "SENDING..."}
                    type="submit"
                    disabled={!loading || Object.keys(errors).length > 0}
                  />
                </div>
              </div>
            </form>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
