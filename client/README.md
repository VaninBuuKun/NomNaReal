# 💻 NomNa Client — Frontend Reference

React 18 Single Page Application built with TypeScript, Vite, Tailwind CSS, and Zustand.

---

## 🚀 Quick Start
```bash
npm install
npm run dev      # Khởi chạy dev server tại http://localhost:5173
npm run build    # Type-check (tsc) và bundle production vào dist/
npm run lint     # Chạy ESLint
```

---

## 📁 Cấu Trúc Mã Nguồn (Component-Group Pattern)
- `src/components/<domain>/`: Chia nhóm theo nghiệp vụ (`auth`, `workspace`, `channel`, `chat`, `thread`, `dm`, `settings`) kèm `index.ts`.
- `src/components/ui/`: Atomic UI primitives dùng chung (`Button`, `Input`, `Modal`, `Avatar`, `Badge`, `Spinner`, `Toast`).
- `src/services/`: API clients Axios (`withCredentials: true`) tương ứng từng Controller backend + `signalr.ts`.
- `src/hooks/`: Custom hooks đóng gói logic nghiệp vụ (`useAuth`, `useMessages`, `useSignalR`, `useTheme`).
- `src/styles/`: Tailwind CSS base và hệ thống theme tokens (6 bộ màu CSS variables).

---

## 🔐 Nguyên Tắc Phát Triển
1. **Token Security**: Tokens lưu trong HttpOnly Cookie từ backend, tuyệt đối không lưu access/refresh token vào `localStorage`.
2. **Avatar Uniformity**: Luôn dùng thẻ `<img>` với fallback `/default-avatar.png` có xử lý `onError`, không dùng initials text trên nền gradient.
3. **UI Consistency**: Sử dụng primitives từ `components/ui/` và tuân thủ chuẩn `rounded-md` cho chat input & toolbar.
