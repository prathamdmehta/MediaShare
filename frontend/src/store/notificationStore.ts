// src/store/notificationStore.ts

import { create } from 'zustand'

interface NotificationState {
    unreadCount: number
    increment: () => void
    reset: () => void
    setCount: (n: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    increment: () => set(state => ({ unreadCount: state.unreadCount + 1 })),
    reset: () => set({ unreadCount: 0 }),
    setCount: (n) => set({ unreadCount: n }),
}))