// src/components/ui/Button.tsx

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base = `
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        cursor-pointer
    `;

  const variants = {
    primary: `
            bg-[var(--accent)] text-white
            hover:brightness-110
            active:brightness-90
        `,
    ghost: `
            bg-transparent text-[var(--muted)]
            border border-[var(--border)]
            hover:text-[var(--text)] hover:border-[var(--muted)]
        `,
    danger: `
            bg-transparent text-red-400
            border border-red-900
            hover:bg-red-900/20
        `,
  };

  const sizes = {
    sm: "text-sm px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2.5 gap-2",
    lg: "text-base px-6 py-3 gap-2",
  };

  return (
    <button
      className={`
                ${base}
                ${variants[variant]}
                ${sizes[size]}
                ${fullWidth ? "w-full" : ""}
                ${className}
            `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
