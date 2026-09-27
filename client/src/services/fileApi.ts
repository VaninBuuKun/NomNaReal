import { httpClient } from './httpClient';

export interface UploadFileResult {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export const fileApi = {
  uploadFile: async (file: File, folder = 'uploads'): Promise<UploadFileResult> => {
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
