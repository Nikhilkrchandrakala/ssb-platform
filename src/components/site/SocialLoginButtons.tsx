"use client";

import "@/style/SocialLogin.css";

// SVG icons (inline so no extra dependencies)
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const PROVIDERS = [
  {
    id: "google",
    label: "Continue with Google",
    icon: <GoogleIcon />,
    path: "/api/auth/google",
    className: "social-btn-google",
  },
  {
    id: "facebook",
    label: "Continue with Facebook",
    icon: <FacebookIcon />,
    path: "/api/auth/facebook",
    className: "social-btn-facebook",
  },
  {
    id: "linkedin",
    label: "Continue with LinkedIn",
    icon: <LinkedInIcon />,
    path: "/api/auth/linkedin",
    className: "social-btn-linkedin",
  },
];

/**
 * <SocialLoginButtons />
 * Drop-in component for both SignIn and SignUp pages.
 * Renders "OR CONTINUE WITH" divider + social login buttons.
 *
 * These are full-page redirects (not fetch calls) into the Route Handlers
 * under src/app/api/auth/* — those handlers set a short-lived CSRF state
 * cookie and redirect on to the provider's consent screen. The app is now
 * same-origin (no separate api.ssbwithisv.in host), so no base URL prefix
 * is needed — a plain relative path is enough.
 *
 * @param hideProviders - provider ids to omit (e.g. Facebook postponed on
 * SignUp, 2026-08-14) without removing the /api/auth/facebook route itself —
 * only the button is hidden, per-page.
 */
export default function SocialLoginButtons({ hideProviders = [] }: { hideProviders?: string[] }) {
  const handleClick = (path: string) => {
    // Full-page redirect into a Route Handler, not a React-managed value.
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = path;
  };

  const visibleProviders = PROVIDERS.filter((provider) => !hideProviders.includes(provider.id));
  if (visibleProviders.length === 0) return null;

  return (
    <div className="social-login-wrapper">
      {/* Divider */}
      <div className="social-divider">
        <span className="social-divider-line"></span>
        <span className="social-divider-text">OR CONTINUE WITH</span>
        <span className="social-divider-line"></span>
      </div>

      {/* Buttons */}
      <div className="social-btn-group">
        {visibleProviders.map((provider) => (
          <button
            key={provider.id}
            id={`social-login-${provider.id}`}
            className={`social-btn ${provider.className}`}
            onClick={() => handleClick(provider.path)}
            type="button"
            aria-label={provider.label}
          >
            <span className="social-btn-icon">{provider.icon}</span>
            <span className="social-btn-text">{provider.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
