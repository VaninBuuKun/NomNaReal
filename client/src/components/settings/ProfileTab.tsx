import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera, Check, Trash } from "lucide-react";
import { Button, Input, ImageWithSkeleton } from "../ui";
import { authApi } from "../../services/authApi";
import { fileApi } from "../../services/fileApi";
import { getMediaUrl, DEFAULT_AVATAR } from "../../utils/constants";
import type { User } from "../../types";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Tên hiển thị phải có ít nhất 2 ký tự")
    .max(50, "Tên hiển thị tối đa 50 ký tự"),
  bio: z.string().max(500, "Tiểu sử tối đa 500 ký tự").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileTabProps {
  currentUser: User | null;
  onUserUpdated?: (user: User) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  onUserUpdated,
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatarUrl || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: currentUser?.displayName || "",
      bio: currentUser?.bio || "",
    },
  });

  // Reset form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      reset({
        displayName: currentUser.displayName,
        bio: currentUser.bio || "",
      });
      setAvatarUrl(currentUser.avatarUrl || "");
      setPreviewUrl(null);
      setIsSavedSuccess(false);
      setErrorMessage(null);
    }
  }, [currentUser, reset]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui lòng chọn tệp hình ảnh hợp lệ (.jpg, .png, .webp).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Dung lượng ảnh tối đa là 10MB.");
      return;
    }

    // Instant local preview for zero-delay UX
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setErrorMessage(null);

    try {
      setIsUploading(true);
      const res = await fileApi.uploadFile(file, "avatars");
      setAvatarUrl(res.url);
    } catch (err: unknown) {
      setPreviewUrl(null);
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMessage(errorObj?.response?.data?.message || "Không thể tải ảnh đại diện lên.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    setAvatarUrl("");
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setErrorMessage(null);
      setIsSavedSuccess(false);

      const updated = await authApi.updateProfile({
        displayName: values.displayName.trim(),
        avatarUrl: avatarUrl ? avatarUrl.trim() : "",
        bio: values.bio?.trim() || "",
      });

      if (onUserUpdated) {
        onUserUpdated(updated);
      }

      setIsSavedSuccess(true);
      setTimeout(() => {
        setIsSavedSuccess(false);
      }, 3000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setErrorMessage(errorObj?.response?.data?.message || "Không thể lưu cài đặt hồ sơ.");
    }
  };

  const currentDisplayAvatar = previewUrl || (avatarUrl ? getMediaUrl(avatarUrl) : DEFAULT_AVATAR);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errorMessage && (
        <div className="p-3 text-xs rounded-[4px] bg-rose-500/10 border border-rose-500/25 text-rose-500 font-medium">
          {errorMessage}
        </div>
      )}

      {isSavedSuccess && (
        <div className="p-3 text-xs rounded-[4px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-semibold flex items-center gap-2">
          <Check size={16} />
          <span>Đã lưu thay đổi hồ sơ cá nhân thành công!</span>
        </div>
      )}

      {/* 1. Avatar Card */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 flex flex-col gap-4">
        <h3 className="font-bold text-sm text-[var(--text-primary)]">
          Ảnh đại diện
        </h3>

        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--border-color)] bg-[var(--bg-chat)] shrink-0 shadow-sm flex items-center justify-center">
            <ImageWithSkeleton
              src={currentDisplayAvatar}
              alt={currentUser?.displayName || "Avatar"}
              fallbackSrc={DEFAULT_AVATAR}
              containerClassName="w-full h-full"
              className="w-full h-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                Đang tải...
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Camera size={14} />}
              >
                {isUploading ? "Đang tải lên..." : "Tải ảnh mới lên"}
              </Button>

              {avatarUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                  className="text-red-500 hover:bg-red-500/10 border-red-500/30"
                  leftIcon={<Trash size={14} />}
                >
                  Xóa ảnh
                </Button>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Định dạng PNG, JPG, GIF hoặc WebP. Dung lượng tối đa 10MB.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Personal Information */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[4px] p-5 space-y-4">
        <h3 className="font-bold text-sm text-[var(--text-primary)]">
          Thông tin hiển thị
        </h3>

        <div className="space-y-1.5">
          <Input
            label="Tên hiển thị"
            {...register("displayName")}
            error={errors.displayName?.message}
            placeholder="vd: Alex Rivers"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Tên người dùng (Username)
          </label>
          <div className="relative">
            <input
              type="text"
              disabled
              value={`@${currentUser?.username || "user"}`}
              className="w-full rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-chat)]/60 px-3.5 py-2.5 text-xs text-[var(--text-muted)] opacity-80 cursor-not-allowed"
            />
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            Tên người dùng là định danh duy nhất của bạn và không thể thay đổi lúc này.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Tiểu sử ngắn (Bio)
          </label>
          <textarea
            rows={3}
            {...register("bio")}
            placeholder="Giới thiệu đôi nét về bản thân hoặc chức danh của bạn..."
            className="w-full rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-chat)] p-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] resize-none transition-all placeholder:text-[var(--text-muted)]"
          />
          {errors.bio && (
            <p className="text-xs text-rose-500 font-medium">{errors.bio.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Địa chỉ Email
          </label>
          <input
            type="email"
            disabled
            value={currentUser?.email || ""}
            className="w-full rounded-[4px] border border-[var(--border-color)] bg-[var(--bg-chat)]/60 px-3.5 py-2.5 text-xs text-[var(--text-muted)] opacity-80 cursor-not-allowed"
          />
        </div>
      </section>

      {/* Action Buttons: Hủy bỏ & Lưu thay đổi */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => {
            reset({
              displayName: currentUser?.displayName || "",
              bio: currentUser?.bio || "",
            });
            setAvatarUrl(currentUser?.avatarUrl || "");
            setPreviewUrl(null);
            setErrorMessage(null);
          }}
          disabled={isSubmitting || (!isDirty && avatarUrl === (currentUser?.avatarUrl || ""))}
        >
          Hủy bỏ
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={isSubmitting || (!isDirty && avatarUrl === (currentUser?.avatarUrl || ""))}
        >
          {isSavedSuccess ? "Đã lưu thành công!" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
};
