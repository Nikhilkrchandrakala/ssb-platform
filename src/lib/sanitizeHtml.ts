import sanitizeHtml from "sanitize-html";

// Rich-text (blog body, assessment slide text) is authored in an admin editor
// and rendered with dangerouslySetInnerHTML — strip scripts, event handlers
// and javascript: URLs so a compromised/mistaken editor can't inject XSS.
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2", "span", "u", "s", "figure", "figcaption", "iframe"],
    allowedAttributes: {
      "*": ["class", "style", "id"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "title"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    allowedStyles: undefined,
  });
}
