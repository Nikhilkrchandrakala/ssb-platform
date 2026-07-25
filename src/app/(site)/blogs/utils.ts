/**
 * Computes the URL slug for a blog post from its title, matching the
 * legacy CRA frontend's client-side slug computation exactly
 * (pages/blogs/Blogs.jsx `handelNavigate` / BlogsDetails.jsx matching logic).
 *
 * Blog posts have no dedicated `slug` field in the schema — the legacy site
 * derived one on the fly from the title, so we replicate that here to keep
 * existing shared links working.
 */
export function slugifyBlogTitle(title: string | undefined | null): string {
  return (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
