"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordNavigation } from "@/lib/safeBack";

/**
 * Client-side route guard:
 * Automatically records in-app navigation depth on route changes so that `safeBack()`
 * knows with 100% reliability whether a prior page exists in the current session
 * (critical for standalone iOS PWAs and Mobile Safari).
 */
export default function ZohoChatGuard() {
  const pathname = usePathname();

  useEffect(() => {
    recordNavigation();
  }, [pathname]);

  return null;
}
