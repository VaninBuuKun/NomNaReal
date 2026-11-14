import React from 'react';

type CallControlVariant = 'default' | 'off' | 'accent' | 'end';

interface CallControlButtonProps {
  label: string;
  onClick: () => void;
  variant?: CallControlVariant;
  size?: 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<CallControlVariant, string> = {
  default: 'bg-sidebar/80 text-text-primary hover:bg-surface-active',
  off: 'bg-danger text-white hover:bg-danger-hover',
  accent: 'bg-accent-primary text-on-accent hover:bg-accent-hover',
  end: 'bg-danger text-white hover:bg-danger-hover',
};

const SIZE_CLASSES = {
  md: 'w-9 h-9 sm:w-10 sm:h-10',
  lg: 'w-10 h-10 sm:w-12 sm:h-12',
};

/**
 * Standardized call action button with constant dimensions to prevent layout shifts.
 */
export const CallControlButton: React.FC<CallControlButtonProps> = ({
  label,
  variant = 'default',
  size = 'lg',
  onClick,
  disabled,
  children,
}) => {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`
        ${SIZE_CLASSES[size]} shrink-0 
        flex items-center justify-center 
        rounded-full 
        transition-colors cursor-pointer
        border-0 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0
        ${VARIANT_CLASSES[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
};