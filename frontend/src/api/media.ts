// src/api/media.ts

import apiClient from './client'
import type { MediaFile, InitiateUploadResponse } from '../types/media'

export const mediaApi = {
    initiate: (data: {
        filename: string
        mime_type: string
        size_bytes: number
    }) => apiClient.post<InitiateUploadResponse>('/media/initiate', data),

    confirm: (data: {
        upload_id: string
        s3_key: string
    }) => apiClient.post<MediaFile>('/media/confirm', data),

    list: () => apiClient.get<MediaFile[]>('/media/'),

    get: (id: string) => apiClient.get<MediaFile>(`/media/${id}`),

    delete: (id: string) => apiClient.delete(`/media/${id}`),
}