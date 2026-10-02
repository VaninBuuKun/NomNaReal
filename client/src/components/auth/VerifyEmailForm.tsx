import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { EnvelopeSimple, ArrowRight, ArrowClockwise, CheckCircle } from '@phosphor-icons/react';
import { Button } from '../ui';
import { authApi } from '../../services/authApi';

interface VerifyEmailFormProps {
  onSuccess?: () => void;
}

export const VerifyEmailForm: React.FC<VerifyEmailFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (index: number, val: string) => {
    // Only accept alphanumeric or digits
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, '');
    if (!cleaned) {
      const nextOtp = [...otp];
      nextOtp[index] = '';
      setOtp(nextOtp);
      return;
    }

    // Handle pasting multiple digits (e.g. 123456)
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const nextOtp = [...otp];
      chars.forEach((c, i) => {
        if (i < 6) nextOtp[i] = c;
      });
      setOtp(nextOtp);
      const nextFocus = Math.min(chars.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = cleaned[cleaned.length - 1];
    setOtp(nextOtp);

    // Auto-focus next input
    if (index < 5 && cleaned) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join('').trim();
    if (code.length < 6) {
      setError('Vui lòng nhập đầy đủ 6 ký tự mã xác thực');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authApi.verifyEmail({ email, code });
      setIsSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.title ||
        'Mã xác thực không chính xác hoặc đã hết hạn. Vui lòng thử lại!';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await authApi.resendVerificationEmail(email);
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể gửi lại mã lúc này. Vui lòng thử lại!';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center gap-3.5 py-3 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/25 shadow-xs">
          <CheckCircle size={32} weight="duotone" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Xác thực tài khoản thành công!
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng bạn vào không gian làm việc NomNa...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-primary)] flex items-center justify-center mx-auto mb-2.5 border border-[var(--accent-primary)]/20 shadow-xs">
          <EnvelopeSimple size={26} weight="duotone" />
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
          Mã xác thực gồm 6 số đã được gửi đến email{' '}
          <strong className="text-[var(--text-primary)] font-semibold">{email || 'của bạn'}</strong>. Nhập mã để hoàn tất kích hoạt.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium text-center animate-in fade-in duration-150">
          {error}
        </div>
      )}

      {/* 6-box OTP Input */}
      <div className="flex items-center justify-center gap-2 py-1">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            autoFocus={idx === 0}
            className="w-11 h-12 text-center text-lg font-bold font-mono rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 outline-none transition-all shadow-2xs"
          />
        ))}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        disabled={otp.join('').length < 6}
        className="w-full mt-1"
        rightIcon={<ArrowRight size={17} />}
      >
        Xác nhận tài khoản
      </Button>

      {/* Resend button */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-color)]">
        <span className="text-[var(--text-muted)]">Chưa nhận được mã?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
        >
          <ArrowClockwise size={13} className={resending ? 'animate-spin' : ''} />
          <span>{countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại mã'}</span>
        </button>
      </div>

      <div className="text-center pt-1">
        <Link
          to="/"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:underline"
        >
          Bỏ qua và vào ứng dụng
        </Link>
      </div>
    </form>
  );
};
