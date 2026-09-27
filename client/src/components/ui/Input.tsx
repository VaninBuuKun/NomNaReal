import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightElement,
      showPasswordToggle = false,
      type = 'text',
      className,
      id,
      ...props
    },
    ref
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const computedType = showPasswordToggle
      ? isPasswordVisible
        ? 'text'
        : 'password'
      : type;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[var(--text-secondary)] select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={computedType}
            className={cn(
              'w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-chat)] text-sm text-[var(--text-primary)] transition-all outline-none font-sans',
              'px-4',
              leftIcon && 'pl-10',
              (showPasswordToggle || rightElement) && 'pr-11',
              'focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] focus:shadow-sm focus:shadow-[var(--accent-glow)]',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              'placeholder:text-[var(--text-muted)]',
              className
            )}
            {...props}
          />

          {showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute right-3 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              tabIndex={-1}
              title={isPasswordVisible ? 'Hide password' : 'Show password'}
            >
              {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          ) : (
            rightElement && (
              <div className="absolute right-3 flex items-center justify-center">
                {rightElement}
              </div>
            )
          )}
        </div>

        {error && (
          <span className="text-xs font-semibold text-red-500 animate-in fade-in duration-100">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-xs text-[var(--text-muted)]">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
