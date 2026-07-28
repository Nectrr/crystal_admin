"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

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

export function Input({ label, error, hint, id, className = "", ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={id}>
      <input id={id} className={`${baseInputClass} ${className}`} {...rest} />
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
