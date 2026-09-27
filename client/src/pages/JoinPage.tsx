import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  SignIn,
  WarningCircle,
  Sparkle,
  ArrowLeft,
  CircleNotch,
} from '@phosphor-icons/react';
import { workspaceApi } from '../services';
import { Button } from '../components/ui';
import type { Workspace } from '../types';

export const JoinPage: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = localStorage.getItem('nomna_logged_in') === 'true';

  useEffect(() => {
    if (!inviteCode) {
      setError('Mã mời không hợp lệ.');
      setIsLoading(false);
      return;
    }

    const loadWorkspacePreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const ws = await workspaceApi.getWorkspaceByInviteCode(inviteCode);
        setWorkspace(ws);
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { message?: string } } };
        setError(
          errorObj?.response?.data?.message ||
            'Không tìm thấy không gian làm việc hoặc liên kết mời này đã hết hạn.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspacePreview();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode || isJoining) return;

    if (!isLoggedIn) {
      // Save pending invite so AuthPage can redirect back after authentication
      sessionStorage.setItem('nomna_pending_invite', inviteCode);
      navigate(`/login?redirect=/join/${inviteCode}`);
      return;
    }

    try {
      setIsJoining(true);
      setError(null);
      const joined = await workspaceApi.joinWorkspace(inviteCode);
      sessionStorage.removeItem('nomna_pending_invite');
      navigate(`/workspace/${joined.id}`, { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(
        errorObj?.response?.data?.message || 'Không thể tham gia không gian làm việc này.'
      );
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-chat)] text-[var(--text-primary)] select-none">
        <CircleNotch size={36} className="animate-spin text-[var(--accent-primary)] mb-3" />
        <div className="text-sm font-bold">Đang kiểm tra lời mời...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-[var(--bg-chat)] text-[var(--text-primary)] relative overflow-hidden select-none dot-matrix-bg">
      {/* Glow Ambient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[var(--accent-primary)]/10 blur-3xl pointer-events-none" />

      {/* Card Wrapper */}
      <div className="relative z-10 w-full max-w-[440px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[6px] shadow-2xl p-7 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-xs">
              <WarningCircle size={32} weight="bold" />
            </div>
            <h2 className="text-lg font-black text-[var(--text-primary)]">
              Lời mời không hợp lệ
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xs">
              {error}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigate('/')}
              leftIcon={<ArrowLeft size={14} weight="bold" />}
              className="mt-3 text-xs py-2 px-4 rounded-[3px]"
            >
              Quay lại trang chủ
            </Button>
          </div>
        ) : workspace ? (
          <>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-primary)]/20 text-[11px] font-bold text-[var(--accent-primary)] mb-5 shadow-2xs">
              <Sparkle size={13} weight="fill" />
              <span>Lời mời tham gia Không gian</span>
            </div>

            {/* Workspace Avatar */}
            <div className="w-20 h-20 rounded-[8px] overflow-hidden border-2 border-[var(--border-color)] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-md mb-3.5">
              {workspace.iconUrl ? (
                <img
                  src={workspace.iconUrl}
                  alt={workspace.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                workspace.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Workspace Name & Info */}
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
              {workspace.name}
            </h1>
            <div className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1 mb-4">
              <Users size={14} weight="bold" />
              <span>{workspace.memberCount || 1} thành viên</span>
            </div>

            {workspace.description && (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3 bg-[var(--bg-chat)] p-3 rounded-[4px] border border-[var(--border-color)] w-full text-left">
                {workspace.description}
              </p>
            )}

            {/* Actions */}
            <div className="w-full flex flex-col gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleJoin}
                isLoading={isJoining}
                leftIcon={<SignIn size={16} weight="bold" />}
                className="w-full justify-center py-2.5 rounded-[4px] text-xs font-bold shadow-sm"
              >
                {isLoggedIn ? 'Chấp nhận lời mời & Tham gia' : 'Đăng nhập để tham gia'}
              </Button>

              {!isLoggedIn && (
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Chưa có tài khoản?{' '}
                  <Link
                    to={`/register?redirect=/join/${inviteCode}`}
                    onClick={() => sessionStorage.setItem('nomna_pending_invite', inviteCode!)}
                    className="text-[var(--accent-primary)] font-bold hover:underline"
                  >
                    Đăng ký ngay
                  </Link>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
