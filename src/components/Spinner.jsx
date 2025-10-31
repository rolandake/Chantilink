import React from 'react';
import { useMemo } from 'react';

export default function Spinner({
  size = 24,
  color = "text-white",
  speed = 1,
  className = "",
}) {
  const sizePx = typeof size === "number" ? `${size}px` : size;

  // Génère un style inline pour contrôler la vitesse d'animation
  const style = useMemo(() => ({
    animation: `spin ${speed}s linear infinite`,
  }), [speed]);

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <svg
        className={`${color} mx-auto ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-label="Chargement en cours"
        role="status"
        height={sizePx}
        width={sizePx}
        style={style}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </>
  );
}


