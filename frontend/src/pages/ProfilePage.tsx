// src/pages/ProfilePage.tsx

import { useState, useEffect, useRef } from 'react'
import { usersApi } from '../api/users'
import { useAuthStore } from '../store/authStore'
import type { Profile } from '../types/profile'

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function ProfilePage() {
    const { user } = useAuthStore()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [avatarHover, setAvatarHover] = useState(false)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    const [form, setForm] = useState({ display_name: '', bio: '' })
    const [blockedUsers, setBlockedUsers] = useState<{ username: string }[]>([])
    const [loadingBlocked, setLoadingBlocked] = useState(true)

    useEffect(() => {
        usersApi.getMyProfile()
            .then(res => {
                setProfile(res.data)
                setAvatarUrl(res.data.avatar_url)
                setForm({
                    display_name: res.data.display_name || '',
                    bio: res.data.bio || '',
                })
            })
            .catch(console.error)
            .finally(() => setLoading(false))

        usersApi.getBlockedUsers()
            .then(res => setBlockedUsers(res.data))
            .catch(console.error)
            .finally(() => setLoadingBlocked(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await usersApi.updateProfile({
                display_name: form.display_name || undefined,
                bio: form.bio || undefined,
            })
            setProfile(res.data)
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) { console.error(err) }
        finally { setSaving(false) }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploadingAvatar(true)
        try {
            // Preview immediately
            const objectUrl = URL.createObjectURL(file)
            setAvatarUrl(objectUrl)
            // Upload to backend
            const res = await usersApi.uploadAvatar(file)
            setAvatarUrl(res.data.avatar_url)
        } catch (err) {
            console.error(err)
            setAvatarUrl(profile?.avatar_url || null)
        } finally {
            setUploadingAvatar(false)
        }
    }

    const handleUnblock = async (username: string) => {
        try {
            await usersApi.unblock(username)
            setBlockedUsers(prev => prev.filter(u => u.username !== username))
        } catch (err) { console.error(err) }
    }

    const initials = user?.username?.slice(0, 2).toUpperCase() || 'MS'
    const quotaPercent = profile
        ? Math.round((profile.storage_used_bytes / profile.storage_quota_bytes) * 100)
        : 0
    const quotaColor = quotaPercent > 80 ? '#ba1a1a'
        : quotaPercent > 60 ? '#9e3100' : '#004ccd'

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        background: 'white',
        border: '1px solid #c3c6d8',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#131b2e',
        outline: 'none',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
    }

    if (loading) {
        return (
            <div style={{ padding: '32px' }}>
                <div style={{
                    maxWidth: '720px',
                    height: '300px',
                    borderRadius: '12px',
                    background: '#f2f3ff',
                    border: '1px solid rgba(195,198,216,0.3)',
                }} />
            </div>
        )
    }

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#faf8ff',
            minHeight: '100vh',
            padding: '32px',
            color: '#131b2e',
        }}>
            <div style={{ maxWidth: '720px' }}>
                {/* Page header */}
                <div style={{ marginBottom: '28px' }}>
                    <h2 style={{
                        fontSize: '28px', fontWeight: 600,
                        color: '#131b2e', margin: '0 0 4px',
                        letterSpacing: '-0.02em',
                    }}>
                        Profile
                    </h2>
                    <p style={{ fontSize: '14px', color: '#424656', margin: 0 }}>
                        Your account information
                    </p>
                </div>

                {/* ── Profile Card ──────────────────────────────── */}
                <section style={{
                    background: '#f2f3ff',
                    borderRadius: '16px',
                    padding: '28px',
                    border: '1px solid rgba(195,198,216,0.3)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    marginBottom: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Avatar + info row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '20px',
                        marginBottom: '24px',
                        paddingBottom: '24px',
                        borderBottom: '1px solid rgba(195,198,216,0.3)',
                    }}>
                        {/* Avatar with upload */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div
                                onClick={() => avatarInputRef.current?.click()}
                                onMouseEnter={() => setAvatarHover(true)}
                                onMouseLeave={() => setAvatarHover(false)}
                                style={{
                                    width: '88px', height: '88px',
                                    borderRadius: '50%',
                                    background: avatarUrl
                                        ? 'transparent'
                                        : 'linear-gradient(135deg, #004ccd 0%, #006a61 100%)',
                                    border: '4px solid white',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        style={{
                                            width: '100%', height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ) : (
                                    <span style={{
                                        fontSize: '26px', fontWeight: 700,
                                        color: 'white',
                                    }}>
                                        {initials}
                                    </span>
                                )}

                                {/* Hover overlay */}
                                {(avatarHover || uploadingAvatar) && (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.45)',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column',
                                        gap: '4px',
                                    }}>
                                        {uploadingAvatar ? (
                                            <span style={{
                                                width: '20px', height: '20px',
                                                border: '2px solid rgba(255,255,255,0.4)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                                display: 'inline-block',
                                            }} />
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '18px' }}>📷</span>
                                                <span style={{
                                                    fontSize: '10px', color: 'white',
                                                    fontWeight: 600,
                                                }}>
                                                    Change
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                style={{ display: 'none' }}
                                onChange={handleAvatarUpload}
                            />
                        </div>

                        {/* User info */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                fontSize: '20px', fontWeight: 600,
                                color: '#131b2e', margin: '0 0 4px',
                            }}>
                                {user?.username}
                            </h3>
                            <p style={{
                                fontSize: '14px', color: '#424656',
                                margin: '0 0 10px',
                            }}>
                                {user?.email}
                            </p>
                            <span style={{
                                display: 'inline-block',
                                padding: '3px 12px',
                                background: 'rgba(15,98,254,0.12)',
                                color: '#004ccd',
                                border: '1px solid rgba(0,76,205,0.2)',
                                borderRadius: '999px',
                                fontSize: '12px', fontWeight: 600,
                            }}>
                                {user?.role}
                            </span>
                        </div>
                    </div>

                    {/* Display name + bio */}
                    {editing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{
                                    fontSize: '11px', fontWeight: 700,
                                    color: '#424656', textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}>
                                    Display name
                                </label>
                                <input
                                    style={inputStyle}
                                    placeholder="Your name"
                                    value={form.display_name}
                                    onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                                    maxLength={60}
                                    onFocus={e => {
                                        e.target.style.borderColor = '#004ccd'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0,76,205,0.08)'
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = '#c3c6d8'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{
                                    fontSize: '11px', fontWeight: 700,
                                    color: '#424656', textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                }}>
                                    Bio
                                </label>
                                <textarea
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    placeholder="Tell people about yourself"
                                    value={form.bio}
                                    onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                                    maxLength={500}
                                    rows={3}
                                    onFocus={e => {
                                        e.target.style.borderColor = '#004ccd'
                                        e.target.style.boxShadow = '0 0 0 4px rgba(0,76,205,0.08)'
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = '#c3c6d8'
                                        e.target.style.boxShadow = 'none'
                                    }}
                                />
                                <p style={{
                                    fontSize: '11px', color: '#737687',
                                    textAlign: 'right', margin: 0,
                                }}>
                                    {form.bio.length}/500
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{
                                        padding: '10px 20px',
                                        background: saving ? '#b4c5ff' : '#004ccd',
                                        color: 'white', border: 'none',
                                        borderRadius: '10px', fontSize: '13px',
                                        fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,76,205,0.2)',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {saving ? 'Saving...' : 'Save changes'}
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'white',
                                        color: '#131b2e',
                                        border: '1px solid #c3c6d8',
                                        borderRadius: '10px', fontSize: '13px',
                                        fontWeight: 500, cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '16px',
                                marginBottom: '20px',
                            }}>
                                <div>
                                    <p style={{
                                        fontSize: '10px', fontWeight: 700,
                                        color: '#424656', textTransform: 'uppercase',
                                        letterSpacing: '0.06em', margin: '0 0 4px',
                                    }}>
                                        Display name
                                    </p>
                                    <p style={{
                                        fontSize: '15px',
                                        color: profile?.display_name ? '#131b2e' : '#737687',
                                        margin: 0,
                                        fontStyle: profile?.display_name ? 'normal' : 'italic',
                                    }}>
                                        {profile?.display_name || 'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p style={{
                                        fontSize: '10px', fontWeight: 700,
                                        color: '#424656', textTransform: 'uppercase',
                                        letterSpacing: '0.06em', margin: '0 0 4px',
                                    }}>
                                        Bio
                                    </p>
                                    <p style={{
                                        fontSize: '15px',
                                        color: profile?.bio ? '#131b2e' : '#737687',
                                        margin: 0, lineHeight: 1.5,
                                        fontStyle: profile?.bio ? 'normal' : 'italic',
                                    }}>
                                        {profile?.bio || 'Not set'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditing(true)}
                                style={{
                                    padding: '10px 20px',
                                    background: '#004ccd',
                                    color: 'white', border: 'none',
                                    borderRadius: '10px', fontSize: '13px',
                                    fontWeight: 600, cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,76,205,0.2)',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#0f62fe'}
                                onMouseLeave={e => e.currentTarget.style.background = '#004ccd'}
                            >
                                Edit profile
                            </button>
                        </div>
                    )}
                </section>

                {/* ── Storage Card ──────────────────────────────── */}
                <section style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    border: '1px solid rgba(195,198,216,0.3)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    marginBottom: '16px',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                    }}>
                        <h4 style={{
                            fontSize: '16px', fontWeight: 600,
                            color: '#131b2e', margin: 0,
                        }}>
                            Storage
                        </h4>
                        <p style={{ fontSize: '13px', color: '#424656', margin: 0 }}>
                            {formatBytes(profile?.storage_used_bytes || 0)} of{' '}
                            {formatBytes(profile?.storage_quota_bytes || 0)}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        height: '8px', background: '#eaedff',
                        borderRadius: '4px', overflow: 'hidden',
                        marginBottom: '8px',
                    }}>
                        <div style={{
                            height: '100%',
                            background: quotaColor,
                            width: `${quotaPercent}%`,
                            borderRadius: '4px',
                            transition: 'width 0.8s ease',
                        }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#737687', margin: '0 0 14px' }}>
                        {quotaPercent}% used
                    </p>
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        color: '#004ccd', background: 'transparent',
                        border: 'none', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', padding: 0,
                    }}>
                        ＋ Upgrade Storage
                    </button>
                </section>

                {/* ── Blocked Users Card ────────────────────────── */}
                <section style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    border: '1px solid rgba(195,198,216,0.3)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                    <h4 style={{
                        fontSize: '16px', fontWeight: 600,
                        color: '#131b2e', margin: '0 0 16px',
                    }}>
                        Blocked users
                    </h4>

                    {loadingBlocked ? (
                        <p style={{ fontSize: '13px', color: '#737687' }}>Loading...</p>
                    ) : blockedUsers.length === 0 ? (
                        <p style={{
                            fontSize: '14px', color: 'rgba(115,118,135,0.7)',
                            margin: 0,
                        }}>
                            You haven't blocked anyone.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {blockedUsers.map((u, i) => (
                                <div key={u.username} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 0',
                                    borderBottom: i < blockedUsers.length - 1
                                        ? '1px solid rgba(195,198,216,0.2)' : 'none',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '32px', height: '32px',
                                            borderRadius: '50%',
                                            background: '#eaedff',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px', fontWeight: 600,
                                            color: '#424656',
                                        }}>
                                            {u.username.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span style={{
                                            fontSize: '14px', fontWeight: 500,
                                            color: '#131b2e',
                                        }}>
                                            {u.username}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleUnblock(u.username)}
                                        style={{
                                            padding: '5px 14px',
                                            background: 'transparent',
                                            border: '1px solid rgba(186,26,26,0.3)',
                                            borderRadius: '8px',
                                            color: '#ba1a1a', fontSize: '12px',
                                            fontWeight: 500, cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,0.06)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Unblock
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Saved toast */}
            {saved && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    padding: '12px 20px',
                    background: 'rgba(0,106,97,0.1)',
                    border: '1px solid rgba(0,106,97,0.3)',
                    borderRadius: '10px',
                    color: '#006a61', fontSize: '13px', fontWeight: 500,
                }}>
                    ✓ Profile saved
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}