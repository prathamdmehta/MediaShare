// src/api/users.ts

import apiClient from './client'
import type { Profile, PublicProfile, SearchResult } from '../types/profile'

interface SearchResponse {
    results: SearchResult[]
    next_cursor: string | null
    total_count: number
}

export const usersApi = {
    getMyProfile: () => apiClient.get<Profile>('/users/me/profile'),

    updateProfile: (data: {
        display_name?: string
        bio?: string
        is_private?: boolean
    }) => apiClient.patch<Profile>('/users/me/profile', data),

    getPublicProfile: (username: string) =>
        apiClient.get<PublicProfile>(`/users/${username}`),

    search: (query: string, cursor?: string) =>
        apiClient.get<SearchResponse>('/search/users', {
            params: { q: query, ...(cursor ? { cursor } : {}) },
        }),

    block: (username: string) =>
        apiClient.post(`/users/${username}/block`),

    unblock: (username: string) =>
        apiClient.delete(`/users/${username}/block`),

    // src/api/users.ts — add this method
    getBlockedUsers: () =>
        apiClient.get<{ username: string; display_name: string | null; avatar_url: string | null }[]>('/users/me/blocked'),

    uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<{ avatar_url: string; s3_key: string }>(
        '/users/me/avatar',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    )},
}