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
  default: 'bg-surface hover:bg-surface-active text-text-primary border border-transparent',
  off: 'bg-danger-soft text-danger border border-danger/20',
  accent: 'bg-accent-soft text-accent-primary border border-accent-primary/30',
  end: 'bg-danger hover:bg-danger-hover text-on-accent border border-transparent',
};

const SIZE_CLASSES = {
  md: 'w-9 h-9 sm:w-10 sm:h-10',
  lg: 'w-10 h-10 sm:w-12 sm:h-12',
};

/** Round icon button used by the call dock and the minimized call widget. */
export const CallControlButton: React.FC<CallControlButtonProps> = ({
  label,
  onClick,
  variant = 'default',
  size = 'lg',
  disabled = false,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 disabled:opacity-50 disabled:pointer-events-none`}
  >
    {children}
  </button>
);
