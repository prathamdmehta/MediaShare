// src/types/profile.ts

export interface Profile {
    id: string
    user_id: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    storage_used_bytes: number
    storage_quota_bytes: number
    is_private: boolean
    created_at: string
    updated_at: string
}

export interface PublicProfile {
    username: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    is_private: boolean
}

export interface SearchResult {
    username: string
    display_name: string | null
    avatar_url: string | null
}