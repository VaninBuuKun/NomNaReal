import { httpClient } from './httpClient';

export interface UploadFileResult {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

interface PresignedUploadResponse {
  supported: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  objectKey?: string;
  expiresAt?: string;
}

export const fileApi = {
  uploadFile: async (file: File, folder = 'uploads'): Promise<UploadFileResult> => {
    const contentType = file.type || 'application/octet-stream';

    // Try direct S3/R2 presigned PUT upload first to offload bandwidth from WebAPI
    try {
      const presignRes = await httpClient.post<PresignedUploadResponse>('/files/presigned-upload', {
        fileName: file.name,
        contentType,
        fileSize: file.size,
        folder,
      });

      if (presignRes.data.supported && presignRes.data.uploadUrl && presignRes.data.publicUrl) {
        const putRes = await fetch(presignRes.data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': contentType,
          },
        });

        if (putRes.ok) {
          return {
            url: presignRes.data.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            contentType,
          };
        }
      }
    } catch {
      // Fall back to standard multipart upload through WebAPI if presigned upload is unavailable
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await httpClient.post<UploadFileResult>(
      `/files/upload?folder=${encodeURIComponent(folder)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },
};
