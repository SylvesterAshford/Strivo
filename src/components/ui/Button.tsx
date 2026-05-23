"use client";

import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className = "", children, ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9512D] disabled:opacity-40 disabled:pointer-events-none px-4 py-2 h-9";

  const variants = {
    primary: "bg-[#C9512D] text-white hover:bg-[#B8451F] active:bg-[#A33C1A]",
    ghost: "bg-transparent text-[#2D2D2A] hover:bg-[#F0EFEA] active:bg-[#E8E5DC]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
