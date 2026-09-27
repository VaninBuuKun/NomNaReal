import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Button, Input } from '../ui';
import { authApi } from '../../services/authApi';

const registerSchema = z.object({
  displayName: z.string().min(2, 'Họ và tên hiển thị tối thiểu 2 ký tự'),
  username: z
    .string()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số, dấu chấm hoặc gạch nối'),
  email: z.string().email('Địa chỉ email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess: (user?: any) => void;
  onError?: (errorMessage: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLocalError(null);
    setLoading(true);
    try {
      const user = await authApi.register(data.email, data.username, data.displayName, data.password);
      localStorage.setItem('nomna_logged_in', 'true');
      onSuccess(user);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        'Đăng ký không thành công. Tên đăng nhập hoặc email có thể đã tồn tại.';
      setLocalError(msg);
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={registerForm.handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      {localError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium animate-in fade-in duration-150">
          {localError}
        </div>
      )}

      <Input
        label="Họ và tên hiển thị"
        type="text"
        placeholder="Nguyễn Văn A"
        {...registerForm.register('displayName')}
        error={registerForm.formState.errors.displayName?.message}
      />

      <Input
        label="Tên đăng nhập (Username)"
        type="text"
        placeholder="alexrivers"
        {...registerForm.register('username')}
        error={registerForm.formState.errors.username?.message}
      />

      <Input
        label="Địa chỉ Email"
        type="email"
        placeholder="alex@pulsechat.io"
        {...registerForm.register('email')}
        error={registerForm.formState.errors.email?.message}
      />

      <Input
        label="Mật khẩu"
        type="password"
        placeholder="Tối thiểu 6 ký tự"
        showPasswordToggle
        {...registerForm.register('password')}
        error={registerForm.formState.errors.password?.message}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        className="w-full mt-2"
        rightIcon={<ArrowRight size={17} />}
      >
        Tạo tài khoản ngay
      </Button>
    </form>
  );
};
