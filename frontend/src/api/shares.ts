// src/api/shares.ts

import apiClient from './client'
import type {
    ClusterDetail, InboxItem,
    SentItem
} from '../types/shares'

interface InboxResponse {
    items: InboxItem[]
    next_cursor: string | null
    total_count: number
}

interface SentResponse {
    items: SentItem[]
    next_cursor: string | null
    total_count: number
}

export const sharesApi = {
    send: (data: {
        media_file_ids: string[]
        recipient_usernames: string[]
        message?: string
    }) => apiClient.post('/shares/send', data),

    inbox: (cursor?: string) =>
        apiClient.get<InboxResponse>('/shares/inbox', {
            params: cursor ? { cursor } : {},
        }),

    sent: (cursor?: string) =>
        apiClient.get<SentResponse>('/shares/sent', {
            params: cursor ? { cursor } : {},
        }),

    getCluster: (clusterId: string) =>
        apiClient.get<ClusterDetail>(`/shares/${clusterId}`),

    markRead: (shareRecipientId: string) =>
        apiClient.patch(`/shares/${shareRecipientId}/read`),

    deleteFromInbox: (shareRecipientId: string) =>
        apiClient.delete(`/shares/${shareRecipientId}`),
}