import React from 'react';
import {
  ClipboardText,
  CheckCircle,
  Clock,
  ArrowLeft,
  Plus,
  BookOpen,
  Funnel,
} from '@phosphor-icons/react';

export type ActivityFilterType = 'all' | 'assignments' | 'schedules' | 'completed';

interface ActivitiesSidebarProps {
  activeFilter: ActivityFilterType;
  onFilterChange: (filter: ActivityFilterType) => void;
  onClose?: () => void;
  onCreateActivity?: () => void;
}

export const ActivitiesSidebar: React.FC<ActivitiesSidebarProps> = ({
  activeFilter,
  onFilterChange,
  onClose,
  onCreateActivity,
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] overflow-hidden select-none">
      {/* 1. Header */}
      <div className="h-14 px-3.5 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer mr-0.5"
              title="Quay lại Kênh chat"
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500 shadow-xs">
            <ClipboardText size={17} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
              Hoạt động
            </h2>
            <p className="text-[10px] text-[var(--text-muted)]">Bài tập & Lịch trình</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCreateActivity}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
          title="Tạo hoạt động mới"
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>

      {/* 2. Navigation Categories */}
      <div className="p-2 space-y-1 border-b border-[var(--border-color)]/70">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Funnel size={14} weight={activeFilter === 'all' ? 'fill' : 'bold'} />
            <span>Tất cả hoạt động</span>
          </div>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-muted)]">
            5
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('assignments')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeFilter === 'assignments'
              ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} weight={activeFilter === 'assignments' ? 'fill' : 'bold'} />
            <span>Bài tập & Deadline</span>
          </div>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/15 text-rose-500 font-bold">
            2
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('schedules')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeFilter === 'schedules'
              ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={14} weight={activeFilter === 'schedules' ? 'fill' : 'bold'} />
            <span>Job Schedule</span>
          </div>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/15 text-amber-500 font-bold">
            2
          </span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('completed')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeFilter === 'completed'
              ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={14} weight={activeFilter === 'completed' ? 'fill' : 'bold'} />
            <span>Đã hoàn thành</span>
          </div>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-500 font-bold">
            1
          </span>
        </button>
      </div>

      {/* 3. Upcoming Quick Timeline Mini-List */}
      <div className="p-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
        <span>Sắp đến hạn</span>
        <span className="text-[9px] lowercase bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
          tuần này
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 space-y-2">
        {/* Item 1 */}
        <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs hover:border-[var(--accent-primary)] transition-all cursor-pointer">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
              Hôm nay 23:59
            </span>
            <span className="text-[var(--text-muted)]">#backend-dev</span>
          </div>
          <h4 className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
            RESTful API với .NET 9
          </h4>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Chưa nộp</span>
            <span className="text-[var(--accent-primary)] font-medium">100 điểm</span>
          </div>
        </div>

        {/* Item 2 */}
        <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs hover:border-[var(--accent-primary)] transition-all cursor-pointer">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
              02:00 AM mỗi ngày
            </span>
            <span className="text-[var(--text-muted)]">System Job</span>
          </div>
          <h4 className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
            Sao lưu Database tự động
          </h4>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="text-emerald-500 font-medium">Đang chạy</span>
            <span className="text-[var(--text-muted)] font-mono text-[10px]">0 2 * * *</span>
          </div>
        </div>
      </div>
    </div>
  );
};
