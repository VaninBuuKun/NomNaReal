import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChatCircleDots,
  GraduationCap,
  CheckCircle,
  Lightning,
  CloudArrowUp,
  ShieldCheck,
  FileText,
  PushPin,
  Sparkle,
  ArrowRight,
  ListChecks,
  Star,
  CaretDown,
  Check,
  Megaphone,
  Clock,
  Palette,
  Smiley,
  List,
  X,
} from "@phosphor-icons/react";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLoggedIn = localStorage.getItem("nomna_logged_in") === "true";

  useEffect(() => {
    document.title = "NomNa — Ứng dụng Chat & Học tập nhóm cho người Việt";
  }, []);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#090c12] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090c12]/90 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <ChatCircleDots size={24} weight="fill" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  NomNa
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  VN 🇻🇳
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium -mt-1">
                Chat &amp; Học tập nhóm
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Tính năng
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("classroom")}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <GraduationCap size={17} className="text-amber-400" />
              <span>Chế độ Lớp học</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("compare")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              So sánh Zalo &amp; Discord
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("pricing")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Bảng giá
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("testimonials")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Đánh giá
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("faq")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Hỏi đáp
            </button>
          </nav>

          {/* Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-5 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 cursor-pointer"
              >
                Vào ứng dụng →
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:-translate-y-0.5"
                >
                  Bắt đầu miễn phí
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-[#0c1018] px-5 py-4 flex flex-col gap-3 text-sm">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="text-left py-1.5 text-slate-300 hover:text-amber-400"
            >
              Tính năng
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("classroom")}
              className="text-left py-1.5 text-slate-300 hover:text-amber-400"
            >
              Chế độ Lớp học
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("compare")}
              className="text-left py-1.5 text-slate-300 hover:text-amber-400"
            >
              So sánh Zalo &amp; Discord
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("pricing")}
              className="text-left py-1.5 text-slate-300 hover:text-amber-400"
            >
              Bảng giá
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("faq")}
              className="text-left py-1.5 text-slate-300 hover:text-amber-400"
            >
              Hỏi đáp
            </button>
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2.5 rounded-lg border border-slate-700 text-white font-medium"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="w-full text-center py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold"
              >
                Tạo tài khoản miễn phí
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Glow ambient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-amber-500/15 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-6">
            <Sparkle size={14} weight="fill" />
            <span>NomNa 1.0 — Không gian trò chuyện &amp; học tập nhóm cho người Việt</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Trò chuyện nhóm gọn gàng.{" "}
            <span className="block mt-2 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
              Học tập &amp; làm đồ án không lo trôi bài.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Không còn cảnh trôi mất file tài liệu sau 30 ngày trên Zalo hay giao diện tiếng Anh rối mắt của Discord.
            NomNa mang đến không gian chat phân kênh theo môn, nộp bài tập ngay trong nhóm, điểm danh 30 giây siêu tốc.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all"
            >
              <span>Bắt đầu miễn phí ngay</span>
              <ArrowRight size={18} weight="bold" />
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection("interactive-preview")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-700 hover:border-amber-500/60 bg-[#121722] text-slate-200 font-semibold text-base transition-colors cursor-pointer"
            >
              Xem giao diện thực tế
            </button>
          </div>

          {/* Key Quick Badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={16} weight="fill" className="text-emerald-400" />
              <span>Đăng ký chỉ mất 10 giây</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={16} weight="fill" className="text-emerald-400" />
              <span>Miễn phí 100% cho sinh viên</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={16} weight="fill" className="text-emerald-400" />
              <span>Lưu tài liệu 100MB không bị xóa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={16} weight="fill" className="text-emerald-400" />
              <span>Chạy thẳng trên web &amp; điện thoại</span>
            </div>
          </div>

          {/* 3. Interactive UI Showcase Mockup */}
          <div
            id="interactive-preview"
            className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-[#0f141f] shadow-2xl overflow-hidden text-left"
          >
            {/* Window Title Bar */}
            <div className="h-10 bg-[#141b29] border-b border-slate-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 text-xs font-semibold text-slate-300">
                  NomNa — Lớp Công Nghệ Phần Mềm K22
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>34 thành viên đang trực tuyến</span>
              </div>
            </div>

            {/* Inner App Layout Preview */}
            <div className="flex h-[420px] sm:h-[480px]">
              {/* Sidebar Channels */}
              <div className="w-48 sm:w-56 bg-[#0c1018] border-r border-slate-800 p-3 hidden sm:flex flex-col gap-4 shrink-0 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Kênh thông báo
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-300 hover:bg-slate-800/60 cursor-pointer">
                    <Megaphone size={14} className="text-amber-400" />
                    <span>thong-bao-chung</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Kênh học tập
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold cursor-pointer">
                    <ListChecks size={14} />
                    <span>bai-tap-kiem-thu</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-300 hover:bg-slate-800/60 cursor-pointer">
                    <span>#</span>
                    <span>thao-luan-do-an</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-300 hover:bg-slate-800/60 cursor-pointer">
                    <span>#</span>
                    <span>hoi-dap-thay-co</span>
                  </div>
                </div>

                <div className="mt-auto p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <div className="flex items-center gap-1 font-bold mb-1">
                    <GraduationCap size={15} />
                    <span>Chế độ Lớp Học</span>
                  </div>
                  <span>Đang bật nộp bài &amp; điểm danh tự động.</span>
                </div>
              </div>

              {/* Chat Stream Area */}
              <div className="flex-1 flex flex-col justify-between bg-[#0f141f] p-4 sm:p-5 overflow-hidden">
                {/* Pinned bar */}
                <div className="h-8 px-3 rounded-lg bg-[#141b29] border border-slate-800 flex items-center justify-between text-xs text-slate-300 mb-3 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <PushPin size={13} weight="fill" className="text-amber-500 shrink-0" />
                    <span className="font-semibold text-white">Thầy Hoàng:</span>
                    <span className="truncate">Hạn chót nộp báo cáo tuần 4: 23:59 Chủ Nhật tuần này</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold shrink-0">Đã ghim</span>
                </div>

                {/* Messages stream mock */}
                <div className="flex-1 flex flex-col justify-end gap-3 text-xs overflow-hidden">
                  {/* Attendance Card Mock */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/35 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-sm">
                        <Clock size={18} weight="bold" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Điểm danh Buổi 7 — Kiến trúc Phần mềm</div>
                        <div className="text-[11px] text-slate-300">
                          Nhập mã <span className="font-mono font-bold text-amber-400 text-xs px-1.5 py-0.2 bg-amber-500/20 rounded">8492</span> để xác nhận có mặt (còn 45 giây)
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-emerald-500 text-white font-bold text-[11px] shrink-0">
                      Đã điểm danh ✓
                    </span>
                  </div>

                  {/* Teacher message */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      TH
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-white text-xs">Thầy Minh Hoàng</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                          GIẢNG VIÊN
                        </span>
                        <span className="text-[10px] text-slate-400">14:20</span>
                      </div>
                      <p className="mt-1 text-slate-200 leading-relaxed">
                        Thầy đã mở kênh bài tập kiểm thử. Các nhóm nộp tài liệu kiểm thử tự động và slide thuyết trình vào đây trước hạn nhé!
                      </p>
                    </div>
                  </div>

                  {/* Student response with file attachment */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      TV
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-white text-xs">Tường Vân (Nhóm 3)</span>
                        <span className="text-[10px] text-slate-400">14:22</span>
                      </div>
                      <p className="mt-1 text-slate-200 leading-relaxed">
                        Dạ nhóm 3 em đã hoàn thành báo cáo kiểm thử và slide ạ, em gửi thầy và các bạn xem trước:
                      </p>
                      {/* Attached File Mock */}
                      <div className="mt-2 inline-flex items-center gap-2.5 p-2 rounded-lg bg-[#141b29] border border-slate-700">
                        <FileText size={20} className="text-amber-400" />
                        <div>
                          <div className="font-semibold text-white text-[11px]">Bao_Cao_Kiem_Thu_Nhom3.pdf</div>
                          <div className="text-[9px] text-slate-400">4.2 MB · Đã nộp thành công</div>
                        </div>
                      </div>
                      {/* Reactions */}
                      <div className="mt-2 flex gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/35 text-amber-400 text-[10px] font-bold">
                          👍 6
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#141b29] border border-slate-700 text-xs">
                          🔥 4
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mock Input */}
                <div className="mt-3 pt-2 border-t border-slate-800">
                  <div className="p-2.5 rounded-lg bg-[#141b29] border border-slate-700 text-xs text-slate-400 flex items-center justify-between">
                    <span>Nhắn tin tới #bai-tap-kiem-thu... (hỗ trợ @mention, đính kèm file 100MB)</span>
                    <button className="px-3.5 py-1 rounded-md bg-amber-500 text-white font-bold text-[11px]">
                      Gửi tin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Problem vs Solution: Tại sao chọn NomNa thay vì Zalo & Discord? */}
      <section id="compare" className="py-16 md:py-24 bg-[#0c1018] border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Tại sao nên đổi từ Zalo &amp; Discord sang NomNa?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              Giải quyết triệt để những bất tiện hàng ngày mà thầy cô và sinh viên gặp phải khi trao đổi học tập.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Zalo */}
            <div className="p-6 rounded-2xl bg-[#111724] border border-rose-500/30 flex flex-col justify-between">
              <div>
                <div className="text-rose-400 font-bold text-xs mb-1 uppercase tracking-wider">
                  Bất cập trên Zalo
                </div>
                <h3 className="text-lg font-bold text-white mb-4">Nhóm chat gia đình &amp; buôn bán lẫn lộn</h3>
                <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>Tin nhắn trôi liên tục, người vào sau không tìm lại được tài liệu thầy cô gửi.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>File và ảnh quan trọng <strong>tự động bị xóa sau 30 ngày</strong> khiến sinh viên mất bài.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>Không có nộp bài theo danh sách, thầy cô phải chấm thủ công rất dễ sót.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-rose-400 font-medium">
                → Rất bất tiện cho học tập nghiêm túc
              </div>
            </div>

            {/* Discord / Slack */}
            <div className="p-6 rounded-2xl bg-[#111724] border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="text-amber-400 font-bold text-xs mb-1 uppercase tracking-wider">
                  Bất cập Discord / Slack
                </div>
                <h3 className="text-lg font-bold text-white mb-4">Giao diện tiếng Anh, chi phí đắt đỏ</h3>
                <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">✕</span>
                    <span>100% tiếng Anh, phức tạp với học sinh và thầy cô không rành công nghệ.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">✕</span>
                    <span>Slack tự động ẩn tin nhắn sau 90 ngày nếu không trả phí hàng tháng đắt đỏ.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">✕</span>
                    <span>Không có sẵn tính năng giáo dục: Không có điểm danh, không có giao bài tập.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-amber-400 font-medium">
                → Quá phức tạp và tốn kém
              </div>
            </div>

            {/* NomNa */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 via-[#111724] to-[#111724] border-2 border-amber-500 shadow-xl shadow-amber-500/15 flex flex-col justify-between relative">
              <div className="absolute -top-3 right-5 px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase">
                LỰA CHỌN TỐI ƯU
              </div>
              <div>
                <div className="text-amber-400 font-bold text-xs mb-1 uppercase tracking-wider">
                  Trải nghiệm NomNa
                </div>
                <h3 className="text-lg font-bold text-white mb-4">100% Tiếng Việt, sinh ra cho lớp học</h3>
                <ul className="space-y-3 text-xs text-white leading-relaxed">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Giao diện tiếng Việt gần gũi, ai cũng biết dùng ngay trong 1 phút.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Lưu trữ tài liệu và file bài giảng tới 100MB, <strong>vĩnh viễn không mất</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Tích hợp Chế độ Lớp Học: Điểm danh 1 chạm, thu bài và nhận xét trực tiếp.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-amber-500/30 text-xs text-amber-400 font-bold">
                ✓ Miễn phí &amp; Gọn gàng nhất cho người Việt
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Killer Feature: Chế độ Lớp Học (Classroom Mode) */}
      <section id="classroom" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold mb-3 border border-amber-500/40">
              <GraduationCap size={15} />
              <span>TÍNH NĂNG ĐỘC QUYỀN</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Chế độ Lớp Học — Đơn giản hóa việc giảng dạy &amp; nộp bài
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              Mỗi workspace của bạn có thể bật chế độ Lớp Học chỉ với 1 click. Không cần cài thêm bất kỳ phần mềm nào khác.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-5 rounded-2xl bg-[#111724] border border-slate-800 hover:border-amber-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Megaphone size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Bảng Thông Báo</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kênh riêng chỉ thầy cô hoặc ban cán sự đăng bài. Học sinh thả cảm xúc nhưng không bị spam trôi tin quan trọng.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-2xl bg-[#111724] border border-slate-800 hover:border-amber-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                <FileText size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Giao &amp; Thu Bài Tập</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Đặt deadline nộp bài rõ ràng. Sinh viên tải file bài tập trực tiếp vào thread, thầy cô chấm và ghi nhận xét riêng.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-2xl bg-[#111724] border border-slate-800 hover:border-amber-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Clock size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Điểm Danh 30 Giây</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tạo mã 4 số ngẫu nhiên. Học sinh có mặt mở điện thoại nhập mã trong 60 giây. Hệ thống tự tổng hợp danh sách vắng / có mặt.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-2xl bg-[#111724] border border-slate-800 hover:border-amber-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <CloudArrowUp size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Tài Liệu Môn Học 100MB</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Slide thuyết trình, video bài giảng, source code hay file zip bài tập lên đến 100MB đều được lưu trữ an toàn trọn vẹn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Core Features Grid */}
      <section id="features" className="py-16 md:py-24 bg-[#0c1018] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Đầy đủ mọi tính năng nhóm làm việc cần
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              Được thiết kế tỉ mỉ để bạn tập trung vào công việc và học tập, không bị xao nhãng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <ChatCircleDots size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Chat theo luồng &amp; Kênh phân loại</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mỗi môn học hay dự án đều có kênh thảo luận riêng. Nhắn tin trả lời theo thread để cuộc trò chuyện luôn ngăn nắp.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
                <PushPin size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Thanh Ghim Tin Nhắn Zalo-Style</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ghim các thông báo quan trọng lên đầu kênh. Bấm 1 chạm là nhảy ngay đến đúng tin nhắn mà không làm xô lệch giao diện.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Lightning size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Nhắc tên thông minh (@mention)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hỗ trợ @everyone, @channel, @here và tự động cách chữ mượt mà. Nhận thông báo âm thanh và pop-up tức thời.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <Palette size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">6 Chủ đề màu sắc phong cách</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tự do chuyển đổi giữa Warm Orange, Midnight Blue, Mint Green, Cyberpunk... và chế độ tối bảo vệ mắt khi thức đêm làm đồ án.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Smiley size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Thả cảm xúc &amp; Thư viện ảnh GIF</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Thả emoji phản hồi tức thì, tích hợp kho ảnh GIF vui nhộn giúp không khí thảo luận nhóm bớt căng thẳng.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <ShieldCheck size={22} weight="bold" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Bảo mật &amp; Máy chủ tại Việt Nam</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hạ tầng đặt tại Việt Nam cho tốc độ tải cực nhanh dưới 50ms, xác thực JWT đa lớp, cam kết bảo vệ dữ liệu học tập.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Pricing Section */}
      <section id="pricing" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bảng giá đơn giản, không chi phí ẩn
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              NomNa cam kết miễn phí trọn đời cho sinh viên và nhóm học tập cá nhân.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Free Tier */}
            <div className="p-7 rounded-2xl bg-[#111724] border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Gói Học Tập</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Dành cho sinh viên, nhóm làm đồ án tốt nghiệp, nhóm bạn học cùng nhau.
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">0đ</span>
                  <span className="text-xs text-slate-400">/ tháng vĩnh viễn</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Tối đa <strong>50 thành viên</strong> mỗi workspace</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Lịch sử tin nhắn <strong>vô hạn, không bị xóa</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Đính kèm file &amp; video tới <strong>100MB/file</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Không giới hạn số kênh công khai &amp; riêng tư</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/register"
                className="mt-8 block w-full text-center py-3 rounded-xl border border-slate-700 hover:border-amber-500 hover:text-amber-400 text-white font-bold text-xs transition-colors"
              >
                Bắt đầu miễn phí
              </Link>
            </div>

            {/* Classroom Pro Tier */}
            <div className="p-7 rounded-2xl bg-gradient-to-b from-amber-500/20 via-[#111724] to-[#111724] border-2 border-amber-500 shadow-xl shadow-amber-500/15 flex flex-col justify-between relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[11px] shadow-md uppercase tracking-wider">
                ĐƯỢC KHUYÊN DÙNG
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Gói Lớp Học</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Dành cho giảng viên đại học, giáo viên dạy thêm, chủ nhiệm câu lạc bộ.
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-amber-400">49.000đ</span>
                  <span className="text-xs text-slate-400">/ tháng</span>
                </div>
                <ul className="space-y-3 text-xs text-white">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 font-bold" />
                    <span>Tối đa <strong>200 thành viên</strong> mỗi lớp học</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 font-bold" />
                    <span>Mở khóa toàn bộ <strong>Chế độ Lớp Học</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 font-bold" />
                    <span>Điểm danh 1 chạm &amp; Xuất danh sách Excel</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 font-bold" />
                    <span>Giao bài tập, chấm điểm và nhận xét trực tiếp</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-amber-400 font-bold" />
                    <span>Hỗ trợ kỹ thuật ưu tiên 24/7</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/register"
                className="mt-8 block w-full text-center py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition-all"
              >
                Dùng thử 14 ngày miễn phí
              </Link>
            </div>

            {/* School / Enterprise Tier */}
            <div className="p-7 rounded-2xl bg-[#111724] border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Gói Trường Học &amp; Khoa</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Dành cho trường đại học, khoa bộ môn, hoặc các trung tâm đào tạo lớn.
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-white">Liên hệ</span>
                  <span className="text-xs text-slate-400">/ hợp đồng</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Không giới hạn số thành viên &amp; workspace</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Tên miền riêng của trường (vd: chat.truong.edu.vn)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Tùy chọn cài đặt trên máy chủ riêng (Self-hosted)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-400" />
                    <span>Tích hợp xác thực email trường (SSO / Google Workspace)</span>
                  </li>
                </ul>
              </div>
              <a
                href="mailto:contact@nomna.vn?subject=Tu_van_NomNa_TruongHoc"
                className="mt-8 block w-full text-center py-3 rounded-xl border border-slate-700 hover:border-white text-white font-bold text-xs transition-colors"
              >
                Liên hệ trao đổi
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Testimonials Section: Real Vietnamese voices */}
      <section id="testimonials" className="py-16 md:py-24 bg-[#0c1018] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Thầy cô &amp; Sinh viên nói gì về NomNa?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              Những trải nghiệm thực tế từ các lớp học và nhóm đồ án đang sử dụng NomNa mỗi ngày.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} weight="fill" />
                  ))}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "Trước đây nhắc hạn bài tập trên Zalo rất hay bị các tin chat chit làm trôi mất, còn gom file qua Google Form thì học sinh nộp nhầm liên tục. Chuyển sang NomNa, kênh thông báo và kênh nộp bài tách biệt hẳn hoi, đầu giờ điểm danh 30 giây xong ngay!"
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  TH
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Thầy Nguyễn Minh Hoàng</div>
                  <div className="text-[10px] text-slate-400">Giảng viên Khoa CNTT — ĐH Bách Khoa</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} weight="fill" />
                  ))}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "Nhóm mình 5 người làm đồ án tốt nghiệp, lúc đầu dùng Discord thì có bạn trong nhóm không quen tiếng Anh nên rất ngại dùng. Đổi sang NomNa vừa có tiếng Việt mượt mà, vừa gửi được file zip code 80MB thoải mái mà không sợ bị giới hạn."
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-xs">
                  QA
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Trần Quỳnh Anh</div>
                  <div className="text-[10px] text-slate-400">Trưởng nhóm Đồ án Tốt nghiệp K20</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#111724] border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} weight="fill" />
                  ))}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "CLB sinh viên của mình hơn 80 thành viên, trước đây tạo nhóm Facebook thì thông báo toàn bị thuật toán bóp tương tác. Trên NomNa, ai có mention @everyone là cả CLB nhận thông báo chuẩn xác 100%, không sót một ai."
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                  HL
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Lê Hoàng Long</div>
                  <div className="text-[10px] text-slate-400">Chủ nhiệm CLB Khởi Nghiệp Trẻ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section id="faq" className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Câu hỏi thường gặp
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Những điều người dùng quan tâm nhất trước khi chuyển sang NomNa.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "NomNa có thực sự miễn phí không?",
                a: "Có. Gói Học Tập cơ bản dành cho sinh viên và nhóm cá nhân là hoàn toàn miễn phí trọn đời, hỗ trợ tối đa 50 người và không giới hạn thời gian lưu trữ tin nhắn. Bạn chỉ cần nâng cấp nếu muốn dùng thêm các tính năng nâng cao như xuất báo cáo Excel cho lớp học đông người.",
              },
              {
                q: "File tài liệu và bài tập gửi lên có bị hết hạn sau 30 ngày như Zalo không?",
                a: "Không bao giờ. Toàn bộ file bài giảng, slide thuyết trình, đề bài và bài nộp của học sinh (lên đến 100MB mỗi tệp) được lưu trữ an toàn trên máy chủ của NomNa. Bạn có thể xem lại và tải về bất kỳ lúc nào, kể cả sau khi học kỳ kết thúc.",
              },
              {
                q: "Thành viên nhóm có bắt buộc phải cài đặt phần mềm nặng về máy không?",
                a: "Không cần thiết. NomNa chạy mượt mà ngay trên mọi trình duyệt web hiện đại (Chrome, Safari, Edge, Cốc Cốc) trên cả máy tính lẫn điện thoại di động. Chỉ cần bấm vào link mời là vào nhóm học ngay lập tức.",
              },
              {
                q: "Làm thế nào để tạo lớp học và mời học sinh vào?",
                a: "Sau khi đăng ký tài khoản, bạn bấm vào nút 'Tạo Workspace', chọn mẫu 'Lớp Học' hoặc 'Nhóm Dự Án'. Hệ thống sẽ tự động tạo một đường link mời (hoặc mã mời 6 chữ số). Bạn chỉ cần gửi đường link đó vào nhóm lớp là mọi người có thể tham gia ngay.",
              },
              {
                q: "Dữ liệu thảo luận và tài liệu học tập của chúng tôi có được bảo mật không?",
                a: "Chắc chắn. Tất cả kênh chat riêng tư và bài tập chỉ có thành viên trong workspace mới được quyền truy cập. Chúng tôi không chia sẻ hoặc bán dữ liệu của bạn cho bất kỳ bên thứ ba nào.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-[#111724] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-white text-sm sm:text-base cursor-pointer hover:bg-slate-800/60 transition-colors"
                >
                  <span>{faq.q}</span>
                  <CaretDown
                    size={18}
                    className={`transition-transform duration-200 text-amber-400 shrink-0 ${
                      openFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Final Call to Action */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-transparent via-amber-500/10 to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-rose-500/25 border border-amber-500/40 backdrop-blur-sm">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Sẵn sàng tạo không gian học tập &amp; làm việc nhóm hiệu quả hơn?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
              Chỉ mất chưa đầy 30 giây để tạo workspace đầu tiên của bạn. Hoàn toàn miễn phí, không yêu cầu thẻ tín dụng.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
              >
                Tạo Workspace Miễn Phí
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-700 bg-[#121722] text-white font-semibold text-base hover:bg-slate-800 transition-colors"
              >
                Đã có tài khoản? Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="border-t border-slate-800 py-12 text-xs text-slate-400 bg-[#07090f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white">
              <ChatCircleDots size={18} weight="fill" />
            </div>
            <div>
              <span className="font-bold text-sm text-white">NomNa</span>
              <p className="text-[11px] text-slate-400">
                Không gian học tập &amp; làm việc nhóm cho người Việt 🇻🇳
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Tính năng
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("classroom")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Chế độ Lớp học
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("pricing")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Bảng giá
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("faq")}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Hỏi đáp
            </button>
            <Link to="/login" className="hover:text-amber-400 transition-colors">
              Đăng nhập
            </Link>
            <Link to="/register" className="hover:text-amber-400 transition-colors">
              Đăng ký
            </Link>
          </div>

          <div>
            <span>© 2026 NomNa. Tự hào phát triển tại Việt Nam.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
