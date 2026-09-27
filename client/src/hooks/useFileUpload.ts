import { useState } from 'react';
import { fileApi, type UploadFileResult } from '../services/fileApi';

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = async (file: File, folder = 'uploads'): Promise<UploadFileResult> => {
    // Validate 100MB max file size
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const err = 'Tệp tải lên không được vượt quá 100MB.';
      setUploadError(err);
      throw new Error(err);
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const result = await fileApi.uploadFile(file, folder);
      return result;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi tải lên tệp.';
      setUploadError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadError,
    uploadFile,
    clearError: () => setUploadError(null),
  };
}
