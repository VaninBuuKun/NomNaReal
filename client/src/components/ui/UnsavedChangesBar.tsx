import React from 'react';
import { Button } from './Button';

export interface UnsavedChangesBarProps {
  show: boolean;
  message?: string;
  isSaving?: boolean;
  onReset: () => void;
  onSave: () => void;
  resetText?: string;
  saveText?: string;
  className?: string;
}

export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({
  show,
  message = 'Cẩn thận — bạn có thay đổi chưa lưu!',
  isSaving = false,
  onReset,
  onSave,
  resetText = 'Đặt lại',
  saveText = 'Lưu thay đổi',
  className = '',
}) => {
  return (
    <div
      className={`absolute bottom-4 left-4 right-4 z-50 transition-all duration-200 transform ${
        show
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-8 opacity-0 pointer-events-none'
      } ${className}`}
    >
      <div className="bg-[var(--bg-surface-active)] border border-[var(--border-color)] shadow-floating rounded-control px-4 py-2.5 flex items-center justify-between gap-4">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
          {message}
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onReset}
            disabled={isSaving}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline px-2 py-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            {resetText}
          </button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="min-w-[100px]"
          >
            {isSaving ? 'Đang lưu...' : saveText}
          </Button>
        </div>
      </div>
    </div>
  );
};
