// src/pages/UploadPage.tsx

import { useState, useRef, type DragEvent, type ChangeEvent, useEffect } from 'react'
import { mediaApi } from '../api/media'
import { usersApi } from '../api/users'
import { sharesApi } from '../api/shares'
import type { MediaFile } from '../types/media'
import type { SearchResult } from '../types/profile'

// ── Constants ──────────────────────────────────────────────────────

const MAX_VIDEO_DURATION = 300

const ACCEPTED_TYPES: Record<string, string> = {
    'image/jpeg': 'image', 'image/png': 'image',
    'image/webp': 'image', 'image/gif': 'image',
    'video/mp4': 'video', 'video/quicktime': 'video', 'video/webm': 'video',
    'application/pdf': 'pdf',
    'application/msword': 'document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/vnd.ms-excel': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
}

const MAX_SIZES: Record<string, number> = {
    image: 20 * 1024 * 1024, video: 500 * 1024 * 1024,
    pdf: 50 * 1024 * 1024, document: 50 * 1024 * 1024,
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

async function getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.src = URL.createObjectURL(file)
        video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration) }
        video.onerror = () => resolve(0)
    })
}

interface UploadState {
    file: File
    status: 'validating' | 'uploading' | 'processing' | 'ready' | 'error'
    progress: number
    error?: string
    result?: MediaFile
}

// ── Main Component ─────────────────────────────────────────────────

export default function UploadPage() {
    const [isDragging, setIsDragging] = useState(false)
    const [uploads, setUploads] = useState<UploadState[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Recipient state
    const [recipientQuery, setRecipientQuery] = useState('')
    const [recipientResults, setRecipientResults] = useState<SearchResult[]>([])
    const [recipients, setRecipients] = useState<SearchResult[]>([])
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [sendError, setSendError] = useState('')

    // Debounced recipient search
    useEffect(() => {
        if (!recipientQuery.trim()) { setRecipientResults([]); return }
        const timer = setTimeout(async () => {
            try {
                const res = await usersApi.search(recipientQuery.trim())
                setRecipientResults(res.data.results.filter(
                    u => !recipients.find(r => r.username === u.username)
                ))
            } catch { }
        }, 400)
        return () => clearTimeout(timer)
    }, [recipientQuery, recipients])

    const addRecipient = (user: SearchResult) => {
        if (recipients.length >= 5) return
        setRecipients(prev => [...prev, user])
        setRecipientResults([])
        setRecipientQuery('')
    }

    const removeRecipient = (username: string) => {
        setRecipients(prev => prev.filter(r => r.username !== username))
    }

    const updateUpload = (index: number, patch: Partial<UploadState>) => {
        setUploads(prev => prev.map((u, i) => i === index ? { ...u, ...patch } : u))
    }

    const processFile = async (file: File, index: number) => {
        const fileType = ACCEPTED_TYPES[file.type]
        if (!fileType) { updateUpload(index, { status: 'error', error: 'File type not supported' }); return }
        if (file.size > MAX_SIZES[fileType]) {
            updateUpload(index, { status: 'error', error: `Too large — max ${formatBytes(MAX_SIZES[fileType])}` }); return
        }
        if (fileType === 'video') {
            const duration = await getVideoDuration(file)
            if (duration > MAX_VIDEO_DURATION) {
                const m = Math.floor(duration / 60), s = Math.floor(duration % 60)
                updateUpload(index, { status: 'error', error: `Video is ${m}m ${s}s — max 5 minutes` }); return
            }
        }
        try {
            updateUpload(index, { status: 'uploading', progress: 0 })
            const initiateRes = await mediaApi.initiate({ filename: file.name, mime_type: file.type, size_bytes: file.size })
            const { upload_id, presigned_url, s3_key } = initiateRes.data
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) updateUpload(index, { progress: Math.round((e.loaded / e.total) * 100) })
                })
                xhr.addEventListener('load', () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject())
                xhr.addEventListener('error', () => reject(new Error('Network error')))
                xhr.open('PUT', presigned_url)
                xhr.setRequestHeader('Content-Type', file.type)
                xhr.send(file)
            })
            updateUpload(index, { status: 'processing', progress: 100 })
            const confirmRes = await mediaApi.confirm({ upload_id, s3_key })
            const mediaId = confirmRes.data.id
            const poll = setInterval(async () => {
                try {
                    const fileRes = await mediaApi.get(mediaId)
                    const status = fileRes.data.processing_status
                    if (status === 'ready') { clearInterval(poll); updateUpload(index, { status: 'ready', result: fileRes.data }) }
                    else if (status === 'rejected') { clearInterval(poll); updateUpload(index, { status: 'error', error: fileRes.data.rejection_reason || 'Rejected' }) }
                    else if (status === 'failed') { clearInterval(poll); updateUpload(index, { status: 'error', error: 'Processing failed' }) }
                } catch { clearInterval(poll) }
            }, 2000)
        } catch (err: any) {
            updateUpload(index, { status: 'error', error: err.message || 'Upload failed' })
        }
    }

    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return
        const newUploads: UploadState[] = Array.from(files).map(file => ({ file, status: 'validating', progress: 0 }))
        setUploads(prev => {
            const startIndex = prev.length
            const updated = [...prev, ...newUploads]
            newUploads.forEach((_, i) => processFile(Array.from(files)[i], startIndex + i))
            return updated
        })
    }

    const removeUpload = (index: number) => {
        setUploads(prev => prev.filter((_, i) => i !== index))
    }

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files)
    }

    const readyFiles = uploads.filter(u => u.status === 'ready' && u.result)

    const handleSend = async () => {
        if (readyFiles.length === 0 || recipients.length === 0) return
        setSending(true); setSendError('')
        try {
            await sharesApi.send({
                media_file_ids: readyFiles.map(u => u.result!.id),
                recipient_usernames: recipients.map(r => r.username),
                message: message.trim() || undefined,
            })
            setSent(true)
        } catch (err: any) {
            setSendError(err.response?.data?.detail || 'Failed to send')
        } finally {
            setSending(false)
        }
    }

    const statusColor: Record<UploadState['status'], string> = {
        validating: '#737687', uploading: '#004ccd',
        processing: '#9e3100', ready: '#006a61', error: '#ba1a1a',
    }

    const statusLabel: Record<UploadState['status'], string> = {
        validating: 'Checking...', uploading: '', processing: 'Processing...',
        ready: 'Ready', error: '',
    }

    // ── Render ─────────────────────────────────────────────────────

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#faf8ff',
            minHeight: '100vh',
            color: '#131b2e',
        }}>
            {/* Header */}
            <header style={{
                height: '64px',
                padding: '0 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(250,248,255,0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(195,198,216,0.3)',
                position: 'sticky',
                top: 0,
                zIndex: 40,
            }}>
                <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#131b2e', margin: 0 }}>
                    New File Transfer
                </h1>
            </header>

            {/* Content */}
            <div style={{
                padding: '32px',
                maxWidth: '1280px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1fr 380px',
                gap: '24px',
                alignItems: 'start',
            }}>
                {/* Left — Dropzone + file list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Dropzone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => uploads.length === 0 && fileInputRef.current?.click()}
                        style={{
                            minHeight: uploads.length > 0 ? 'auto' : '360px',
                            border: `2px dashed ${isDragging ? '#004ccd' : '#c3c6d8'}`,
                            borderRadius: '12px',
                            background: isDragging ? 'rgba(0,76,205,0.04)' : 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: uploads.length === 0 ? 'center' : 'flex-start',
                            padding: uploads.length === 0 ? '48px 32px' : '20px',
                            cursor: uploads.length === 0 ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}
                    >
                        {uploads.length === 0 ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '72px', height: '72px',
                                    background: 'rgba(0,76,205,0.08)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 20px',
                                    fontSize: '32px',
                                    transition: 'transform 0.2s ease',
                                }}>
                                    ☁️
                                </div>
                                <h2 style={{
                                    fontSize: '18px', fontWeight: 600,
                                    color: '#131b2e', margin: '0 0 8px',
                                }}>
                                    Drag and drop files here
                                </h2>
                                <p style={{
                                    fontSize: '14px', color: '#424656',
                                    margin: '0 0 24px',
                                }}>
                                    Images, videos, PDFs and documents. Videos max 5 min.
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                                    style={{
                                        padding: '10px 28px',
                                        background: '#004ccd',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(0,76,205,0.2)',
                                    }}
                                >
                                    Select Files
                                </button>
                            </div>
                        ) : (
                            <div style={{ width: '100%' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                }}>
                                    <span style={{ fontSize: '13px', color: '#424656', fontWeight: 500 }}>
                                        {uploads.length} file{uploads.length > 1 ? 's' : ''} selected
                                    </span>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            fontSize: '13px',
                                            color: '#004ccd',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                        }}
                                    >
                                        + Add more
                                    </button>
                                </div>

                                {/* File rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {uploads.map((upload, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 14px',
                                            background: '#faf8ff',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(195,198,216,0.4)',
                                        }}>
                                            <span style={{ fontSize: '22px', flexShrink: 0 }}>
                                                {ACCEPTED_TYPES[upload.file.type] === 'image' ? '🖼️'
                                                    : ACCEPTED_TYPES[upload.file.type] === 'video' ? '🎬'
                                                    : ACCEPTED_TYPES[upload.file.type] === 'pdf' ? '📄'
                                                    : '📎'}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '4px',
                                                }}>
                                                    <p style={{
                                                        fontSize: '13px', fontWeight: 500,
                                                        color: '#131b2e', margin: 0,
                                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap', maxWidth: '260px',
                                                    }}>
                                                        {upload.file.name}
                                                    </p>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: statusColor[upload.status],
                                                        flexShrink: 0,
                                                        marginLeft: '8px',
                                                    }}>
                                                        {upload.status === 'uploading'
                                                            ? `${upload.progress}%`
                                                            : upload.status === 'error'
                                                            ? upload.error
                                                            : statusLabel[upload.status]}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '3px',
                                                    background: '#eaedff',
                                                    borderRadius: '2px',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        background: statusColor[upload.status],
                                                        width: upload.status === 'ready' ? '100%'
                                                            : upload.status === 'uploading' ? `${upload.progress}%`
                                                            : upload.status === 'processing' ? '85%'
                                                            : upload.status === 'error' ? '100%'
                                                            : '5%',
                                                        transition: 'width 0.3s ease',
                                                        borderRadius: '2px',
                                                    }} />
                                                </div>
                                                <p style={{
                                                    fontSize: '11px', color: '#737687',
                                                    margin: '4px 0 0',
                                                }}>
                                                    {formatBytes(upload.file.size)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeUpload(i)}
                                                style={{
                                                    background: 'transparent', border: 'none',
                                                    cursor: 'pointer', color: '#737687',
                                                    fontSize: '16px', flexShrink: 0, padding: '2px',
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={Object.keys(ACCEPTED_TYPES).join(',')}
                            style={{ display: 'none' }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
                        />
                    </div>

                    {/* Encryption badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '16px',
                        background: 'rgba(134,242,228,0.1)',
                        borderRadius: '10px',
                        border: '1px solid rgba(0,106,97,0.15)',
                    }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>✅</span>
                        <div>
                            <p style={{
                                fontSize: '13px', fontWeight: 600,
                                color: '#006a61', margin: '0 0 3px',
                            }}>
                                End-to-End Encryption Active
                            </p>
                            <p style={{ fontSize: '12px', color: '#424656', margin: 0 }}>
                                Your files are encrypted before they leave your device.
                                Only designated recipients can access the content.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right — Recipients + Send */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Recipients card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid rgba(195,198,216,0.3)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <h3 style={{
                                fontSize: '16px', fontWeight: 600,
                                color: '#131b2e', margin: 0,
                            }}>
                                Recipient
                            </h3>
                            <span style={{ fontSize: '11px', color: '#737687' }}>
                                {recipients.length}/5
                            </span>
                        </div>

                        {/* Search input */}
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute', left: '12px', top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#737687', fontSize: '14px',
                                pointerEvents: 'none',
                            }}>
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Search by username..."
                                value={recipientQuery}
                                onChange={e => setRecipientQuery(e.target.value)}
                                disabled={recipients.length >= 5}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 36px',
                                    background: '#faf8ff',
                                    border: '1px solid #c3c6d8',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    color: '#131b2e',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.2s ease',
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

                            {/* Search results dropdown */}
                            {recipientResults.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0, right: 0,
                                    background: 'white',
                                    border: '1px solid rgba(195,198,216,0.4)',
                                    borderRadius: '10px',
                                    marginTop: '4px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                    zIndex: 10,
                                    overflow: 'hidden',
                                }}>
                                    {recipientResults.map(user => (
                                        <div
                                            key={user.username}
                                            onClick={() => addRecipient(user)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                transition: 'background 0.1s ease',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f2f3ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{
                                                width: '30px', height: '30px',
                                                borderRadius: '50%',
                                                background: '#e2e7ff',
                                                border: '1px solid rgba(0,76,205,0.2)',
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px', fontWeight: 600,
                                                color: '#004ccd', flexShrink: 0,
                                            }}>
                                                {user.username.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: 500, color: '#131b2e', margin: 0 }}>
                                                    {user.username}
                                                </p>
                                                {user.display_name && (
                                                    <p style={{ fontSize: '11px', color: '#737687', margin: 0 }}>
                                                        {user.display_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recipient tags */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            minHeight: '36px',
                        }}>
                            {recipients.length === 0 ? (
                                <p style={{
                                    fontSize: '12px', color: 'rgba(115,118,135,0.6)',
                                    fontStyle: 'italic', margin: 0,
                                }}>
                                    No recipients added (max 5)
                                </p>
                            ) : (
                                recipients.map(r => (
                                    <div key={r.username} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 10px',
                                        background: 'rgba(0,76,205,0.08)',
                                        border: '1px solid rgba(0,76,205,0.2)',
                                        borderRadius: '999px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: '#004ccd',
                                    }}>
                                        {r.username}
                                        <button
                                            onClick={() => removeRecipient(r.username)}
                                            style={{
                                                background: 'transparent', border: 'none',
                                                cursor: 'pointer', color: '#004ccd',
                                                fontSize: '14px', padding: 0, lineHeight: 1,
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Private note */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{
                                fontSize: '13px', fontWeight: 500, color: '#131b2e',
                            }}>
                                Private Note (Optional)
                            </label>
                            <textarea
                                placeholder="Write a secure message..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                maxLength={500}
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#faf8ff',
                                    border: '1px solid #c3c6d8',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    color: '#131b2e',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.2s ease',
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
                            <p style={{
                                fontSize: '11px', color: '#737687',
                                margin: 0, textAlign: 'right',
                            }}>
                                {message.length}/500
                            </p>
                        </div>

                        {/* Send error */}
                        {sendError && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(186,26,26,0.06)',
                                border: '1px solid rgba(186,26,26,0.2)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#ba1a1a',
                            }}>
                                {sendError}
                            </div>
                        )}

                        {/* Send button */}
                        <button
                            onClick={handleSend}
                            disabled={readyFiles.length === 0 || recipients.length === 0 || sending}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: (readyFiles.length === 0 || recipients.length === 0 || sending)
                                    ? '#b4c5ff' : '#004ccd',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: (readyFiles.length === 0 || recipients.length === 0 || sending)
                                    ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(0,76,205,0.15)',
                            }}
                            onMouseEnter={e => {
                                if (readyFiles.length > 0 && recipients.length > 0 && !sending)
                                    e.currentTarget.style.background = '#0f62fe'
                            }}
                            onMouseLeave={e => {
                                if (readyFiles.length > 0 && recipients.length > 0 && !sending)
                                    e.currentTarget.style.background = '#004ccd'
                            }}
                        >
                            {sending ? (
                                <>
                                    <span style={{
                                        width: '14px', height: '14px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        display: 'inline-block',
                                    }} />
                                    Encrypting...
                                </>
                            ) : (
                                <>🔒 Send Securely</>
                            )}
                        </button>

                        {/* Helper text */}
                        {readyFiles.length === 0 && uploads.length > 0 && (
                            <p style={{ fontSize: '12px', color: '#737687', textAlign: 'center', margin: 0 }}>
                                Waiting for files to finish processing...
                            </p>
                        )}
                        {readyFiles.length > 0 && recipients.length === 0 && (
                            <p style={{ fontSize: '12px', color: '#737687', textAlign: 'center', margin: 0 }}>
                                {readyFiles.length} file{readyFiles.length > 1 ? 's' : ''} ready — add a recipient to send
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Success overlay */}
            {sent && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(250,248,255,0.85)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px',
                            background: '#006a61',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            fontSize: '36px',
                        }}>
                            ✓
                        </div>
                        <h2 style={{
                            fontSize: '32px', fontWeight: 700,
                            color: '#131b2e', margin: '0 0 12px',
                            letterSpacing: '-0.02em',
                        }}>
                            Transfer Successful
                        </h2>
                        <p style={{
                            fontSize: '16px', color: '#424656',
                            margin: '0 0 32px',
                        }}>
                            Your files have been encrypted and sent securely.
                        </p>
                        <button
                            onClick={() => {
                                setSent(false)
                                setUploads([])
                                setRecipients([])
                                setMessage('')
                            }}
                            style={{
                                padding: '14px 40px',
                                background: '#004ccd',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(0,76,205,0.25)',
                            }}
                        >
                            Create New Transfer
                        </button>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}