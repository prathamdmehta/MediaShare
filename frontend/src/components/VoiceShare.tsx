// src/components/VoiceShare.tsx

import { useState, useRef } from 'react'
import { aiApi, type VoiceCommandResponse } from '../api/ai'
import { sharesApi } from '../api/shares'

type Step = 'idle' | 'listening' | 'processing' | 'confirm' | 'sending' | 'done' | 'error'

export default function VoiceShare({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState<Step>('idle')
    const [transcript, setTranscript] = useState('')
    const [result, setResult] = useState<VoiceCommandResponse | null>(null)
    const [error, setError] = useState('')
    // const [sent, setSent] = useState(false)
    const recognitionRef = useRef<any>(null)

    const startListening = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser. Try Chrome.')
            setStep('error')
            return
        }

        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.continuous = false
        recognition.interimResults = false
        recognitionRef.current = recognition

        recognition.onstart = () => setStep('listening')

        recognition.onresult = async (event: any) => {
            const text = event.results[0][0].transcript
            setTranscript(text)
            setStep('processing')

            try {
                const res = await aiApi.processVoiceCommand(text)
                setResult(res.data)

                if (
                    res.data.action === 'share' &&
                    res.data.matched_files.length > 0 &&
                    res.data.recipient_username &&
                    res.data.confidence >= 0.7
                ) {
                    setStep('confirm')
                } else {
                    setError(
                        res.data.ai_response ||
                        'Could not understand the request clearly. Please try again.'
                    )
                    setStep('error')
                }
            } catch (err) {
                setError('Failed to process your request. Please try again.')
                setStep('error')
            }
        }

        recognition.onerror = (event: any) => {
            setError(`Microphone error: ${event.error}`)
            setStep('error')
        }

        recognition.start()
    }

    const stopListening = () => {
        recognitionRef.current?.stop()
    }

    const handleConfirmSend = async () => {
        if (!result) return
        setStep('sending')
        try {
            await sharesApi.send({
                media_file_ids: result.matched_files.map(f => f.id),
                recipient_usernames: [result.recipient_username!],
                message: result.message || undefined,
            })
            setStep('done')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Send failed.')
            setStep('error')
        }
    }

    const reset = () => {
        setStep('idle')
        setTranscript('')
        setResult(null)
        setError('')
    }

    function formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
    }

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(10,10,15,0.6)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 100,
                }}
            />

            {/* Modal */}
            <div style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'white',
                borderRadius: '20px',
                width: '520px',
                padding: '32px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
                zIndex: 101,
                border: '1px solid rgba(195,198,216,0.3)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '24px',
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '20px', fontWeight: 600,
                            color: '#131b2e', margin: '0 0 4px',
                        }}>
                            🎙 Voice Share
                        </h2>
                        <p style={{ fontSize: '13px', color: '#737687', margin: 0 }}>
                            Say what you want to share and who to send it to
                        </p>
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

                {/* Example hint */}
                {step === 'idle' && (
                    <div style={{
                        padding: '12px 16px',
                        background: '#f2f3ff',
                        borderRadius: '10px',
                        border: '1px solid rgba(0,76,205,0.15)',
                        marginBottom: '24px',
                    }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#004ccd', margin: '0 0 4px' }}>
                            Example commands:
                        </p>
                        <p style={{ fontSize: '12px', color: '#424656', margin: 0, lineHeight: 1.6 }}>
                            "Share the Q4 report PDF with userb"<br />
                            "Send my latest photo to pratham"<br />
                            "Transfer the video I uploaded yesterday to alice"
                        </p>
                    </div>
                )}

                {/* State: IDLE */}
                {step === 'idle' && (
                    <button
                        onClick={startListening}
                        style={{
                            width: '100%', padding: '16px',
                            background: '#004ccd', color: 'white',
                            border: 'none', borderRadius: '12px',
                            fontSize: '16px', fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '10px',
                            boxShadow: '0 4px 16px rgba(0,76,205,0.25)',
                        }}
                    >
                        🎙 Start Speaking
                    </button>
                )}

                {/* State: LISTENING */}
                {step === 'listening' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px',
                            borderRadius: '50%',
                            background: 'rgba(186,26,26,0.1)',
                            border: '3px solid #ba1a1a',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            fontSize: '32px',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }}>
                            🎙
                        </div>
                        <p style={{
                            fontSize: '16px', fontWeight: 600,
                            color: '#131b2e', margin: '0 0 8px',
                        }}>
                            Listening...
                        </p>
                        <p style={{ fontSize: '13px', color: '#737687', margin: '0 0 24px' }}>
                            Speak your command clearly
                        </p>
                        <button
                            onClick={stopListening}
                            style={{
                                padding: '10px 24px',
                                background: '#ba1a1a', color: 'white',
                                border: 'none', borderRadius: '10px',
                                fontSize: '14px', fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            Stop
                        </button>
                    </div>
                )}

                {/* State: PROCESSING */}
                {step === 'processing' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{
                                width: '48px', height: '48px',
                                border: '3px solid #eaedff',
                                borderTopColor: '#004ccd',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                margin: '0 auto 16px',
                            }} />
                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#131b2e', margin: '0 0 4px' }}>
                                AI is processing...
                            </p>
                            <p style={{ fontSize: '13px', color: '#737687', margin: 0 }}>
                                "{transcript}"
                            </p>
                        </div>
                    </div>
                )}

                {/* State: CONFIRM */}
                {step === 'confirm' && result && (
                    <div>
                        {/* AI understood */}
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(0,106,97,0.06)',
                            border: '1px solid rgba(0,106,97,0.2)',
                            borderRadius: '10px',
                            marginBottom: '20px',
                        }}>
                            <p style={{ fontSize: '13px', color: '#006a61', margin: '0 0 2px', fontWeight: 600 }}>
                                ✓ Understood
                            </p>
                            <p style={{ fontSize: '13px', color: '#424656', margin: 0 }}>
                                {result.ai_response}
                            </p>
                        </div>

                        {/* You said */}
                        <p style={{ fontSize: '11px', color: '#737687', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            You said
                        </p>
                        <p style={{
                            fontSize: '14px', color: '#131b2e',
                            margin: '0 0 20px', fontStyle: 'italic',
                        }}>
                            "{transcript}"
                        </p>

                        {/* Files to send */}
                        <p style={{ fontSize: '11px', color: '#737687', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Files ({result.matched_files.length})
                        </p>
                        <div style={{
                            border: '1px solid rgba(195,198,216,0.3)',
                            borderRadius: '10px', overflow: 'hidden',
                            marginBottom: '16px',
                        }}>
                            {result.matched_files.map((file, i) => (
                                <div key={file.id} style={{
                                    display: 'flex', alignItems: 'center',
                                    gap: '10px', padding: '10px 14px',
                                    borderBottom: i < result.matched_files.length - 1
                                        ? '1px solid rgba(195,198,216,0.15)' : 'none',
                                    background: '#faf8ff',
                                }}>
                                    <span style={{ fontSize: '18px' }}>
                                        {file.type === 'image' ? '🖼️' : file.type === 'video' ? '🎬' : '📄'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '13px', fontWeight: 500,
                                            color: '#131b2e', margin: 0,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {file.name}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#737687', margin: '2px 0 0' }}>
                                            {formatBytes(file.size_bytes)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recipient */}
                        <p style={{ fontSize: '11px', color: '#737687', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Recipient
                        </p>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            gap: '10px', padding: '10px 14px',
                            background: '#faf8ff',
                            border: '1px solid rgba(195,198,216,0.3)',
                            borderRadius: '10px',
                            marginBottom: '24px',
                        }}>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #004ccd, #006a61)',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px', fontWeight: 700, color: 'white',
                            }}>
                                {result.recipient_username?.slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#131b2e' }}>
                                {result.recipient_username}
                            </span>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleConfirmSend}
                                style={{
                                    flex: 1, padding: '13px',
                                    background: '#004ccd', color: 'white',
                                    border: 'none', borderRadius: '10px',
                                    fontSize: '14px', fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,76,205,0.2)',
                                }}
                            >
                                🔒 Send Now
                            </button>
                            <button
                                onClick={reset}
                                style={{
                                    flex: 1, padding: '13px',
                                    background: 'white', color: '#131b2e',
                                    border: '1px solid #c3c6d8',
                                    borderRadius: '10px',
                                    fontSize: '14px', fontWeight: 500,
                                    cursor: 'pointer',
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* State: SENDING */}
                {step === 'sending' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: '48px', height: '48px',
                            border: '3px solid #eaedff',
                            borderTopColor: '#004ccd',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 16px',
                        }} />
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#131b2e', margin: 0 }}>
                            Sending securely...
                        </p>
                    </div>
                )}

                {/* State: DONE */}
                {step === 'done' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: '64px', height: '64px',
                            background: '#006a61', borderRadius: '50%',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            fontSize: '28px', color: 'white',
                        }}>
                            ✓
                        </div>
                        <p style={{
                            fontSize: '17px', fontWeight: 600,
                            color: '#131b2e', margin: '0 0 6px',
                        }}>
                            Sent successfully!
                        </p>
                        <p style={{ fontSize: '13px', color: '#737687', margin: '0 0 24px' }}>
                            {result?.matched_files.length} file{result?.matched_files.length !== 1 ? 's' : ''} sent to {result?.recipient_username}
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 32px',
                                background: '#004ccd', color: 'white',
                                border: 'none', borderRadius: '10px',
                                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            Done
                        </button>
                    </div>
                )}

                {/* State: ERROR */}
                {step === 'error' && (
                    <div>
                        <div style={{
                            padding: '14px 16px',
                            background: 'rgba(186,26,26,0.06)',
                            border: '1px solid rgba(186,26,26,0.2)',
                            borderRadius: '10px',
                            marginBottom: '20px',
                        }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#ba1a1a', margin: '0 0 4px' }}>
                                Could not process request
                            </p>
                            <p style={{ fontSize: '13px', color: '#424656', margin: 0 }}>
                                {error}
                            </p>
                        </div>
                        {transcript && (
                            <p style={{ fontSize: '12px', color: '#737687', margin: '0 0 20px', fontStyle: 'italic' }}>
                                You said: "{transcript}"
                            </p>
                        )}
                        <button
                            onClick={reset}
                            style={{
                                width: '100%', padding: '13px',
                                background: '#004ccd', color: 'white',
                                border: 'none', borderRadius: '10px',
                                fontSize: '14px', fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                    }
                `}</style>
            </div>
        </>
    )
}