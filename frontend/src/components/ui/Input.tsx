// src/components/ui/Input.tsx

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
                    w-full pl-4 pr-4 py-3.5 min-h-[48px] indent-2
                    bg-[var(--surface)] text-[var(--text)]
                    border rounded-lg text-sm
                    outline-none transition-all duration-200
                    placeholder:text-[var(--muted)]
                    focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30
                    ${
                      error
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-[var(--border)]"
                    }
                    ${className}
                `}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
