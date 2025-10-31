import React from "react";

export default function Card({ children, className = "", as = "div", ...props }) {
  const Component = as;
  return (
    <Component
      className={`glass-card p-5 rounded-lg shadow-md transition hover:shadow-xl hover:-translate-y-1 duration-300 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
