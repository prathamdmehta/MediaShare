// src/pages/LoginPage.tsx

import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await authApi.login({ email, password })
            localStorage.setItem('access_token', res.data.access_token)
            const meRes = await authApi.me()
            setAuth(meRes.data, res.data.access_token)
            navigate('/inbox')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#faf8ff',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden',
        }}>
            {/* Background blobs */}
            <div style={{
                position: 'fixed', top: 0, right: 0, zIndex: 0,
                width: '600px', height: '600px',
                background: 'rgba(180,197,255,0.3)',
                borderRadius: '50%',
                filter: 'blur(120px)',
                transform: 'translate(25%, -50%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, zIndex: 0,
                width: '500px', height: '500px',
                background: 'rgba(107,216,203,0.3)',
                borderRadius: '50%',
                filter: 'blur(100px)',
                transform: 'translate(-25%, 50%)',
                pointerEvents: 'none',
            }} />

            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '64px',
                position: 'relative',
                zIndex: 1,
            }}>
                <Link to="/" style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#004ccd',
                    textDecoration: 'none',
                    letterSpacing: '-0.3px',
                }}>
                    MediaShare
                </Link>
            </header>

            {/* Main */}
            <main style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                position: 'relative',
                zIndex: 1,
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'white',
                    borderRadius: '12px',
                    padding: '40px',
                    boxShadow: '0px 4px 20px rgba(15,23,42,0.05)',
                    border: '1px solid rgba(195,198,216,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 600,
                            color: '#131b2e',
                            letterSpacing: '-0.02em',
                            margin: '0 0 6px',
                        }}>
                            Welcome back
                        </h1>
                        <p style={{
                            fontSize: '15px',
                            color: '#424656',
                            margin: 0,
                        }}>
                            Access your secure media workspace
                        </p>
                    </div>

                    {/* Divider */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(195,198,216,0.4)' }} />
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#737687',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            sign in with email
                        </span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(195,198,216,0.4)' }} />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }}>
                        {/* Email */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#131b2e',
                            }}>
                                Work Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#737687',
                                    fontSize: '18px',
                                    pointerEvents: 'none',
                                }}>
                                    ✉
                                </span>
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px 11px 42px',
                                        background: '#faf8ff',
                                        border: '1px solid #c3c6d8',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        color: '#131b2e',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onFocus={e => {
                                        e.target.style.borderColor = '#004ccd'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0,76,205,0.1)'
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = '#c3c6d8'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <label style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#131b2e',
                                }}>
                                    Password
                                </label>
                                <a href="#" style={{
                                    fontSize: '13px',
                                    color: '#004ccd',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                }}>
                                    Forgot password?
                                </a>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute',
                                    left: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#737687',
                                    fontSize: '16px',
                                    pointerEvents: 'none',
                                }}>
                                    🔒
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '11px 44px 11px 42px',
                                        background: '#faf8ff',
                                        border: '1px solid #c3c6d8',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        color: '#131b2e',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onFocus={e => {
                                        e.target.style.borderColor = '#004ccd'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0,76,205,0.1)'
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = '#c3c6d8'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#737687',
                                        fontSize: '16px',
                                        padding: '2px',
                                    }}
                                >
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(186,26,26,0.06)',
                                border: '1px solid rgba(186,26,26,0.2)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#ba1a1a',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '13px',
                                background: loading ? '#b4c5ff' : '#004ccd',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 8px rgba(0,76,205,0.2)',
                                marginTop: '4px',
                            }}
                            onMouseEnter={e => {
                                if (!loading) e.currentTarget.style.background = '#0f62fe'
                            }}
                            onMouseLeave={e => {
                                if (!loading) e.currentTarget.style.background = '#004ccd'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span style={{
                                        width: '14px', height: '14px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        display: 'inline-block',
                                    }} />
                                    Signing in...
                                </>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Sign up link */}
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', color: '#424656', margin: 0 }}>
                            Don't have an account?{' '}
                            <Link to="/register" style={{
                                color: '#004ccd',
                                fontWeight: 700,
                                textDecoration: 'none',
                            }}>
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                padding: '24px 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
            }}>
                <p style={{ fontSize: '13px', color: '#737687', margin: 0 }}>
                    © 2026 MediaShare. All rights reserved.
                </p>
                <div style={{ display: 'flex', gap: '24px' }}>
                    {['Privacy Policy', 'Terms of Service', 'Contact'].map(link => (
                        <a key={link} href="#" style={{
                            fontSize: '13px',
                            color: '#737687',
                            textDecoration: 'none',
                        }}>
                            {link}
                        </a>
                    ))}
                </div>
            </footer>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}