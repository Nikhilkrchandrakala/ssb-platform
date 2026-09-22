"use client";

import EnquiryForm from "@/components/site/EnquiryForm";

/**
 * Legacy wrapper kept for backward compatibility with existing imports.
 * The canonical implementation now lives in @/components/site/EnquiryForm.
 */
export default function Form({ isModal = false }: { isModal?: boolean }) {
  return <EnquiryForm isModal={isModal} />;
}
