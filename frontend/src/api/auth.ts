// src/api/auth.ts

import apiClient from './client'
import type { RegisterResponse, TokenResponse, User } from '../types/auth'

export const authApi = {
    register: (data: {
        username: string
        email: string
        password: string
    }) => apiClient.post<RegisterResponse>('/auth/register', data),

    login: (data: {
        email: string
        password: string
    }) => apiClient.post<TokenResponse>('/auth/login', data),

    logout: () => apiClient.post('/auth/logout'),

    me: () => apiClient.get<User>('/auth/me'),

    refresh: () => apiClient.post<TokenResponse>('/auth/refresh'),
}