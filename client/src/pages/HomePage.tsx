import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  ArrowRight,
  ShieldCheck,
  ChatTeardropText,
  CloudArrowUp,
  CirclesThreePlus,
  CheckCircle,
  Question,
  BookOpen,
  LockKey,
  ShieldStar,
  SignIn,
  ChatCircleDots,
} from "@phosphor-icons/react";
import {
  CreateWorkspaceModal,
  JoinWorkspaceModal,
} from "../components/workspace";
import { SettingsModal } from "../components/settings";
import { WorkspaceAvatar, UserAvatar } from "../components/ui";
import { authApi, workspaceApi } from "../services";
import type { User, Workspace } from "../types";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isJoinWorkspaceOpen, setIsJoinWorkspaceOpen] = useState(false);

  useEffect(() => {
    const initHome = async () => {
      try {
        setIsLoading(true);
        let user: User;
        try {
          user = await authApi.getMe();
        } catch {
          user = await authApi.refresh();
        }
        setCurrentUser(user);
        localStorage.setItem("nomna_logged_in", "true");

        const wsList = await workspaceApi.getWorkspaces();
        setWorkspaces(wsList);
      } catch (err) {
        console.error("Failed to load user or workspaces on home:", err);
        localStorage.removeItem("nomna_logged_in");
        navigate("/login", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    initHome();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("nomna_logged_in");
    setCurrentUser(null);
    setIsSettingsOpen(false);
    navigate("/login");
  };

  const handleWorkspaceCreated = (newWs: Workspace) => {
    setWorkspaces((prev) => [...prev, newWs]);
    navigate(`/workspace/${newWs.id}`);
  };

  const handleWorkspaceJoined = (joinedWs: Workspace) => {
    setWorkspaces((prev) => {
      const exists = prev.some((w) => w.id === joinedWs.id);
      return exists ? prev : [...prev, joinedWs];
    });
    navigate(`/workspace/${joinedWs.id}`);
  };

  if (isLoading) {
    return <></>
  }

  return (
    <div className="min-h-screen bg-[var(--bg-chat)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--accent-primary)] selection:text-white">
      {/* 1. Header: Sleek, non-pill, dynamic navigation */}
      <header className="sticky top-0 z-40 h-[72px] bg-[var(--bg-chat)]/85 backdrop-blur-md px-6 md:px-12 lg:px-16 flex items-center justify-between select-none transition-all relative border-b border-[var(--border-color)]/30">
        {/* Dải sáng Ambient Glow mảnh siêu mờ chạy dọc mép dưới header */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-primary)]/40 to-transparent pointer-events-none" />

        {/* Left: Brand Identity -> Logo bên TRÁI, Chữ NomNa bên PHẢI với hiệu ứng cực nổi bật */}
        <div
          className="relative z-10 flex items-center gap-3.5 cursor-pointer group py-2 rounded-none"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          {/* Logo bên TRÁI + Hiệu ứng Glow & Rotate / Scale Nổi Bật */}
          <div className="relative shrink-0">
            {/* Vòng viền Gradient tỏa sáng khi hover */}
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-amber-500 opacity-0 group-hover:opacity-100 blur-xs transition-all duration-300 group-hover:scale-105" />

            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--accent-primary)] to-amber-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
              <ChatCircleDots size={24} weight="fill" />
            </div>
          </div>

          {/* Chữ NomNa bên PHẢI + Hiệu ứng Đẩy nhẹ & Tỏa sáng chữ */}
          <span className="text-2xl font-black tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all duration-300 group-hover:drop-shadow-[0_0_12px_var(--accent-glow)]">
            NomNa
          </span>
        </div>

        {/* Right: Modern User Profile -> Text trước (bên trái), Avatar sau (bên phải) */}
        <div className="relative z-10 flex items-center">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="group flex items-center gap-3.5 py-2 px-1 transition-all duration-300 cursor-pointer rounded-none relative"
            title="Cài đặt & Tài khoản"
          >
            {/* Cụm Text căn lề phải (bên trái Avatar) */}
            <div className="flex flex-col text-right min-w-0">
              <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors duration-300 leading-tight max-w-[150px] truncate">
                {currentUser?.displayName ||
                  currentUser?.username ||
                  "Tài khoản"}
              </span>
              <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors duration-300 leading-tight mt-1 max-w-[150px] truncate">
                @{currentUser?.username || "user"}
              </span>
            </div>

            {/* Avatar bên phải + Hiệu ứng Ring Glow khi hover */}
            <div className="relative shrink-0">
              <UserAvatar
                name={currentUser?.displayName || currentUser?.username || "User"}
                avatarUrl={currentUser?.avatarUrl}
                size="md"
                className="ring-2 ring-[var(--border-color)]/60 group-hover:ring-[var(--accent-primary)] group-hover:scale-105 transition-all duration-300"
              />
              <span className="absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-[var(--bg-chat)] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>

            {/* Hiệu ứng gạch chân (Underline Accent) chạy mượt khi hover thay vì bọc khối */}
            <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-[var(--accent-primary)] group-hover:w-full transition-all duration-300 rounded-full" />
          </button>
        </div>
      </header>
      {/* 2. Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 md:px-12 py-10 flex flex-col gap-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[6px] border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-chat)] to-[var(--bg-surface)] p-8 md:p-12 shadow-sm">
          {/* Subtle Glow Ambient */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[var(--accent-primary)]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-primary)]/20 text-xs font-bold text-[var(--accent-primary)] w-fit shadow-2xs">
              {/* <Sparkle size={14} weight="fill" /> */}
              <span>Chào mừng bạn đến với NomNa!</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
              Nền tảng Workspace & giao tiếp thời gian thực hiện đại
            </h1>

            <p className="text-sm md:text-base text-[var(--text-muted)] leading-relaxed">
              Kết nối mọi thành viên qua các kênh thảo luận chuyên sâu, luồng
              thread tập trung và chia sẻ tài liệu, video dung lượng lớn. Chọn
              một Workspace bên dưới để bắt đầu hoặc khởi tạo Workspace mới
              cho đội ngũ của bạn.
            </p>

            {/* Quick Feature Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--border-color)]/70 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <ChatTeardropText
                  size={17}
                  weight="duotone"
                  className="text-[var(--accent-primary)] shrink-0"
                />
                <span className="font-semibold">Kênh & Thread</span>
              </div>
              <div className="flex items-center gap-2">
                <CloudArrowUp
                  size={17}
                  weight="duotone"
                  className="text-amber-500 shrink-0"
                />
                <span className="font-semibold">File & Video 100MB</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={17}
                  weight="duotone"
                  className="text-emerald-500 shrink-0"
                />
                <span className="font-semibold">Chat Realtime</span>
              </div>
              <div className="flex items-center gap-2">
                <LockKeyIcon
                  size={17}
                  weight="duotone"
                  className="text-blue-500 shrink-0"
                />
                <span className="font-semibold">Bảo mật an toàn</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Workspaces Section (Grid + Add Workspace Button) */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
                  Danh sách Workspace của bạn
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--accent-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                  {workspaces.length}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Nhấp vào một Workspace để mở khung chat và bắt đầu làm việc
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsJoinWorkspaceOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-surface-active)] hover:border-[var(--accent-primary)] transition-all cursor-pointer group shrink-0"
              >
                <SignIn
                  size={16}
                  weight="bold"
                  className="text-[var(--accent-primary)]"
                />
                <span>Tham gia bằng mã</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateWorkspaceOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[4px] bg-[var(--accent-primary)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] transition-all shadow-[0_2px_10px_var(--accent-glow)] cursor-pointer group shrink-0"
              >
                <Plus
                  size={16}
                  weight="bold"
                  className="group-hover:rotate-90 transition-transform duration-200"
                />
                <span>Tạo Workspace mới</span>
              </button>
            </div>
          </div>

          {/* Workspaces Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* List of Existing Workspaces */}
            {workspaces.map((ws) => {
              const memberCount = ws.memberCount || 1;

              return (
                <div
                  key={ws.id}
                  onClick={() => navigate(`/workspace/${ws.id}`)}
                  className="group relative flex flex-col justify-between p-5 rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)] hover:shadow-[0_8px_24px_var(--accent-glow)] transition-all duration-200 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3.5 mb-3">
                    {/* Workspace Avatar */}
                    <WorkspaceAvatar
                      name={ws.name}
                      iconUrl={ws.iconUrl}
                      size="lg"
                      roundedClassName="rounded-[6px]"
                      className="shadow-xs group-hover:scale-105 group-hover:border-[var(--accent-primary)]/40 transition-all duration-200"
                    />

                    {/* Name & Member Count */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                        {ws.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1">
                        <Users size={14} weight="bold" className="shrink-0" />
                        <span>{memberCount} thành viên</span>
                      </div>
                    </div>
                  </div>

                  {/* Description (if any) */}
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mb-4 min-h-[36px]">
                    {ws.description ||
                      "Workspace thảo luận, cập nhật tiến độ và làm việc nhóm của dự án."}
                  </p>

                  {/* Enter Button Indicator */}
                  <div className="pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    <span>Truy cập Workspace</span>
                    <ArrowRight
                      size={14}
                      weight="bold"
                      className="group-hover:translate-x-1 transition-transform duration-200"
                    />
                  </div>
                </div>
              );
            })}

            {/* Quick Create Workspace Card */}
            <div
              onClick={() => setIsCreateWorkspaceOpen(true)}
              className="flex flex-col items-center justify-center text-center p-6 rounded-[4px] border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] bg-[var(--bg-surface)]/50 hover:bg-[var(--accent-soft)] transition-all duration-200 cursor-pointer group min-h-[160px]"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--bg-chat)] border border-[var(--border-color)] group-hover:border-[var(--accent-primary)] group-hover:scale-110 flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-all duration-200 mb-3 shadow-2xs">
                <Plus size={22} weight="bold" />
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                Tạo thêm Workspace mới
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px] leading-relaxed">
                Tạo một Workspace riêng cho phòng ban hoặc nhóm mới
              </p>
            </div>

            {/* Quick Join Workspace Card */}
            <div
              onClick={() => setIsJoinWorkspaceOpen(true)}
              className="flex flex-col items-center justify-center text-center p-6 rounded-[4px] border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-primary)] bg-[var(--bg-surface)]/50 hover:bg-[var(--accent-soft)] transition-all duration-200 cursor-pointer group min-h-[160px]"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--bg-chat)] border border-[var(--border-color)] group-hover:border-[var(--accent-primary)] group-hover:scale-110 flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-all duration-200 mb-3 shadow-2xs">
                <SignIn size={22} weight="bold" />
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                Tham gia bằng mã mời
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px] leading-relaxed">
                Nhập mã mời hoặc liên kết để tham gia vào Workspace có sẵn
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 4. Elongated & Thoughtful Footer */}
      <footer className="mt-auto border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-12 px-6 md:px-12 select-none">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: Brand & Slogan */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/default-avatar.png"
                  alt="NomNa Logo"
                  className="w-7 h-7 rounded-lg object-cover border border-[var(--border-color)] shadow-xs"
                />
                <span className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                  NomNa
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-sm">
                Nền tảng làm việc nhóm và giao tiếp trực tiếp trong không gian
                riêng tư. Kết nối đồng đội, chia sẻ ý tưởng và đẩy nhanh tiến độ
                dự án.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                <span>Mọi dịch vụ SignalR & S3 đang hoạt động bình thường</span>
              </div>
            </div>

            {/* Col 2: Hỗ trợ & Tài liệu */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Hỗ trợ & Tài liệu
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-2 text-xs text-[var(--text-muted)]">
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <BookOpen size={13} />
                  <span>Hướng dẫn bắt đầu</span>
                </li>
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <Question size={13} />
                  <span>Câu hỏi thường gặp</span>
                </li>
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <CheckCircle size={13} />
                  <span>Trạng thái hệ thống</span>
                </li>
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <CirclesThreePlus size={13} />
                  <span>Góp ý & Báo lỗi</span>
                </li>
              </ul>
            </div>

            {/* Col 3: Điều khoản & Bảo mật */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Điều khoản & Bảo mật
              </h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-2 text-xs text-[var(--text-muted)]">
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <ShieldStar size={13} />
                  <span>Điều khoản dịch vụ</span>
                </li>
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <LockKey size={13} />
                  <span>Chính sách quyền riêng tư</span>
                </li>
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <ShieldCheck size={13} />
                  <span>Bảo mật dữ liệu đám mây</span>
                </li>
                <li className="hover:text-[var(--accent-primary)] transition-colors cursor-pointer flex items-center gap-1.5">
                  <CheckCircle size={13} />
                  <span>Tiêu chuẩn cộng đồng</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="pt-6 border-t border-[var(--border-color)]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <div>© 2026 NomNa Inc. Mọi quyền được bảo lưu.</div>
            <div className="flex items-center gap-4">
              <span>Phiên bản 1.2.0</span>
              <span>·</span>
              <span>Được thiết kế cho hiệu suất & sự tập trung</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onUserUpdated={(u) => setCurrentUser(u)}
      />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      {/* Join Workspace Modal */}
      <JoinWorkspaceModal
        isOpen={isJoinWorkspaceOpen}
        onClose={() => setIsJoinWorkspaceOpen(false)}
        onWorkspaceJoined={handleWorkspaceJoined}
      />
    </div>
  );
};
