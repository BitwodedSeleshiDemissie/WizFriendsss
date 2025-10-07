"use client";

export default function Footer() {
  return (
    <footer className="backdrop-blur-md bg-white/60 text-gray-700 py-6 text-center border-t border-white/30">
      <p>© {new Date().getFullYear()} <span className="font-semibold text-indigo-600">HomeConnect</span> — All rights reserved.</p>
      <p className="text-sm mt-2 text-gray-500">
        Built with ❤️ using Next.js, TailwindCSS & Framer Motion
      </p>
    </footer>
  );
}
