// src/pages/AuthCallbackPage.tsx

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'

export default function AuthCallbackPage() {
    const navigate = useNavigate()
    const { setAuth } = useAuthStore()

    useEffect(() => {
        // Extract access_token from URL fragment (#access_token=...)
        const hash = window.location.hash
        const params = new URLSearchParams(hash.replace('#', ''))
        const token = params.get('access_token')

        if (!token) {
            navigate('/login?error=google_auth_failed')
            return
        }

        localStorage.setItem('access_token', token)

        authApi.me()
            .then(res => {
                setAuth(res.data, token)
                navigate('/inbox')
            })
            .catch(() => {
                localStorage.removeItem('access_token')
                navigate('/login?error=auth_failed')
            })
    }, [])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            background: '#faf8ff',
            fontFamily: 'Inter, sans-serif',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '48px', height: '48px',
                    border: '3px solid #eaedff',
                    borderTopColor: '#004ccd',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 16px',
                }} />
                <p style={{ fontSize: '15px', color: '#424656' }}>
                    Signing you in...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    )
}