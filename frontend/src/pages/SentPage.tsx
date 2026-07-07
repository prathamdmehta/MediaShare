// src/pages/SentPage.tsx

import { useState, useEffect } from 'react'
import { sharesApi } from '../api/shares'
import type { SentItem } from '../types/shares'

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
//     const days = Math.floor(hrs / 24)
//     return days === 1 ? '1d ago' : `${days}d ago`
// }

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    })
}

export default function SentPage() {
    const [items, setItems] = useState<SentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    useEffect(() => {
        sharesApi.sent()
            .then(res => setItems(res.data.items))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    // Compute stats
    const totalFiles = items.reduce((sum, i) => sum + i.file_count, 0)
    const totalSize = items.reduce((sum, i) => sum + i.total_size_bytes, 0)
    const totalRecipients = items.reduce((sum, i) => sum + i.recipient_count, 0)
    // const mediaShares = items.filter(i => i.share_type === 'media').length

    // Pagination
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
    const paginatedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    const stats = [
        {
            icon: '📤',
            label: 'Total Shares',
            value: items.length.toString(),
            accent: '#004ccd',
            bg: 'rgba(0,76,205,0.08)',
        },
        {
            icon: '📁',
            label: 'Files Sent',
            value: totalFiles.toString(),
            accent: '#9e3100',
            bg: 'rgba(158,49,0,0.08)',
        },
        {
            icon: '💾',
            label: 'Data Transferred',
            value: formatBytes(totalSize),
            accent: '#006a61',
            bg: 'rgba(0,106,97,0.08)',
        },
        {
            icon: '👥',
            label: 'Recipients',
            value: totalRecipients.toString(),
            accent: '#004ccd',
            bg: 'rgba(0,76,205,0.08)',
        },
    ]

    const fileIcon = (type: string) =>
        type === 'media' ? '📸' : '📄'

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#faf8ff',
            minHeight: '100vh',
            color: '#131b2e',
        }}>
            {/* Page content */}
            <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>

                {/* Page header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: '32px',
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '28px', fontWeight: 600,
                            color: '#131b2e', margin: '0 0 4px',
                            letterSpacing: '-0.02em',
                        }}>
                            Sent History
                        </h1>
                        <p style={{ fontSize: '14px', color: '#424656', margin: 0 }}>
                            Track and manage your shared digital assets.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {[
                            { label: 'Filter', icon: '⚙' },
                            { label: 'Export CSV', icon: '⬇' },
                        ].map(btn => (
                            <button key={btn.label} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '9px 16px',
                                background: 'white',
                                border: '1px solid #c3c6d8',
                                borderRadius: '10px',
                                fontSize: '13px', fontWeight: 500,
                                color: '#131b2e', cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f2f3ff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                            >
                                {btn.icon} {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                }}>
                    {stats.map((stat, i) => (
                        <div key={i} style={{
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid rgba(195,198,216,0.5)',
                            padding: '20px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '12px',
                            }}>
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '8px',
                                    background: stat.bg,
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '18px',
                                }}>
                                    {stat.icon}
                                </div>
                            </div>
                            <p style={{
                                fontSize: '12px', fontWeight: 500,
                                color: '#424656', margin: '0 0 4px',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                                {stat.label}
                            </p>
                            <h3 style={{
                                fontSize: '22px', fontWeight: 700,
                                color: '#131b2e', margin: 0,
                                letterSpacing: '-0.02em',
                            }}>
                                {loading ? '—' : stat.value}
                            </h3>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid rgba(195,198,216,0.5)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                }}>
                    {/* Table header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                        padding: '12px 20px',
                        background: 'rgba(242,243,255,0.6)',
                        borderBottom: '1px solid rgba(195,198,216,0.3)',
                    }}>
                        {['Share', 'Recipients', 'Date Sent', 'Size', 'Type'].map(h => (
                            <span key={h} style={{
                                fontSize: '11px', fontWeight: 600,
                                color: '#424656',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Table body */}
                    {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#737687', fontSize: '14px' }}>
                            Loading...
                        </div>
                    ) : paginatedItems.length === 0 ? (
                        <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                            <div style={{
                                width: '52px', height: '52px',
                                background: '#f2f3ff',
                                borderRadius: '14px',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px',
                                fontSize: '24px',
                            }}>
                                📤
                            </div>
                            <p style={{
                                fontSize: '15px', fontWeight: 500,
                                color: '#131b2e', margin: '0 0 4px',
                            }}>
                                Nothing sent yet
                            </p>
                            <p style={{ fontSize: '13px', color: '#737687', margin: 0 }}>
                                Files you share will appear here.
                            </p>
                        </div>
                    ) : (
                        paginatedItems.map((item, i) => (
                            <div
                                key={item.cluster_id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                    padding: '14px 20px',
                                    borderBottom: i < paginatedItems.length - 1
                                        ? '1px solid rgba(195,198,216,0.2)' : 'none',
                                    alignItems: 'center',
                                    transition: 'all 0.15s ease',
                                    cursor: 'default',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = '#faf8ff'
                                    e.currentTarget.style.transform = 'translateX(3px)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'white'
                                    e.currentTarget.style.transform = 'translateX(0)'
                                }}
                            >
                                {/* Share info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '38px', height: '38px',
                                        borderRadius: '10px',
                                        background: item.share_type === 'media'
                                            ? 'rgba(0,76,205,0.08)'
                                            : 'rgba(0,106,97,0.08)',
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '18px',
                                        flexShrink: 0,
                                    }}>
                                        {fileIcon(item.share_type)}
                                    </div>
                                    <div>
                                        <p style={{
                                            fontSize: '13px', fontWeight: 600,
                                            color: '#131b2e', margin: 0,
                                        }}>
                                            {item.file_count} {item.file_count === 1 ? 'file' : 'files'}
                                        </p>
                                        <p style={{
                                            fontSize: '11px', color: '#737687',
                                            margin: '2px 0 0',
                                        }}>
                                            {item.message ? `"${item.message.slice(0, 30)}${item.message.length > 30 ? '...' : ''}"` : 'No message'}
                                        </p>
                                    </div>
                                </div>

                                {/* Recipients */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '-4px' }}>
                                    {Array.from({ length: Math.min(item.recipient_count, 3) }).map((_, ri) => (
                                        <div key={ri} style={{
                                            width: '28px', height: '28px',
                                            borderRadius: '50%',
                                            background: ri === 0 ? '#e2e7ff'
                                                : ri === 1 ? '#d5f5f0' : '#eaedff',
                                            border: '2px solid white',
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px', fontWeight: 700,
                                            color: ri === 0 ? '#004ccd'
                                                : ri === 1 ? '#006a61' : '#424656',
                                            marginLeft: ri > 0 ? '-8px' : '0',
                                        }}>
                                            {ri < 2 ? String.fromCharCode(65 + ri) : `+${item.recipient_count - 2}`}
                                        </div>
                                    ))}
                                    {item.recipient_count === 1 && (
                                        <span style={{
                                            fontSize: '12px', color: '#424656',
                                            marginLeft: '8px',
                                        }}>
                                            1 person
                                        </span>
                                    )}
                                </div>

                                {/* Date */}
                                <span style={{ fontSize: '13px', color: '#424656' }}>
                                    {formatDate(item.created_at)}
                                </span>

                                {/* Size */}
                                <span style={{ fontSize: '13px', color: '#424656' }}>
                                    {formatBytes(item.total_size_bytes)}
                                </span>

                                {/* Type badge */}
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    fontSize: '11px', fontWeight: 600,
                                    background: item.share_type === 'media'
                                        ? 'rgba(0,76,205,0.08)'
                                        : 'rgba(0,106,97,0.08)',
                                    color: item.share_type === 'media' ? '#004ccd' : '#006a61',
                                    width: 'fit-content',
                                }}>
                                    <span style={{
                                        width: '5px', height: '5px',
                                        borderRadius: '50%',
                                        background: item.share_type === 'media' ? '#004ccd' : '#006a61',
                                    }} />
                                    {item.share_type === 'media' ? 'Media' : 'Document'}
                                </span>
                            </div>
                        ))
                    )}

                    {/* Pagination */}
                    {!loading && items.length > 0 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 20px',
                            background: 'rgba(242,243,255,0.4)',
                            borderTop: '1px solid rgba(195,198,216,0.2)',
                        }}>
                            <p style={{ fontSize: '12px', color: '#737687', margin: 0 }}>
                                Showing{' '}
                                <strong style={{ color: '#131b2e' }}>
                                    {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, items.length)}
                                </strong>
                                {' '}of {items.length} results
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        width: '30px', height: '30px',
                                        border: '1px solid #c3c6d8',
                                        borderRadius: '8px',
                                        background: 'white',
                                        color: page === 1 ? '#c3c6d8' : '#424656',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px',
                                    }}
                                >
                                    ‹
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        style={{
                                            width: '30px', height: '30px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            background: p === page ? '#004ccd' : 'transparent',
                                            color: p === page ? 'white' : '#424656',
                                            cursor: 'pointer',
                                            fontSize: '13px', fontWeight: p === page ? 600 : 400,
                                        }}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={{
                                        width: '30px', height: '30px',
                                        border: '1px solid #c3c6d8',
                                        borderRadius: '8px',
                                        background: 'white',
                                        color: page === totalPages ? '#c3c6d8' : '#424656',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px',
                                    }}
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}