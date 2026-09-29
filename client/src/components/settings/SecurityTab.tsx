import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, ShieldCheck, KeyRound } from "lucide-react";
import { Button, Input, Badge } from "../ui";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Mật khẩu hiện tại phải từ 6 ký tự"),
    newPassword: z.string().min(6, "Mật khẩu mới phải từ 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng nhập lại mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export const SecurityTab: React.FC = () => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitPassword = async (_values: PasswordFormValues) => {
    try {
      setErrorMessage(null);
      setIsSuccess(false);
      // Simulating API call for password change
      await new Promise((r) => setTimeout(r, 600));
      setIsSuccess(true);
      reset();
      setTimeout(() => setIsSuccess(false), 3000);
    } catch {
      setErrorMessage("Không thể cập nhật mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Change Password Section */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={17} className="text-[var(--accent-primary)]" />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Đổi mật khẩu tài khoản
          </h3>
        </div>

        {errorMessage && (
          <div className="p-3 text-xs rounded-[4px] bg-rose-500/10 border border-rose-500/25 text-rose-500 font-medium">
            {errorMessage}
          </div>
        )}

        {isSuccess && (
          <div className="p-3 text-xs rounded-[4px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-semibold flex items-center gap-2">
            <Check size={16} />
            <span>Mật khẩu của bạn đã được cập nhật thành công!</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            placeholder="••••••••••••"
            showPasswordToggle
            {...register("currentPassword")}
            error={errors.currentPassword?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mật khẩu mới"
              type="password"
              placeholder="••••••••••••"
              showPasswordToggle
              {...register("newPassword")}
              error={errors.newPassword?.message}
            />

            <Input
              label="Nhập lại mật khẩu mới"
              type="password"
              placeholder="••••••••••••"
              showPasswordToggle
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Cập nhật mật khẩu
            </Button>
          </div>
        </form>
      </section>

      {/* 2. Two-Factor Authentication */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Xác thực 2 lớp (2FA - TOTP)
            </h3>
          </div>
          <Badge variant="success">Khuyến nghị</Badge>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Bảo vệ tài khoản an toàn hơn bằng cách yêu cầu mã xác thực 6 số từ Google Authenticator hoặc Authy mỗi khi đăng nhập trên thiết bị lạ.
        </p>

        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => alert("Tính năng thiết lập mã QR 2FA sẽ được mở trong bản phát hành tới.")}
          >
            Bật xác thực 2 lớp
          </Button>
        </div>
      </section>
    </div>
  );
};
