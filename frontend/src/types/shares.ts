// src/types/shares.ts

export interface InboxItem {
    share_recipient_id: string
    cluster_id: string
    sender_username: string
    sender_display_name: string | null
    share_type: 'media' | 'document'
    file_count: number
    total_size_bytes: number
    message: string | null
    is_read: boolean
    created_at: string
}

export interface ShareFile {
    id: string
    original_name: string
    file_type: string
    mime_type: string
    size_bytes: number
    position: number
    download_url: string
    thumbnail_url: string | null
    duration_secs: number | null
}

export interface ClusterDetail {
    cluster_id: string
    sender_username: string
    share_type: string
    message: string | null
    file_count: number
    total_size_bytes: number
    files: ShareFile[]
    is_partially_unavailable: boolean
    created_at: string
}

export interface SentItem {
    cluster_id: string
    share_type: string
    file_count: number
    total_size_bytes: number
    message: string | null
    recipient_count: number
    created_at: string
}