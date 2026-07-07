// src/pages/SearchPage.tsx

import { useState, useEffect } from 'react'
import { usersApi } from '../api/users'
import { mediaApi } from '../api/media'
import { sharesApi } from '../api/shares'
import type { SearchResult } from '../types/profile'
import type { MediaFile } from '../types/media'

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ── Send Modal ─────────────────────────────────────────────────────

function SendModal({
    recipient,
    onClose,
    onBlock,
}: {
    recipient: SearchResult
    onClose: () => void
    onBlock: () => void
}) {
    const [files, setFiles] = useState<MediaFile[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        mediaApi.list()
            .then(res => setFiles(res.data.filter(f => f.processing_status === 'ready')))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const toggleFile = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else if (next.size < 20) next.add(id)
            return next
        })
    }

    const handleSend = async () => {
        if (selectedIds.size === 0) return
        setSending(true); setError('')
        try {
            await sharesApi.send({
                media_file_ids: Array.from(selectedIds),
                recipient_usernames: [recipient.username],
                message: message.trim() || undefined,
            })
            setSent(true)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to send')
        } finally { setSending(false) }
    }

    const handleBlockFromModal = async () => {
        try { await usersApi.block(recipient.username); onBlock(); onClose() }
        catch (err) { console.error(err) }
    }

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(10,10,15,0.5)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 50,
                }}
            />
            <div style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'white',
                borderRadius: '16px',
                width: '540px',
                maxHeight: '85vh',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
                zIndex: 51,
                border: '1px solid rgba(195,198,216,0.3)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(195,198,216,0.2)',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '38px', height: '38px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #004ccd, #006a61)',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px', fontWeight: 700, color: 'white',
                        }}>
                            {recipient.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#131b2e', margin: 0 }}>
                                Send to {recipient.username}
                            </p>
                            {recipient.display_name && (
                                <p style={{ fontSize: '12px', color: '#737687', margin: 0 }}>
                                    {recipient.display_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={handleBlockFromModal}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid rgba(186,26,26,0.3)',
                                background: 'transparent',
                                borderRadius: '8px',
                                color: '#ba1a1a', fontSize: '12px',
                                fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            Block
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                width: '30px', height: '30px',
                                border: '1px solid #c3c6d8',
                                borderRadius: '8px', background: 'white',
                                color: '#737687', cursor: 'pointer', fontSize: '18px',
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {sent ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <div style={{
                            width: '60px', height: '60px',
                            background: '#006a61', borderRadius: '50%',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 16px',
                            fontSize: '28px', color: 'white',
                        }}>
                            ✓
                        </div>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#131b2e', margin: '0 0 6px' }}>
                            Sent successfully
                        </p>
                        <p style={{ fontSize: '13px', color: '#737687', margin: '0 0 24px' }}>
                            {selectedIds.size} file{selectedIds.size > 1 ? 's' : ''} sent to {recipient.username}
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                background: '#f2f3ff', color: '#004ccd',
                                border: '1px solid rgba(195,198,216,0.4)',
                                borderRadius: '10px', fontSize: '13px',
                                fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#737687', fontSize: '13px' }}>
                                    Loading your files...
                                </div>
                            ) : files.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#737687', fontSize: '13px' }}>
                                    No ready files.{' '}
                                    <a href="/upload" style={{ color: '#004ccd' }}>Upload some first</a>
                                </div>
                            ) : files.map(file => {
                                const selected = selectedIds.has(file.id)
                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => toggleFile(file.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px 24px',
                                            borderBottom: '1px solid rgba(195,198,216,0.15)',
                                            cursor: 'pointer',
                                            background: selected ? 'rgba(0,76,205,0.04)' : 'white',
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={e => !selected && (e.currentTarget.style.background = '#faf8ff')}
                                        onMouseLeave={e => !selected && (e.currentTarget.style.background = 'white')}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px',
                                            borderRadius: '5px',
                                            border: `2px solid ${selected ? '#004ccd' : '#c3c6d8'}`,
                                            background: selected ? '#004ccd' : 'transparent',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', flexShrink: 0,
                                            transition: 'all 0.15s ease',
                                        }}>
                                            {selected && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                                        </div>
                                        <div style={{
                                            width: '38px', height: '38px',
                                            borderRadius: '8px', background: '#f2f3ff',
                                            border: '1px solid rgba(195,198,216,0.3)',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', flexShrink: 0,
                                            overflow: 'hidden',
                                        }}>
                                            {file.thumbnail_url ? (
                                                <img src={file.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '16px' }}>
                                                    {file.file_type === 'image' ? '🖼️' : file.file_type === 'video' ? '🎬' : '📄'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontSize: '13px', fontWeight: 500, color: '#131b2e',
                                                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {file.original_name}
                                            </p>
                                            <p style={{ fontSize: '11px', color: '#737687', margin: '2px 0 0' }}>
                                                {formatBytes(file.size_bytes)} · {file.file_type}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(195,198,216,0.2)',
                            display: 'flex', flexDirection: 'column', gap: '12px',
                        }}>
                            <input
                                placeholder="Add a private note (optional)"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                maxLength={500}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    background: '#faf8ff',
                                    border: '1px solid #c3c6d8',
                                    borderRadius: '10px', fontSize: '13px',
                                    color: '#131b2e', outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={e => {
                                    e.target.style.borderColor = '#004ccd'
                                    e.target.style.boxShadow = '0 0 0 4px rgba(0,76,205,0.08)'
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = '#c3c6d8'
                                    e.target.style.boxShadow = 'none'
                                }}
                            />
                            {error && <p style={{ fontSize: '12px', color: '#ba1a1a', margin: 0 }}>{error}</p>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#737687' }}>
                                    {selectedIds.size} of 20 selected
                                </span>
                                <button
                                    onClick={handleSend}
                                    disabled={selectedIds.size === 0 || sending}
                                    style={{
                                        padding: '10px 24px',
                                        background: selectedIds.size === 0 || sending ? '#b4c5ff' : '#004ccd',
                                        color: 'white', border: 'none',
                                        borderRadius: '10px', fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: selectedIds.size === 0 || sending ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        boxShadow: '0 2px 8px rgba(0,76,205,0.15)',
                                    }}
                                >
                                    {sending ? (
                                        <>
                                            <span style={{
                                                width: '12px', height: '12px',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                                display: 'inline-block',
                                            }} />
                                            Sending...
                                        </>
                                    ) : '🔒 Send Securely'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

// ── Main Search Page ───────────────────────────────────────────────

export default function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
    const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())

    useEffect(() => {
        usersApi.getBlockedUsers()
            .then(res => setBlockedUsers(new Set(res.data.map((u: any) => u.username))))
            .catch(console.error)
    }, [])

    useEffect(() => {
        if (!query.trim()) { setResults([]); setHasSearched(false); return }
        const timer = setTimeout(async () => {
            setSearching(true); setHasSearched(true)
            try {
                const res = await usersApi.search(query.trim())
                setResults(res.data.results)
            } catch { }
            finally { setSearching(false) }
        }, 400)
        return () => clearTimeout(timer)
    }, [query])

    const handleBlock = async (e: React.MouseEvent, username: string) => {
        e.stopPropagation()
        try {
            if (blockedUsers.has(username)) {
                await usersApi.unblock(username)
                setBlockedUsers(prev => { const n = new Set(prev); n.delete(username); return n })
            } else {
                await usersApi.block(username)
                setBlockedUsers(prev => new Set([...prev, username]))
                setResults(prev => prev.filter(u => u.username !== username))
            }
        } catch { }
    }

    const handleBlockFromModal = (username: string) => {
        setBlockedUsers(prev => new Set([...prev, username]))
        setResults(prev => prev.filter(u => u.username !== username))
        setSelectedUser(null)
    }

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#faf8ff',
            minHeight: '100vh',
            padding: '32px',
            color: '#131b2e',
        }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{
                        fontSize: '28px', fontWeight: 600,
                        color: '#131b2e', margin: '0 0 4px',
                        letterSpacing: '-0.02em',
                    }}>
                        Find People
                    </h1>
                    <p style={{ fontSize: '14px', color: '#424656', margin: 0 }}>
                        Search by username to send files securely
                    </p>
                </div>

                {/* Search bar */}
                <div style={{ position: 'relative', marginBottom: '28px' }}>
                    <span style={{
                        position: 'absolute', left: '16px', top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#737687', pointerEvents: 'none', fontSize: '18px',
                    }}>
                        {searching ? (
                            <span style={{
                                display: 'inline-block',
                                width: '16px', height: '16px',
                                border: '2px solid #c3c6d8',
                                borderTopColor: '#004ccd',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                        ) : '🔍'}
                    </span>
                    <input
                        autoFocus
                        placeholder="Search username..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '16px 16px 16px 52px',
                            background: 'white',
                            border: '1px solid #c3c6d8',
                            borderRadius: '14px',
                            fontSize: '16px', color: '#131b2e',
                            outline: 'none', boxSizing: 'border-box',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            transition: 'all 0.2s ease',
                        }}
                        onFocus={e => {
                            e.target.style.borderColor = '#004ccd'
                            e.target.style.boxShadow = '0 0 0 4px rgba(0,76,205,0.1)'
                        }}
                        onBlur={e => {
                            e.target.style.borderColor = '#c3c6d8'
                            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                        }}
                    />
                </div>

                {/* Results */}
                {!hasSearched ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        background: 'white', borderRadius: '16px',
                        border: '1px solid rgba(195,198,216,0.3)',
                    }}>
                        <div style={{
                            width: '64px', height: '64px',
                            background: '#f2f3ff', borderRadius: '50%',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', margin: '0 auto 16px',
                            fontSize: '28px',
                        }}>
                            👥
                        </div>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#131b2e', margin: '0 0 6px' }}>
                            Find your contacts
                        </p>
                        <p style={{ fontSize: '14px', color: '#737687', margin: 0 }}>
                            Type a username to search
                        </p>
                    </div>
                ) : results.length === 0 && !searching ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        background: 'white', borderRadius: '16px',
                        border: '1px solid rgba(195,198,216,0.3)',
                    }}>
                        <p style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</p>
                        <p style={{ fontSize: '15px', fontWeight: 500, color: '#131b2e', margin: '0 0 4px' }}>
                            No users found
                        </p>
                        <p style={{ fontSize: '13px', color: '#737687', margin: 0 }}>
                            No results for "{query}"
                        </p>
                    </div>
                ) : (
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid rgba(195,198,216,0.3)',
                        overflow: 'hidden',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                        {results.map((user, i) => {
                            const isBlocked = blockedUsers.has(user.username)
                            return (
                                <div
                                    key={user.username}
                                    style={{
                                        display: 'flex', alignItems: 'center',
                                        gap: '14px', padding: '16px 20px',
                                        borderBottom: i < results.length - 1
                                            ? '1px solid rgba(195,198,216,0.15)' : 'none',
                                        background: isBlocked ? 'rgba(186,26,26,0.02)' : 'white',
                                        opacity: isBlocked ? 0.8 : 1,
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={e => {
                                        if (!isBlocked) e.currentTarget.style.background = '#faf8ff'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = isBlocked
                                            ? 'rgba(186,26,26,0.02)' : 'white'
                                    }}
                                >
                                    {/* Avatar */}
                                    <div style={{
                                        width: '48px', height: '48px',
                                        borderRadius: '50%',
                                        background: isBlocked
                                            ? 'rgba(186,26,26,0.08)'
                                            : 'linear-gradient(135deg, #004ccd, #006a61)',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px', fontWeight: 700,
                                        color: isBlocked ? '#ba1a1a' : 'white',
                                        flexShrink: 0,
                                        border: isBlocked
                                            ? '2px solid rgba(186,26,26,0.2)'
                                            : '2px solid rgba(255,255,255,0.3)',
                                    }}>
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="" style={{
                                                width: '100%', height: '100%',
                                                borderRadius: '50%', objectFit: 'cover',
                                            }} />
                                        ) : user.username.slice(0, 2).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <p style={{
                                                fontSize: '15px', fontWeight: 600,
                                                color: '#131b2e', margin: 0,
                                            }}>
                                                {user.username}
                                            </p>
                                            {isBlocked && (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    background: 'rgba(186,26,26,0.1)',
                                                    border: '1px solid rgba(186,26,26,0.2)',
                                                    borderRadius: '999px',
                                                    fontSize: '10px', fontWeight: 700,
                                                    color: '#ba1a1a',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                }}>
                                                    Blocked
                                                </span>
                                            )}
                                        </div>
                                        {user.display_name && (
                                            <p style={{ fontSize: '13px', color: '#737687', margin: '2px 0 0' }}>
                                                {user.display_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        {isBlocked ? (
                                            <button
                                                onClick={(e) => handleBlock(e, user.username)}
                                                style={{
                                                    padding: '8px 16px',
                                                    border: '1px solid rgba(186,26,26,0.3)',
                                                    background: 'transparent',
                                                    borderRadius: '10px',
                                                    color: '#ba1a1a', fontSize: '13px',
                                                    fontWeight: 500, cursor: 'pointer',
                                                }}
                                            >
                                                Unblock
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    style={{
                                                        padding: '8px 18px',
                                                        background: '#004ccd',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        color: 'white', fontSize: '13px',
                                                        fontWeight: 600, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        boxShadow: '0 2px 8px rgba(0,76,205,0.2)',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#0f62fe'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#004ccd'}
                                                >
                                                    📤 Share
                                                </button>
                                                <button
                                                    onClick={(e) => handleBlock(e, user.username)}
                                                    title="Block user"
                                                    style={{
                                                        padding: '8px 14px',
                                                        border: '1px solid rgba(186,26,26,0.25)',
                                                        background: 'white',
                                                        borderRadius: '10px',
                                                        color: '#ba1a1a', fontSize: '13px',
                                                        fontWeight: 500, cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,0.06)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                                >
                                                    🚫 Block
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {selectedUser && (
                <SendModal
                    recipient={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onBlock={() => handleBlockFromModal(selectedUser.username)}
                />
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}