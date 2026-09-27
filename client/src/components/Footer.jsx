import React from "react";

export default function Footer() {
  return (
    <footer className="pb-24 sm:pb-6 pt-6 mt-6 text-center border-t border-subtle">
      <p className="text-xs text-faint">
        Developed by{" "}
        <a
          href="https://www.jazzmedia.co.ke/"
          target="_blank"
          rel="noreferrer"
          className="text-brand-600 hover:underline font-medium"
        >
          JazzMedia
        </a>
      </p>
    </footer>
  );
}
