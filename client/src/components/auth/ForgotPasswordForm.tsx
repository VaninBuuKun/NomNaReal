import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { ArrowLeft, PaperPlaneTilt, CheckCircle } from "@phosphor-icons/react";
import { Button, Input } from "../ui";
import { authApi } from "../../services/authApi";
import { getFriendlyErrorMessage } from "../../utils/errorMap";

const forgotPasswordSchema = z.object({
  email: z.string().email("Vui lòng nhập địa chỉ email hợp lệ"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSuccess?: (email: string) => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLocalError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      onSuccess?.(data.email);
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err, "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.");
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center text-center gap-3.5 py-2 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/25 shadow-xs">
          <CheckCircle size={32} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Đã gửi email khôi phục!
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
          Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến địa chỉ{" "}
          <strong className="text-[var(--text-primary)] font-semibold">
            {submittedEmail}
          </strong>
          . Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).
        </p>

        <div className="w-full flex flex-col gap-2 pt-2">
          <Link
            to={`/reset-password?email=${encodeURIComponent(submittedEmail)}`}
          >
            <Button variant="primary" size="md" className="w-full">
              Nhập mã xác nhận / Đặt lại mật khẩu
            </Button>
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer group py-1"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-3.5"
    >
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        Nhập địa chỉ email tài khoản của bạn. NomNa sẽ gửi liên kết và mã xác
        thực để bạn tạo mật khẩu mới an toàn.
      </p>

      {localError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium animate-in fade-in duration-150">
          {localError}
        </div>
      )}

      <Input
        label="Địa chỉ Email"
        type="email"
        placeholder="user@example.com"
        autoFocus
        {...form.register("email")}
        error={form.formState.errors.email?.message}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        className="w-full mt-2"
        rightIcon={<PaperPlaneTilt size={16} weight="bold" />}
      >
        Gửi liên kết khôi phục
      </Button>

      <div className="text-center pt-1">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer group py-1"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Quay lại Đăng nhập</span>
        </Link>
      </div>
    </form>
  );
};
