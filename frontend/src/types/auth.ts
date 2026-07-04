// src/types/auth.ts

export interface User {
    id: string
    username: string
    email: string
    role: string
    is_verified: boolean
    created_at: string
}

export interface TokenResponse {
    access_token: string
    token_type: string
    expires_in: number
}

export interface RegisterResponse {
    user: User
    access_token: string
    token_type: string
}