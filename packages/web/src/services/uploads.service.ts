import api from './api';

export const uploadsService = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/properties/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
