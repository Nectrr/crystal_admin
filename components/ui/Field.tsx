"use client";

import { useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

interface WrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function FieldWrapper({ label, error, hint, children, htmlFor }: WrapperProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-[#4A4A3C]">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <span className="text-xs text-[#8C8C78]">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

const baseInputClass =
  "w-full rounded-lg border border-[#EDEAE0] bg-white px-3 py-2 text-sm text-[#4A4A3C] focus:outline-none focus:ring-2 focus:ring-[#B8952F]/40 focus:border-[#B8952F] disabled:bg-gray-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = "", type, ...rest }: InputProps) {
  // Password fields get a show/hide (eye) toggle automatically.
  const [revealed, setRevealed] = useState(false);
  if (type === "password") {
    return (
      <FieldWrapper label={label} error={error} hint={hint} htmlFor={id}>
        <div className="relative">
          <input
            id={id}
            type={revealed ? "text" : "password"}
            className={`${baseInputClass} pr-10 ${className}`}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            title={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-[#8C8C78] hover:text-[#4A4A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8952F]/40"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FieldWrapper>
    );
  }
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={id}>
      <input id={id} type={type} className={`${baseInputClass} ${className}`} {...rest} />
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, id, className = "", ...rest }: TextareaProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={id}>
      <textarea id={id} className={`${baseInputClass} min-h-[100px] ${className}`} {...rest} />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, id, className = "", children, ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={id}>
      <select id={id} className={`${baseInputClass} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}
