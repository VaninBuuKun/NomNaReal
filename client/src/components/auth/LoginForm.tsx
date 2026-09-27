import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Button, Input } from '../ui';
import { authApi } from '../../services/authApi';

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Vui lòng nhập email hoặc tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: (accessToken: string) => void;
  onError?: (errorMessage: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: 'alex@pulsechat.io',
      password: 'Password123!',
      rememberMe: true,
    },
  });

  const quickFillAccount = (user: string, pass: string) => {
    loginForm.setValue('emailOrUsername', user, { shouldValidate: true });
    loginForm.setValue('password', pass, { shouldValidate: true });
    setLocalError(null);
  };

  const onSubmit = async (data: LoginFormData) => {
    setLocalError(null);
    setLoading(true);
    try {
      const res = await authApi.login(data.emailOrUsername, data.password);
      // Store only access token in localStorage. Refresh token is in HttpOnly cookie.
      localStorage.setItem('nomna_token', res.accessToken);
      onSuccess(res.accessToken);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản & mật khẩu!';
      setLocalError(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={loginForm.handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      {localError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium animate-in fade-in duration-150">
          {localError}
        </div>
      )}

      <Input
        label="Email hoặc Tên tài khoản"
        type="text"
        placeholder="alex@pulsechat.io hoặc alexrivers"
        {...loginForm.register('emailOrUsername')}
        error={loginForm.formState.errors.emailOrUsername?.message}
      />

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">Mật khẩu</label>
          <button
            type="button"
            onClick={() => setLocalError('Vui lòng kiểm tra hộp thư email để khôi phục mật khẩu tài khoản!')}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div>
        <Input
          type="password"
          placeholder="••••••••••••"
          showPasswordToggle
          {...loginForm.register('password')}
          error={loginForm.formState.errors.password?.message}
        />
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            {...loginForm.register('rememberMe')}
            className="w-4 h-4 rounded accent-[var(--accent-primary)] cursor-pointer"
          />
          <span>Ghi nhớ đăng nhập</span>
        </label>

        {/* Demo Account Quick Links */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span>Mẫu:</span>
          <button
            type="button"
            onClick={() => quickFillAccount('alex@pulsechat.io', 'Password123!')}
            className="hover:text-[var(--accent-primary)] font-semibold cursor-pointer underline underline-offset-2"
          >
            Alex
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => quickFillAccount('minh@pulsechat.io', 'Password123!')}
            className="hover:text-[var(--accent-primary)] font-semibold cursor-pointer underline underline-offset-2"
          >
            Minh
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        className="w-full mt-2"
        rightIcon={<ArrowRight size={17} />}
      >
        Đăng nhập
      </Button>
    </form>
  );
};
