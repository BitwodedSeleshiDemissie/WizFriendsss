export default function manifest() {
  return {
    name: "WizFriends",
    short_name: "WizFriends",
    description:
      "Create and nurture real-world friendships with the WizFriends community platform.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    lang: "en-US",
    icons: [
      {
        src: "/icons/wizfriends-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/wizfriends-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/wizfriends-icon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
