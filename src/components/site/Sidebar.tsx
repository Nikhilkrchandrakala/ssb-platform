"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "@/style/Sidebar.module.css";
import { BiX, BiLogOut } from "react-icons/bi";
import ContactUs from "./ContactUs";
import { useSiteUser } from "./SiteUserProvider";

const getInitials = (name?: string) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const NAV_LINKS = [
  { href: "/Courses", label: "Courses" },
  { href: "/ssbVirtualTrainingXperience", label: "VTX™" },
  { href: "/magazine", label: "Roger That - Our monthly magazine" },
  { href: "/HalfOfFame", label: "Hall of fame" },
  { href: "/aboutSSB", label: "About SSB" },
  { href: "/aboutssbwithisv", label: "About us" },
  { href: "/Gallery", label: "Gallery" },
  { href: "/blogs", label: "Blogs" },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useSiteUser();
  const [openContact, setOpenContact] = useState(false);

  return (
    <>
      <div className={`${styles.overlay} ${open ? styles.show : ""}`} onClick={onClose} />

      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.sidebarContainer}>
          <div className={styles.sidebarHeader}>
            <div className={styles.topRow} style={{ justifyContent: "flex-end" }}>
              <button className={styles.closeBtn} onClick={onClose} title="Close Menu">
                <BiX />
              </button>
            </div>

            {user?.name ? (
              <div className={styles.profileCard}>
                <div className={styles.avatar}>
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className={styles.avatarImg}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (sibling) sibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span className={styles.avatarInitials} style={{ display: user.profileImage ? "none" : "flex" }}>
                    {getInitials(user.name)}
                  </span>
                </div>
                <div className={styles.profileInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userSubtitle}>{user.email || "SSB Aspirant"}</span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                  className={styles.logoutBtn}
                  title="Log Out"
                >
                  <BiLogOut />
                </button>
              </div>
            ) : (
              <div className={styles.welcomeCard}>
                <div className={styles.welcomeInfo}>
                  <span className={styles.welcomeTitle}>Welcome</span>
                  <span className={styles.welcomeSubtitle}>Sign in to access your profile</span>
                </div>
                <Link href="/SignIn" onClick={onClose} className={styles.signInBtn}>
                  Sign In
                </Link>
              </div>
            )}

            <div className={styles.topLine}>
              <span className={styles.line}></span>
              <span className={`${styles.dot} ${styles.dotLeftToRight}`}></span>
            </div>
          </div>

          <nav className={styles.menu}>
            {user?.name && (
              <Link href="/ProfileDashboard" onClick={onClose} className={pathname === "/ProfileDashboard" ? styles.active : ""}>
                My Profile
              </Link>
            )}
            <Link href="/" onClick={onClose} className={pathname === "/" ? styles.active : ""}>
              Home
            </Link>

            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={onClose} className={pathname === link.href ? styles.active : ""}>
                {link.label}
              </Link>
            ))}

            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setOpenContact(true);
                onClose();
              }}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}
            >
              <span>Contact Us</span>
              <span style={{ fontSize: "11px", color: "#8a8978", textTransform: "none", fontWeight: "normal", lineHeight: "1.3" }}>
                [For business enquiries only, not for SSB course queries]
              </span>
            </Link>

            <ContactUs open={openContact} setOpen={setOpenContact} />
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.bottomLine}>
              <span className={`${styles.dot} ${styles.dotRightToLeft}`}></span>
              <span className={styles.line}></span>
            </div>

            <div className={styles.contact}>
              <a href="https://wa.me/917483617249" target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
                <i className="fa fa-whatsapp"></i> Whatsapp only +91 7483617249
              </a>
              <a href="tel:+918420422821" className={styles.contactItem}>
                <i className="fa fa-phone"></i> Call only +91 8420422821, +91 9024667319
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
