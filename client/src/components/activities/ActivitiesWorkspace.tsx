import React, { useState } from 'react';
import {
  ClipboardText,
  CalendarCheck,
  CheckCircle,
  Clock,
  ArrowLeft,
  BookOpen,
  FileArrowUp,
  FilePdf,
  Check,
  X,
  Play,
} from '@phosphor-icons/react';
import type { ActivityFilterType } from './ActivitiesSidebar';

interface ActivitiesWorkspaceProps {
  activeFilter: ActivityFilterType;
  onFilterChange: (filter: ActivityFilterType) => void;
  onBackToChat: () => void;
}

interface MockAssignment {
  id: string;
  title: string;
  channelName: string;
  creatorName: string;
  creatorAvatar: string;
  dueDate: string;
  dueStatus: 'urgent' | 'upcoming' | 'completed';
  points: number;
  description: string;
  submitted: boolean;
  grade?: string;
  attachments: string[];
}

interface MockJobSchedule {
  id: string;
  name: string;
  cron: string;
  description: string;
  lastRun: string;
  nextRun: string;
  status: 'active' | 'paused';
  successRate: string;
}

export const ActivitiesWorkspace: React.FC<ActivitiesWorkspaceProps> = ({
  activeFilter,
  onFilterChange,
  onBackToChat,
}) => {
  const [selectedAssignment, setSelectedAssignment] = useState<MockAssignment | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionFile, setSubmissionFile] = useState<string | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [submittedIds, setSubmittedIds] = useState<Record<string, boolean>>({
    'assign-2': true,
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const assignments: MockAssignment[] = [
    {
      id: 'assign-1',
      title: 'Xây dựng RESTful API với .NET 9 Clean Architecture & MediatR',
      channelName: 'backend-dev',
      creatorName: 'TS. Nguyễn Văn A',
      creatorAvatar: '/default-avatar.png',
      dueDate: 'Hôm nay lúc 23:59',
      dueStatus: 'urgent',
      points: 100,
      description:
        'Triển khai toàn bộ các module: Authentication với JWT Token Rotation, CRUD Channels/Messages theo CQRS MediatR, FluentValidation pipeline và Unit Tests đạt 80% coverage.',
      submitted: !!submittedIds['assign-1'],
      attachments: ['De_bai_Assignment_1.pdf', 'Database_Schema.png'],
    },
    {
      id: 'assign-2',
      title: 'Thiết kế giao diện Dark/Light Mode & Dynamic Activities Hub',
      channelName: 'frontend-design',
      creatorName: 'Lead Designer Linh',
      creatorAvatar: '/default-avatar.png',
      dueDate: '3 ngày nữa (04/10/2026)',
      dueStatus: 'completed',
      points: 100,
      description:
        'Sử dụng Tailwind CSS, Lucide / Phosphor Icons, thiết kế hệ thống layout 3 cột chuẩn Enterprise, hỗ trợ kéo thả Resizer và Realtime SignalR notification badge.',
      submitted: true,
      grade: '95/100 (Xuất sắc)',
      attachments: ['Figma_Design_Tokens.pdf'],
    },
    {
      id: 'assign-3',
      title: 'Nghiên cứu tối ưu hóa PostgreSQL Indexing cho 10.000 Concurrent Users',
      channelName: 'database-ops',
      creatorName: 'DevOps Hoang',
      creatorAvatar: '/default-avatar.png',
      dueDate: 'Tuần sau (08/10/2026)',
      dueStatus: 'upcoming',
      points: 50,
      description:
        'Phân tích giải pháp Lazy Creation so với Fan-out on write khi giao bài tập cho nhóm lớn. Tối ưu query Left Join và Partitioning bảng tin nhắn.',
      submitted: !!submittedIds['assign-3'],
      attachments: ['Benchmark_Report_v1.pdf'],
    },
  ];

  const jobs: MockJobSchedule[] = [
    {
      id: 'job-1',
      name: 'Tự động sao lưu Database PostgreSQL (Nightly Backup)',
      cron: '0 2 * * *',
      description: 'Dump database nén .sql.gz và đẩy lên S3 Storage mỗi đêm lúc 02:00 sáng.',
      lastRun: '02:00 AM hôm nay (Thành công)',
      nextRun: '02:00 AM ngày mai',
      status: 'active',
      successRate: '99.8%',
    },
    {
      id: 'job-2',
      name: 'Dọn dẹp Expired Refresh Tokens & Temporary Uploads',
      cron: '0 0 * * 0',
      description: 'Quét và xoá các token quá hạn quá 30 ngày, giải phóng dung lượng ổ đĩa.',
      lastRun: 'Chủ nhật trước lúc 00:00',
      nextRun: 'Chủ nhật tới lúc 00:00',
      status: 'active',
      successRate: '100%',
    },
  ];

  const handleOpenSubmit = (assign: MockAssignment) => {
    setSelectedAssignment(assign);
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (!selectedAssignment) return;
    setSubmittedIds((prev) => ({ ...prev, [selectedAssignment.id]: true }));
    setIsSubmitModalOpen(false);
    showToast(`Đã nộp bài thành công cho: "${selectedAssignment.title}"!`);
    setSubmissionFile(null);
    setSubmissionNote('');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-chat)] overflow-y-auto select-none relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[999] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle size={20} weight="fill" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* 1. Top Header Bar */}
      <header className="h-14 px-6 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-primary)] bg-[var(--accent-soft)] hover:bg-[var(--accent-primary)] hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Quay lại Kênh chat</span>
          </button>
          <div className="h-4 w-px bg-[var(--border-color)]" />
          <div className="flex items-center gap-2">
            <ClipboardText size={20} weight="duotone" className="text-[var(--accent-primary)]" />
            <h1 className="text-sm font-bold text-[var(--text-primary)]">
              Trung tâm Hoạt động & Công việc (Activities Hub)
            </h1>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-[var(--bg-chat)] p-1 rounded-lg border border-[var(--border-color)] text-xs">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
              activeFilter === 'all'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('assignments')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
              activeFilter === 'assignments'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BookOpen size={13} weight="bold" />
            <span>Bài tập</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('schedules')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
              activeFilter === 'schedules'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Clock size={13} weight="bold" />
            <span>Job Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('completed')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
              activeFilter === 'completed'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CheckCircle size={13} weight="bold" />
            <span>Đã hoàn thành</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <div className="p-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Banner Welcome & Stats Overview */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)]/15 via-[var(--bg-surface)] to-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent-primary)] text-white shadow-xs mb-2">
              <CalendarCheck size={13} weight="bold" />
              Tổng quan hoạt động
            </span>
            <h2 className="text-xl font-black text-[var(--text-primary)] mb-1">
              Quản lý Bài tập, Hạn nộp & Lịch trình tự động
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Các hoạt động được đồng bộ với Kênh và Workspace. Bạn có thể theo dõi tiến độ nộp
              bài, kiểm tra kết quả chấm điểm hoặc theo dõi các cron job tự động.
            </p>
          </div>

          {/* Stat counters */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[var(--bg-surface)]/80 border border-[var(--border-color)]">
              <span className="text-[11px] text-[var(--text-muted)] block font-medium">
                Bài tập cần làm
              </span>
              <span className="text-xl font-black text-rose-500">1</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)]/80 border border-[var(--border-color)]">
              <span className="text-[11px] text-[var(--text-muted)] block font-medium">
                Đã nộp bài
              </span>
              <span className="text-xl font-black text-emerald-500">2</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)]/80 border border-[var(--border-color)]">
              <span className="text-[11px] text-[var(--text-muted)] block font-medium">
                Job Schedule
              </span>
              <span className="text-xl font-black text-amber-500">2 đang chạy</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)]/80 border border-[var(--border-color)]">
              <span className="text-[11px] text-[var(--text-muted)] block font-medium">
                Điểm trung bình
              </span>
              <span className="text-xl font-black text-[var(--accent-primary)]">9.5 / 10</span>
            </div>
          </div>
        </div>

        {/* 3. Section: BÀI TẬP & NHIỆM VỤ (Assignments) */}
        {(activeFilter === 'all' || activeFilter === 'assignments' || activeFilter === 'completed') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} weight="duotone" className="text-rose-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Bài tập & Nhiệm vụ ({assignments.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments
                .filter((a) => {
                  if (activeFilter === 'completed') return a.submitted;
                  return true;
                })
                .map((assign) => (
                  <div
                    key={assign.id}
                    className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Meta header */}
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                          #{assign.channelName}
                        </span>

                        {assign.submitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-500">
                            <Check size={12} weight="bold" />
                            Đã nộp bài
                          </span>
                        ) : assign.dueStatus === 'urgent' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-500 animate-pulse">
                            <Clock size={12} weight="bold" />
                            {assign.dueDate}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--bg-chat)] text-[var(--text-muted)]">
                            <Clock size={12} />
                            {assign.dueDate}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1.5 leading-snug">
                        {assign.title}
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
                        {assign.description}
                      </p>

                      {/* Attachments preview */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {assign.attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-chat)] border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)]"
                          >
                            <FilePdf size={13} weight="bold" className="text-rose-500" />
                            <span className="truncate max-w-[130px]">{att}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[var(--border-color)]/70 flex items-center justify-between text-xs">
                      <div>
                        {assign.grade ? (
                          <span className="font-bold text-emerald-500">
                            Điểm: {assign.grade}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">
                            Thang điểm: <b className="text-[var(--text-primary)]">{assign.points}</b>
                          </span>
                        )}
                      </div>

                      {assign.submitted ? (
                        <button
                          type="button"
                          onClick={() => showToast(`Bài nộp "${assign.title}" đã được ghi nhận.`)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-chat)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          Xem lại bài làm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenSubmit(assign)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <FileArrowUp size={14} weight="bold" />
                          <span>Nộp bài ngay</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* 4. Section: JOB SCHEDULE & AUTOMATION */}
        {(activeFilter === 'all' || activeFilter === 'schedules') && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} weight="duotone" className="text-amber-500" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Lịch trình Công việc (Job Schedules - {jobs.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-amber-500/50 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-amber-500/15 text-amber-500">
                        {job.cron}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                        <CheckCircle size={13} weight="fill" />
                        Đang hoạt động
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                      {job.name}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                      {job.description}
                    </p>

                    <div className="space-y-1 text-[11px] text-[var(--text-muted)] bg-[var(--bg-chat)] p-2.5 rounded-lg border border-[var(--border-color)]/60 mb-3">
                      <div className="flex justify-between">
                        <span>Lần chạy gần nhất:</span>
                        <span className="font-medium text-[var(--text-primary)]">{job.lastRun}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lần chạy kế tiếp:</span>
                        <span className="font-medium text-[var(--accent-primary)]">{job.nextRun}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Độ ổn định:</span>
                        <span className="font-semibold text-emerald-500">{job.successRate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-color)]/70 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => showToast(`Đã kích hoạt chạy thử nghiệm job: ${job.name}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-chat)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Play size={12} weight="fill" />
                      <span>Chạy ngay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 5. Demo Assignment Submission Modal */}
      {isSubmitModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileArrowUp size={20} weight="duotone" className="text-[var(--accent-primary)]" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  Nộp bài tập
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[11px] text-[var(--text-muted)] block mb-0.5">Đề bài:</span>
                <p className="font-semibold text-sm text-[var(--text-primary)]">
                  {selectedAssignment.title}
                </p>
                <span className="text-[11px] text-rose-500 font-medium mt-1 inline-block">
                  Hạn chót: {selectedAssignment.dueDate}
                </span>
              </div>

              {/* Upload area demo */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Tệp đính kèm bài làm (ZIP, PDF, DOCX):
                </label>
                <div
                  onClick={() => setSubmissionFile('BaiLam_RestAPI_NomNa_v1.zip')}
                  className="border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-[var(--bg-chat)] transition-all group"
                >
                  <FileArrowUp
                    size={32}
                    weight="duotone"
                    className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] mb-2"
                  />
                  {submissionFile ? (
                    <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
                      <Check size={16} weight="bold" />
                      <span>{submissionFile} (Đã sẵn sàng tải lên)</span>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-[var(--text-primary)]">
                        Bấm vào đây để chọn tệp hoặc kéo thả tệp vào
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        Dung lượng tối đa: 50MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Ghi chú cho Giảng viên / Reviewer:
                </label>
                <textarea
                  rows={3}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Ghi chú thêm về link GitHub, cách chạy project hoặc những điểm lưu ý..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-chat)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent-primary)] resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-chat)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check size={14} weight="bold" />
                <span>Xác nhận Nộp bài</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
