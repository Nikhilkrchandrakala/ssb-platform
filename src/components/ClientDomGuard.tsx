"use client";

import { useEffect } from "react";

/**
 * ClientDomGuard
 *
 * Provides a resilient defense against runtime DOM reconciliation crashes
 * such as `TypeError: Cannot read properties of null (reading 'removeChild')`
 * and `NotFoundError: Failed to execute 'removeChild' on 'Node'`.
 *
 * These crashes occur when:
 * 1. Browser extensions (e.g. Scribe, Grammarly, translation tools) or third-party
 *    injected scripts (Zoho SalesIQ, PageSense, Google Tag Manager) detach or wrap
 *    DOM nodes outside of React's virtual DOM.
 * 2. Rapid unmounting / route changes where a child element's parentNode is already null
 *    or differs from the container React is attempting to clean up.
 */

// Install native Node prototype monkey-patches immediately in the client bundle
if (typeof window !== "undefined" && typeof Node !== "undefined" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (!child) return child;
    // If the child is already detached or was moved to another parent by an external script
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    // If the reference node is not a child of this node (detached by translator / extension)
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return referenceNode.parentNode.insertBefore(newNode, referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export default function ClientDomGuard() {
  useEffect(() => {
    // Global safety net for unhandled DOM detachment exceptions
    const handleUnhandledError = (event: ErrorEvent) => {
      const message = event?.message || "";
      if (
        message.includes("reading 'removeChild'") ||
        message.includes("reading 'insertBefore'") ||
        message.includes("Failed to execute 'removeChild'") ||
        message.includes("Failed to execute 'insertBefore'") ||
        message.includes("Minified React error #418") ||
        message.includes("Minified React error #423") ||
        message.includes("Minified React error #425") ||
        message.includes("Hydration failed") ||
        message.includes("does not match server-rendered HTML")
      ) {
        // Prevent non-fatal DOM/hydration discrepancy from halting React app
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn("[ClientDomGuard] Handled non-fatal hydration/reconciliation discrepancy:", message);
      }
    };

    window.addEventListener("error", handleUnhandledError, true);
    return () => window.removeEventListener("error", handleUnhandledError, true);
  }, []);

  return null;
}
