"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-all duration-300 shadow-sm active:scale-90"
      style={{
        background: dark ? "#2C2C30" : "#FFFFFF",
        border: `1px solid ${dark ? "#3A3A3E" : "#E8E8E8"}`,
      }}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      <span style={{ transition: "transform 0.3s ease", display: "inline-block", transform: dark ? "rotate(180deg)" : "rotate(0deg)" }}>
        {dark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
