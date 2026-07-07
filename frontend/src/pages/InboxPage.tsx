// src/pages/InboxPage.tsx

import { useState, useEffect } from 'react'
import { sharesApi } from '../api/shares'
import type { InboxItem, ClusterDetail, ShareFile } from '../types/shares'

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// function timeAgo(dateStr: string): string {
//     const diff = Date.now() - new Date(dateStr).getTime()
//     const mins = Math.floor(diff / 60000)
//     if (mins < 1) return 'just now'
//     if (mins < 60) return `${mins}m ago`
//     const hrs = Math.floor(mins / 60)
//     if (hrs < 24) return `${hrs}h ago`
//     return `${Math.floor(hrs / 24)}d ago`
// }

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    })
}

async function downloadFile(url: string, filename: string) {
    const response = await fetch(url)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
}

// ── File Preview Modal ─────────────────────────────────────────────

function PreviewModal({
    file,
    onClose,
}: {
    file: ShareFile
    onClose: () => void
}) {
    const isImage = file.mime_type.startsWith('image/')
    const isVideo = file.mime_type.startsWith('video/')

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(10,10,15,0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100, padding: '24px',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    maxWidth: '800px',
                    width: '100%',
                    maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(195,198,216,0.3)',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#131b2e', margin: 0 }}>
                            {file.original_name}
                        </p>
                        <p style={{ fontSize: '12px', color: '#737687', margin: '2px 0 0' }}>
                            {formatBytes(file.size_bytes)}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => downloadFile(file.download_url, file.original_name)}
                            style={{
                                padding: '7px 16px',
                                background: '#004ccd', color: 'white',
                                border: 'none', borderRadius: '8px',
                                fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            ⬇ Download
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                width: '32px', height: '32px',
                                border: '1px solid #c3c6d8',
                                borderRadius: '8px', background: 'white',
                                color: '#737687', cursor: 'pointer', fontSize: '18px',
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div style={{
                    flex: 1, overflow: 'auto',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    background: '#faf8ff',
                }}>
                    {isImage ? (
                        <img
                            src={file.download_url}
                            alt={file.original_name}
                            style={{
                                maxWidth: '100%', maxHeight: '60vh',
                                borderRadius: '8px', objectFit: 'contain',
                            }}
                        />
                    ) : isVideo ? (
                        <video
                            src={file.download_url}
                            controls
                            style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }}
                        />
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                                {file.file_type === 'pdf' ? '📄' : '📎'}
                            </div>
                            <p style={{ fontSize: '15px', color: '#424656', margin: '0 0 16px' }}>
                                Preview not available for this file type
                            </p>
                            <button
                                onClick={() => downloadFile(file.download_url, file.original_name)}
                                style={{
                                    padding: '10px 24px',
                                    background: '#004ccd', color: 'white',
                                    border: 'none', borderRadius: '10px',
                                    fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                                }}
                            >
                                Download to view
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Cluster Detail Modal ───────────────────────────────────────────

function ClusterModal({
    clusterId,
    onClose,
}: {
    clusterId: string
    onClose: () => void
}) {
    const [detail, setDetail] = useState<ClusterDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [previewFile, setPreviewFile] = useState<ShareFile | null>(null)

    useEffect(() => {
        sharesApi.getCluster(clusterId)
            .then(res => setDetail(res.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [clusterId])

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(10,10,15,0.6)',
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
                width: '560px',
                maxHeight: '80vh',
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
                    <div>
                        <p style={{ fontSize: '12px', color: '#737687', margin: '0 0 2px' }}>
                            From {detail?.sender_username}
                        </p>
                        <h3 style={{
                            fontSize: '17px', fontWeight: 600,
                            color: '#131b2e', margin: 0,
                        }}>
                            {loading ? 'Loading...' : `${detail?.file_count} ${detail?.share_type === 'media' ? 'files' : 'document'}`}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px', height: '32px',
                            border: '1px solid #c3c6d8',
                            borderRadius: '8px', background: 'white',
                            color: '#737687', cursor: 'pointer', fontSize: '18px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {detail?.message && (
                    <div style={{
                        padding: '10px 24px',
                        borderBottom: '1px solid rgba(195,198,216,0.2)',
                        background: '#faf8ff',
                        fontSize: '13px', color: '#424656', fontStyle: 'italic',
                    }}>
                        "{detail.message}"
                    </div>
                )}

                {/* Files */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#737687', fontSize: '13px' }}>
                            Loading files...
                        </div>
                    ) : detail?.files.map(file => (
                        <div key={file.id} style={{
                            display: 'flex', alignItems: 'center',
                            gap: '12px', padding: '14px 24px',
                            borderBottom: '1px solid rgba(195,198,216,0.15)',
                        }}>
                            {/* Thumbnail */}
                            <div style={{
                                width: '44px', height: '44px',
                                borderRadius: '10px', background: '#f2f3ff',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', flexShrink: 0,
                                overflow: 'hidden', border: '1px solid rgba(195,198,216,0.3)',
                            }}>
                                {file.thumbnail_url ? (
                                    <img src={file.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '20px' }}>
                                        {file.file_type === 'image' ? '🖼️' : file.file_type === 'video' ? '🎬' : file.file_type === 'pdf' ? '📄' : '📎'}
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    fontSize: '13px', fontWeight: 500,
                                    color: '#131b2e', margin: 0,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {file.original_name}
                                </p>
                                <p style={{ fontSize: '11px', color: '#737687', margin: '2px 0 0' }}>
                                    {formatBytes(file.size_bytes)}
                                    {file.duration_secs && ` · ${Math.floor(file.duration_secs / 60)}:${String(file.duration_secs % 60).padStart(2, '0')}`}
                                </p>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <button
                                    onClick={() => setPreviewFile(file)}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#f2f3ff',
                                        border: '1px solid rgba(195,198,216,0.4)',
                                        borderRadius: '7px', color: '#004ccd',
                                        fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                    }}
                                >
                                    Preview
                                </button>
                                <button
                                    onClick={() => downloadFile(file.download_url, file.original_name)}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#004ccd',
                                        border: 'none',
                                        borderRadius: '7px', color: 'white',
                                        fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                                    }}
                                >
                                    ⬇
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {previewFile && (
                <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
            )}
        </>
    )
}

// ── Inbox Row ──────────────────────────────────────────────────────

function InboxRow({
    item,
    starred,
    onOpen,
    onStar,
    onDelete,
}: {
    item: InboxItem
    starred: boolean
    onOpen: () => void
    onStar: () => void
    onDelete: () => void
}) {
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setDeleting(true)
        try {
            await sharesApi.deleteFromInbox(item.share_recipient_id)
            onDelete()
        } catch { setDeleting(false) }
    }

    return (
        <div
            onClick={onOpen}
            style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 140px 100px 120px 120px',
                alignItems: 'center',
                gap: '12px',
                padding: '13px 20px',
                borderBottom: '1px solid rgba(195,198,216,0.15)',
                background: item.is_read ? 'white' : 'rgba(0,76,205,0.02)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#faf8ff'}
            onMouseLeave={e => e.currentTarget.style.background = item.is_read ? 'white' : 'rgba(0,76,205,0.02)'}
        >
            {/* Unread dot */}
            <div style={{
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: item.is_read ? 'transparent' : '#004ccd',
                margin: '0 auto',
                flexShrink: 0,
            }} />

            {/* File info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '9px',
                    background: item.share_type === 'media' ? 'rgba(0,76,205,0.08)' : 'rgba(0,106,97,0.08)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>
                    {item.share_type === 'media' ? '📸' : '📄'}
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{
                        fontSize: '13px', fontWeight: item.is_read ? 400 : 600,
                        color: '#131b2e', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {item.file_count} {item.file_count === 1 ? 'file' : 'files'} from {item.sender_username}
                    </p>
                    <p style={{
                        fontSize: '11px', color: '#737687',
                        margin: '2px 0 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {item.message || `${formatBytes(item.total_size_bytes)} · ${item.share_type}`}
                    </p>
                </div>
            </div>

            {/* Received */}
            <span style={{ fontSize: '12px', color: '#737687' }}>
                {formatDate(item.created_at)}
            </span>

            {/* Size */}
            <span style={{ fontSize: '12px', color: '#737687' }}>
                {formatBytes(item.total_size_bytes)}
            </span>

            {/* Status */}
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px', fontWeight: 600,
                background: item.is_read ? 'rgba(195,198,216,0.2)' : 'rgba(0,76,205,0.1)',
                color: item.is_read ? '#737687' : '#004ccd',
                width: 'fit-content',
            }}>
                <span style={{
                    width: '5px', height: '5px',
                    borderRadius: '50%',
                    background: item.is_read ? '#737687' : '#004ccd',
                }} />
                {item.is_read ? 'Read' : 'Unread'}
            </span>

            {/* Actions */}
            <div
                style={{
                    display: 'flex', alignItems: 'center',
                    gap: '6px', justifyContent: 'flex-end',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Star */}
                <button
                    onClick={onStar}
                    title={starred ? 'Unstar' : 'Star'}
                    style={{
                        width: '28px', height: '28px',
                        border: 'none', background: 'transparent',
                        cursor: 'pointer', fontSize: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '6px', transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f2f3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    {starred ? '⭐' : '☆'}
                </button>

                {/* Delete */}
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    title="Delete"
                    style={{
                        padding: '5px 10px',
                        border: '1px solid rgba(186,26,26,0.25)',
                        background: 'transparent',
                        borderRadius: '7px',
                        color: '#ba1a1a', fontSize: '12px',
                        fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    {deleting ? '...' : '🗑 Delete'}
                </button>
            </div>
        </div>
    )
}

// ── Main Inbox Page ────────────────────────────────────────────────

type Tab = 'all' | 'unread' | 'starred'

export default function InboxPage() {
    const [items, setItems] = useState<InboxItem[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<Tab>('all')
    const [search, setSearch] = useState('')
    const [starred, setStarred] = useState<Set<string>>(new Set())
    const [selectedCluster, setSelectedCluster] = useState<string | null>(null)

    useEffect(() => {
        sharesApi.inbox()
            .then(res => setItems(res.data.items))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleOpen = (item: InboxItem) => {
        setSelectedCluster(item.cluster_id)
        if (!item.is_read) {
            setItems(prev => prev.map(i =>
                i.cluster_id === item.cluster_id ? { ...i, is_read: true } : i
            ))
            sharesApi.markRead(item.share_recipient_id).catch(console.error)
        }
    }

    const handleStar = (clusterId: string) => {
        setStarred(prev => {
            const next = new Set(prev)
            if (next.has(clusterId)) next.delete(clusterId)
            else next.add(clusterId)
            return next
        })
    }

    const handleDelete = (shareRecipientId: string) => {
        setItems(prev => prev.filter(i => i.share_recipient_id !== shareRecipientId))
    }

    // Filter
    const filtered = items.filter(item => {
        const matchesSearch = search === '' ||
            item.sender_username.toLowerCase().includes(search.toLowerCase()) ||
            item.message?.toLowerCase().includes(search.toLowerCase())
        if (!matchesSearch) return false
        if (tab === 'unread') return !item.is_read
        if (tab === 'starred') return starred.has(item.cluster_id)
        return true
    })

    const unreadCount = items.filter(i => !i.is_read).length
    const starredCount = items.filter(i => starred.has(i.cluster_id)).length

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'all', label: 'All', count: items.length },
        { key: 'unread', label: 'Unread', count: unreadCount },
        { key: 'starred', label: 'Starred', count: starredCount },
    ]

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#faf8ff',
            minHeight: '100vh',
            color: '#131b2e',
        }}>
            <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>

                {/* Page header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '28px',
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px', fontWeight: 600,
                            color: '#131b2e', margin: '0 0 4px',
                            letterSpacing: '-0.02em',
                        }}>
                            Inbox
                        </h1>
                        <p style={{ fontSize: '14px', color: '#424656', margin: 0 }}>
                            Files shared with you
                        </p>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <span style={{
                            position: 'absolute', left: '12px', top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#737687', pointerEvents: 'none', fontSize: '14px',
                        }}>
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Search by sender or message..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '280px',
                                padding: '10px 14px 10px 36px',
                                background: 'white',
                                border: '1px solid #c3c6d8',
                                borderRadius: '10px',
                                fontSize: '13px', color: '#131b2e',
                                outline: 'none',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s ease',
                            }}
                            onFocus={e => {
                                e.target.style.borderColor = '#004ccd'
                                e.target.style.boxShadow = '0 0 0 4px rgba(0,76,205,0.08)'
                            }}
                            onBlur={e => {
                                e.target.style.borderColor = '#c3c6d8'
                                e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                            }}
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '16px',
                    background: 'white',
                    padding: '4px',
                    borderRadius: '12px',
                    width: 'fit-content',
                    border: '1px solid rgba(195,198,216,0.3)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                background: tab === t.key ? '#004ccd' : 'transparent',
                                color: tab === t.key ? 'white' : '#424656',
                                fontSize: '13px', fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {t.label}
                            {t.count !== undefined && t.count > 0 && (
                                <span style={{
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                    background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#f2f3ff',
                                    color: tab === t.key ? 'white' : '#004ccd',
                                    fontSize: '11px', fontWeight: 700,
                                }}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid rgba(195,198,216,0.3)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                }}>
                    {/* Table header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr 140px 100px 120px 120px',
                        gap: '12px',
                        padding: '10px 20px',
                        background: 'rgba(242,243,255,0.6)',
                        borderBottom: '1px solid rgba(195,198,216,0.25)',
                    }}>
                        <span />
                        {['File', 'Received', 'Size', 'Status', 'Actions'].map(h => (
                            <span key={h} style={{
                                fontSize: '11px', fontWeight: 700,
                                color: '#424656', textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}>
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Rows */}
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#737687', fontSize: '14px' }}>
                            Loading...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                            <div style={{
                                width: '52px', height: '52px',
                                background: '#f2f3ff', borderRadius: '14px',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px', fontSize: '24px',
                            }}>
                                {tab === 'starred' ? '⭐' : tab === 'unread' ? '📬' : '📭'}
                            </div>
                            <p style={{
                                fontSize: '15px', fontWeight: 500,
                                color: '#131b2e', margin: '0 0 4px',
                            }}>
                                {tab === 'starred' ? 'No starred items'
                                    : tab === 'unread' ? 'All caught up!'
                                    : search ? `No results for "${search}"`
                                    : 'Nothing here yet'}
                            </p>
                            <p style={{ fontSize: '13px', color: '#737687', margin: 0 }}>
                                {tab === 'starred' ? 'Star items to find them here quickly'
                                    : tab === 'unread' ? 'All your files have been read'
                                    : search ? 'Try a different search term'
                                    : 'Files shared with you will appear here'}
                            </p>
                        </div>
                    ) : (
                        filtered.map(item => (
                            <InboxRow
                                key={item.share_recipient_id}
                                item={item}
                                starred={starred.has(item.cluster_id)}
                                onOpen={() => handleOpen(item)}
                                onStar={() => handleStar(item.cluster_id)}
                                onDelete={() => handleDelete(item.share_recipient_id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {selectedCluster && (
                <ClusterModal
                    clusterId={selectedCluster}
                    onClose={() => setSelectedCluster(null)}
                />
            )}
        </div>
    )
}