// src/api/ai.ts

import apiClient from './client'

export interface VoiceCommandResponse {
    action: 'share' | 'unclear'
    matched_files: {
        id: string
        name: string
        type: string
        size_bytes: number
        created_at: string
    }[]
    recipient_username: string | null
    message: string | null
    confidence: number
    ai_response: string
}

export const aiApi = {
    processVoiceCommand: (transcript: string) =>
        apiClient.post<VoiceCommandResponse>('/ai/voice-command', { transcript }),
}