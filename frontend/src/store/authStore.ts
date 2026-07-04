// src/store/authStore.ts

import { create } from 'zustand'
import type { User } from '../types/auth'

interface AuthState {
    user: User | null
    accessToken: string | null
    isAuthenticated: boolean

    setAuth: (user: User, token: string) => void
    clearAuth: () => void
    setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: localStorage.getItem('access_token'),
    isAuthenticated: !!localStorage.getItem('access_token'),

    setAuth: (user, token) => {
        localStorage.setItem('access_token', token)
        set({ user, accessToken: token, isAuthenticated: true })
    },

    clearAuth: () => {
        localStorage.removeItem('access_token')
        set({ user: null, accessToken: null, isAuthenticated: false })
    },

    setToken: (token) => {
        localStorage.setItem('access_token', token)
        set({ accessToken: token, isAuthenticated: true })
    },
}))

// Why Zustand over Redux? Redux requires actions, reducers, dispatch, selectors — a lot of boilerplate for what is essentially a global variable. Zustand is a store in ~10 lines. For a project this size it's the right tool.