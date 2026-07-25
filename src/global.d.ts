export {};

export interface PdfJsPage {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
}

export interface PdfJsDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfJsPage>;
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  handler?: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

export interface RazorpayInstance {
  open: () => void;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
}

// SweetAlert2, loaded from CDN in src/app/admin/layout.tsx — used throughout
// the ported admin panel pages (AdminLoginForm, dashboard, Blogs, etc.).
// Declared once here rather than per-file to avoid divergent-shape conflicts.
export interface SwalResult {
  isConfirmed: boolean;
  isDenied?: boolean;
  isDismissed?: boolean;
  value?: unknown;
}

export interface SwalStatic {
  fire: (opts: Record<string, unknown>) => Promise<SwalResult>;
  showLoading: () => void;
  close: () => void;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (opts: { url: string; withCredentials?: boolean }) => {
        promise: Promise<PdfJsDocument>;
      };
    };
    $zoho?: {
      salesiq?: {
        ready?: () => void;
        floatbutton?: { visible: (state: "show" | "hide") => void };
        floatwindow?: { visible: (state: "show" | "hide") => void };
        visitor?: {
          name?: (name: string) => void;
          email?: (email: string) => void;
          uniqueid?: () => string;
        };
      };
    };
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
    Swal?: SwalStatic;
  }
}
