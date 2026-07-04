// src/types/media.ts

export interface MediaFile {
    id: string
    original_name: string
    mime_type: string
    file_type: 'image' | 'video' | 'pdf' | 'document'
    size_bytes: number
    processing_status: 'pending' | 'ready' | 'rejected' | 'failed'
    rejection_reason: string | null
    download_url: string | null
    thumbnail_url: string | null
    duration_secs: number | null
    created_at: string
}

export interface InitiateUploadResponse {
    upload_id: string
    presigned_url: string
    s3_key: string
    expires_in: number
}