import React, { useState, useMemo } from 'react';
import {
  Link as LinkIcon,
  EnvelopeSimple,
  Copy,
  Check,
  PaperPlaneTilt,
  Info,
  CheckCircle,
} from '@phosphor-icons/react';
import { Modal, Button } from '../ui';
import type { Workspace } from '../../types';
import { workspaceApi } from '../../services/workspaceApi';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  workspace,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'gmail'>('link');
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  // Gmail tab state
  const [gmailInput, setGmailInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inviteCode = workspace?.inviteCode || 'NEXUS123';
  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${inviteCode}`
    : `https://nomna.app/join/${inviteCode}`;

  // Parse emails separated by comma, semicolon, space, or newline
  const parsedEmails = useMemo(() => {
    if (!gmailInput.trim()) return [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const tokens = gmailInput
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    return tokens.filter((t) => emailRegex.test(t));
  }, [gmailInput]);

  const handleCopy = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSendGmailInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedEmails.length === 0 || isSending || !workspace?.id) return;

    setIsSending(true);
    setSendSuccessMessage(null);
    setErrorMessage(null);

    try {
      const result = await workspaceApi.sendEmailInvites(workspace.id, parsedEmails);
      let msg = `Đã gửi thành công ${result.sentCount} email mời tham gia!`;
      if (result.alreadyMemberEmails && result.alreadyMemberEmails.length > 0) {
        msg += ` (${result.alreadyMemberEmails.length} email đã là thành viên)`;
      }
      setSendSuccessMessage(msg);
      setGmailInput('');
      setTimeout(() => setSendSuccessMessage(null), 6000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        errorObj?.response?.data?.message || 'Có lỗi xảy ra khi gửi email mời. Vui lòng thử lại.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setGmailInput('');
    setSendSuccessMessage(null);
    setErrorMessage(null);
    setCopiedType(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mời thành viên vào không gian"
      subtitle={`Mời bạn bè và đồng nghiệp tham gia ${workspace?.name || 'không gian làm việc'}.`}
      className="max-w-[480px]"
    >
      <div className="p-5 flex flex-col gap-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px]">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.75 text-xs font-bold rounded-[3px] transition-all cursor-pointer select-none ${
              activeTab === 'link'
                ? 'bg-[var(--bg-chat)] text-[var(--accent-primary)] shadow-2xs border border-[var(--border-color)]/70'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]'
            }`}
          >
            <LinkIcon size={15} weight="bold" />
            <span>Liên kết mời</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gmail')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.75 text-xs font-bold rounded-[3px] transition-all cursor-pointer select-none ${
              activeTab === 'gmail'
                ? 'bg-[var(--bg-chat)] text-[var(--accent-primary)] shadow-2xs border border-[var(--border-color)]/70'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]'
            }`}
          >
            <EnvelopeSimple size={15} weight="bold" />
            <span>Gửi qua Gmail</span>
          </button>
        </div>

        {/* Tab 1: Invite Link & Code */}
        {activeTab === 'link' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. Invite Code Box */}
            <div className="p-3.5 rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Mã mời trực tiếp (Invite Code)
                </span>
                <span className="font-mono text-base font-extrabold tracking-widest text-[var(--text-primary)] select-all">
                  {inviteCode}
                </span>
              </div>

              <Button
                type="button"
                variant={copiedType === 'code' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleCopy(inviteCode, 'code')}
                leftIcon={
                  copiedType === 'code' ? (
                    <Check size={14} weight="bold" />
                  ) : (
                    <Copy size={14} weight="bold" />
                  )
                }
                className="shrink-0 text-xs py-1.5 px-3 rounded-[3px]"
              >
                {copiedType === 'code' ? 'Đã sao chép' : 'Sao chép mã'}
              </Button>
            </div>

            {/* 2. Full URL Box */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Đường dẫn liên kết tham gia
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 min-w-0 px-3 py-2 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] select-all focus:outline-none font-mono"
                />
                <Button
                  type="button"
                  variant={copiedType === 'link' ? 'primary' : 'primary'}
                  size="sm"
                  onClick={() => handleCopy(inviteUrl, 'link')}
                  leftIcon={
                    copiedType === 'link' ? (
                      <Check size={14} weight="bold" />
                    ) : (
                      <Copy size={14} weight="bold" />
                    )
                  }
                  className="shrink-0 text-xs py-2 px-3.5 rounded-[3px]"
                >
                  {copiedType === 'link' ? 'Đã sao chép!' : 'Sao chép'}
                </Button>
              </div>
            </div>

            {/* Hint Box */}
            <div className="flex items-start gap-2 p-2.5 rounded-[4px] bg-[var(--accent-soft)] border border-[var(--accent-primary)]/20 text-[11px] text-[var(--text-secondary)] leading-relaxed">
              <Info size={16} weight="bold" className="text-[var(--accent-primary)] shrink-0 mt-0.5" />
              <span>
                Bất kỳ ai có đường link hoặc mã mời này đều có thể tham gia vào không gian làm việc{' '}
                <strong className="text-[var(--text-primary)]">{workspace?.name || 'Nexus Hub'}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Gmail Invitations */}
        {activeTab === 'gmail' && (
          <form onSubmit={handleSendGmailInvites} className="space-y-4 animate-in fade-in duration-150">
            {sendSuccessMessage && (
              <div className="flex items-center gap-2 p-3 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-in fade-in">
                <CheckCircle size={16} weight="bold" className="shrink-0" />
                <span>{sendSuccessMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-[4px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in">
                <Info size={16} weight="bold" className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Danh sách địa chỉ Gmail
                </label>
                {parsedEmails.length > 0 && (
                  <span className="text-[11px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full">
                    {parsedEmails.length} email hợp lệ
                  </span>
                )}
              </div>

              <textarea
                rows={4}
                value={gmailInput}
                onChange={(e) => setGmailInput(e.target.value)}
                placeholder="Nhập email bạn bè, đồng nghiệp:&#10;alice@gmail.com, bob.dev@gmail.com&#10;hoặc xuống dòng để thêm nhiều email..."
                autoFocus
                className="w-full p-3 text-xs rounded-[3px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none leading-relaxed font-mono"
              />

              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                💡 Phân tách các email bằng dấu phẩy (<code className="font-mono">,</code>), khoảng trắng hoặc dòng mới.
              </p>
            </div>

            {/* Quick detected chips */}
            {parsedEmails.length > 0 && (
              <div className="max-h-[90px] overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-color)]">
                {parsedEmails.map((email, idx) => (
                  <span
                    key={`${email}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[var(--bg-chat)] border border-[var(--border-color)] text-[10px] text-[var(--text-primary)] font-mono"
                  >
                    <span>✉️</span>
                    <span className="truncate max-w-[180px]">{email}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Send Button */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-color)]">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                Đóng
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSending}
                disabled={parsedEmails.length === 0 || isSending}
                leftIcon={<PaperPlaneTilt size={14} weight="bold" />}
                className="text-xs py-2 px-4 rounded-[3px]"
              >
                {isSending ? 'Đang gửi...' : `Gửi ${parsedEmails.length > 0 ? `(${parsedEmails.length})` : ''} lời mời`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
