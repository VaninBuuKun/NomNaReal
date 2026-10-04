import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, ShieldCheck } from '@phosphor-icons/react';
import { Button, Input } from '../ui';
import { authApi } from '../../services/authApi';
import { getFriendlyErrorMessage } from '../../utils/errorMap';

const resetPasswordSchema = z
  .object({
    email: z.string().email('Địa chỉ email không hợp lệ'),
    token: z.string().min(1, 'Vui lòng nhập mã xác nhận hoặc token'),
    newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onSuccess?: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || searchParams.get('code') || '';

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      token: initialToken,
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (initialEmail) form.setValue('email', initialEmail);
    if (initialToken) form.setValue('token', initialToken);
  }, [initialEmail, initialToken, form]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLocalError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({
        email: data.email,
        token: data.token,
        newPassword: data.newPassword,
      });
      setIsSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err, 'Không thể đặt lại mật khẩu. Mã xác nhận có thể đã hết hạn hoặc không hợp lệ.');
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center gap-3.5 py-3 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/25 shadow-xs">
          <CheckCircle size={32} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Đổi mật khẩu thành công!
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Mật khẩu tài khoản của bạn đã được cập nhật an toàn. Đang chuyển hướng bạn đến trang Đăng nhập...
        </p>
        <Link to="/login" className="w-full mt-2">
          <Button variant="primary" size="md" className="w-full">
            Đến trang Đăng nhập ngay
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        Nhập mã xác thực đã gửi đến email của bạn và thiết lập mật khẩu mới.
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
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />

      <Input
        label="Mã xác thực / Reset Token"
        type="text"
        placeholder="Nhập mã xác nhận từ email"
        {...form.register('token')}
        error={form.formState.errors.token?.message}
      />

      <Input
        label="Mật khẩu mới"
        type="password"
        placeholder="Tối thiểu 6 ký tự"
        showPasswordToggle
        {...form.register('newPassword')}
        error={form.formState.errors.newPassword?.message}
      />

      <Input
        label="Xác nhận mật khẩu mới"
        type="password"
        placeholder="Nhập lại mật khẩu mới"
        showPasswordToggle
        {...form.register('confirmPassword')}
        error={form.formState.errors.confirmPassword?.message}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        className="w-full mt-2"
        rightIcon={<ShieldCheck size={17} weight="bold" />}
      >
        Cập nhật mật khẩu mới
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
