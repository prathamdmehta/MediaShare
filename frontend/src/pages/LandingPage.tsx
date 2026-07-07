// src/pages/LandingPage.tsx

import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LandingPage() {
    const navigate = useNavigate()
    const { isAuthenticated, user } = useAuthStore()

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#faf8ff',
            color: '#131b2e',
            overflowX: 'hidden',
        }}>
            {/* ── Top Nav ─────────────────────────────────────── */}
            <header style={{
                position: 'fixed',
                top: 0,
                width: '100%',
                zIndex: 50,
                background: 'rgba(250,248,255,0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(195,198,216,0.3)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
                <nav style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    height: '64px',
                    padding: '0 32px',
                    maxWidth: '1280px',
                    margin: '0 auto',
                }}>
                    {/* Logo */}
                    <div style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#004ccd',
                        letterSpacing: '-0.3px',
                    }}>
                        MediaShare
                    </div>

                    {/* Nav links */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '32px',
                    }}>
                        <a href="#features" style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#424656',
                            textDecoration: 'none',
                        }}>
                            Features
                        </a>
                        <a href="#security" style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#424656',
                            textDecoration: 'none',
                        }}>
                            Security
                        </a>
                        <a href="#pricing" style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#424656',
                            textDecoration: 'none',
                        }}>
                            Pricing
                        </a>
                    </div>

                    {/* Auth buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isAuthenticated ? (
                            <>
                                <span style={{
                                    fontSize: '14px',
                                    color: '#424656',
                                    fontWeight: 500,
                                }}>
                                    {user?.username}
                                </span>
                                <button
                                    onClick={() => navigate('/inbox')}
                                    style={{
                                        padding: '8px 20px',
                                        background: '#004ccd',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '999px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Go to App →
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{
                                        padding: '8px 20px',
                                        background: 'transparent',
                                        color: '#004ccd',
                                        border: '1px solid #c3c6d8',
                                        borderRadius: '999px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f2f3ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => navigate('/register')}
                                    style={{
                                        padding: '8px 20px',
                                        background: '#004ccd',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '999px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#0f62fe'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#004ccd'}
                                >
                                    Get Started
                                </button>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            <main style={{ paddingTop: '64px' }}>
                {/* ── Hero ──────────────────────────────────────── */}
                <section style={{
                    minHeight: '90vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 32px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Background blobs */}
                    <div style={{
                        position: 'absolute',
                        top: '-100px',
                        right: '-100px',
                        width: '600px',
                        height: '600px',
                        background: 'rgba(0,76,205,0.06)',
                        borderRadius: '50%',
                        filter: 'blur(80px)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '-100px',
                        left: '-100px',
                        width: '500px',
                        height: '500px',
                        background: 'rgba(0,106,97,0.05)',
                        borderRadius: '50%',
                        filter: 'blur(80px)',
                        pointerEvents: 'none',
                    }} />

                    <div style={{
                        maxWidth: '1280px',
                        margin: '0 auto',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '80px',
                        alignItems: 'center',
                        position: 'relative',
                        zIndex: 1,
                    }}>
                        {/* Left — copy */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            {/* Badge */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 14px',
                                background: '#e2e7ff',
                                borderRadius: '999px',
                                border: '1px solid rgba(195,198,216,0.4)',
                                width: 'fit-content',
                            }}>
                                <span style={{ fontSize: '16px' }}>🔒</span>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#424656',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                }}>
                                    Enterprise-Grade Security
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 style={{
                                fontSize: '60px',
                                fontWeight: 700,
                                lineHeight: '68px',
                                letterSpacing: '-0.03em',
                                color: '#131b2e',
                                margin: 0,
                            }}>
                                Secure, Private,{' '}
                                <br />
                                <span style={{
                                    background: 'linear-gradient(135deg, #004ccd 0%, #0f62fe 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}>
                                    Seamless Sharing.
                                </span>
                            </h1>

                            {/* Subheadline */}
                            <p style={{
                                fontSize: '18px',
                                lineHeight: '28px',
                                color: '#424656',
                                maxWidth: '480px',
                                margin: 0,
                            }}>
                                The world's most intuitive file sharing platform built for
                                professionals. Send large files securely with end-to-end
                                encryption and total control over your recipient lists.
                            </p>

                            {/* CTAs */}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <button
                                    onClick={() => navigate('/register')}
                                    style={{
                                        padding: '14px 32px',
                                        background: '#004ccd',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 24px rgba(0,76,205,0.25)',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = '#0f62fe'
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = '#004ccd'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                    }}
                                >
                                    Get Started Free
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{
                                        padding: '14px 32px',
                                        background: 'white',
                                        color: '#004ccd',
                                        border: '1px solid #c3c6d8',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f2f3ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                    Sign In
                                </button>
                            </div>

                            {/* Social proof */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                opacity: 0.7,
                            }}>
                                <div style={{ display: 'flex' }}>
                                    {['#cbd5e1', '#94a3b8', '#64748b'].map((c, i) => (
                                        <div key={i} style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: c,
                                            border: '2px solid white',
                                            marginLeft: i > 0 ? '-10px' : '0',
                                        }} />
                                    ))}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#424656' }}>
                                    Trusted by 50,000+ teams
                                </span>
                            </div>
                        </div>

                        {/* Right — UI preview card */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                background: 'white',
                                borderRadius: '24px',
                                boxShadow: '0 32px 80px rgba(0,0,0,0.12)',
                                border: '1px solid rgba(195,198,216,0.3)',
                                overflow: 'hidden',
                                padding: '24px',
                            }}>
                                {/* Mock window bar */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '20px',
                                    paddingBottom: '16px',
                                    borderBottom: '1px solid #e2e7ff',
                                }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {['rgba(186,26,26,0.4)', '#86f2e4', '#b4c5ff'].map((c, i) => (
                                            <div key={i} style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                background: c,
                                            }} />
                                        ))}
                                    </div>
                                    <div style={{
                                        padding: '4px 12px',
                                        background: '#f2f3ff',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: '#424656',
                                        fontWeight: 500,
                                    }}>
                                        Active Transfer
                                    </div>
                                </div>

                                {/* File transfer item */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px',
                                    background: '#faf8ff',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(195,198,216,0.4)',
                                    marginBottom: '12px',
                                }}>
                                    <div style={{
                                        width: '40px', height: '40px',
                                        borderRadius: '10px',
                                        background: '#e2e7ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '20px',
                                        flexShrink: 0,
                                    }}>
                                        📄
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: '#131b2e',
                                            margin: 0,
                                        }}>
                                            Q4_Financial_Report.pdf
                                        </p>
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#737687',
                                            margin: '2px 0 0',
                                        }}>
                                            14.5 MB • 98% complete
                                        </p>
                                    </div>
                                    <div style={{
                                        width: '8px', height: '8px',
                                        borderRadius: '50%',
                                        background: '#006a61',
                                    }} />
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                    height: '6px',
                                    background: '#eaedff',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    marginBottom: '16px',
                                }}>
                                    <div style={{
                                        width: '98%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #004ccd, #0f62fe)',
                                        borderRadius: '3px',
                                    }} />
                                </div>

                                {/* Grid preview */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                }}>
                                    <div style={{
                                        height: '100px',
                                        borderRadius: '12px',
                                        background: '#e2e7ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '32px',
                                    }}>
                                        🖼️
                                    </div>
                                    <div style={{
                                        height: '100px',
                                        borderRadius: '12px',
                                        background: '#004ccd',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '32px',
                                    }}>
                                        ✅
                                    </div>
                                </div>
                            </div>

                            {/* Floating badge */}
                            <div style={{
                                position: 'absolute',
                                top: '30%',
                                right: '-20px',
                                background: 'white',
                                borderRadius: '12px',
                                padding: '8px 14px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                border: '1px solid rgba(195,198,216,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                animation: 'float 3s ease-in-out infinite',
                            }}>
                                <div style={{
                                    width: '8px', height: '8px',
                                    borderRadius: '50%',
                                    background: '#006a61',
                                }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#131b2e' }}>
                                    Encrypted
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Three Pillars ──────────────────────────────── */}
                <section id="features" style={{
                    padding: '80px 32px',
                    background: 'white',
                }}>
                    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                            <h2 style={{
                                fontSize: '36px',
                                fontWeight: 600,
                                letterSpacing: '-0.02em',
                                color: '#131b2e',
                                margin: '0 0 12px',
                            }}>
                                The Pillars of Secure Exchange
                            </h2>
                            <p style={{
                                fontSize: '16px',
                                color: '#424656',
                                maxWidth: '560px',
                                margin: '0 auto',
                                lineHeight: '24px',
                            }}>
                                Experience a platform where safety meets speed. We've re-engineered
                                file sharing from the ground up to ensure your data stays yours.
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '24px',
                        }}>
                            {[
                                {
                                    icon: '🔐',
                                    title: 'End-to-End Security',
                                    desc: 'Your files are encrypted before they leave your device. Only you and your chosen recipients hold the keys to unlock them.',
                                    accent: '#004ccd',
                                    bg: 'rgba(0,76,205,0.06)',
                                },
                                {
                                    icon: '👤',
                                    title: 'Private Recipients',
                                    desc: 'Manage access with surgical precision. Control exactly who can view or download your content with stealth recipient modes.',
                                    accent: '#006a61',
                                    bg: 'rgba(0,106,97,0.06)',
                                },
                                {
                                    icon: '⚡',
                                    title: 'Blazing Fast Transfers',
                                    desc: "Don't compromise speed for security. Our architecture ensures your large media files move at maximum line speed.",
                                    accent: '#9e3100',
                                    bg: 'rgba(158,49,0,0.06)',
                                },
                            ].map((p, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: '32px',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(195,198,216,0.4)',
                                        background: 'white',
                                        transition: 'all 0.2s ease',
                                        cursor: 'default',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow = `0 16px 40px ${p.accent}15`
                                        e.currentTarget.style.borderColor = `${p.accent}40`
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = 'none'
                                        e.currentTarget.style.borderColor = 'rgba(195,198,216,0.4)'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                    }}
                                >
                                    <div style={{
                                        width: '52px', height: '52px',
                                        borderRadius: '14px',
                                        background: p.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                        marginBottom: '20px',
                                    }}>
                                        {p.icon}
                                    </div>
                                    <h3 style={{
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        color: '#131b2e',
                                        margin: '0 0 10px',
                                    }}>
                                        {p.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: '#424656',
                                        lineHeight: '24px',
                                        margin: 0,
                                    }}>
                                        {p.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Feature Detail ─────────────────────────────── */}
                <section id="security" style={{ padding: '80px 32px' }}>
                    <div style={{
                        maxWidth: '1280px',
                        margin: '0 auto',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '80px',
                        alignItems: 'center',
                    }}>
                        {/* Left — mock UI */}
                        <div style={{
                            background: 'white',
                            borderRadius: '20px',
                            border: '1px solid rgba(195,198,216,0.3)',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.08)',
                            overflow: 'hidden',
                        }}>
                            {/* Inbox preview */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #eaedff',
                                background: '#faf8ff',
                            }}>
                                <p style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#131b2e',
                                    margin: 0,
                                }}>
                                    Inbox — 3 unread
                                </p>
                            </div>
                            {[
                                { from: 'alex_torres', files: 5, size: '48.2 MB', type: '📸 Media', unread: true },
                                { from: 'sarah_design', files: 1, size: '2.1 MB', type: '📄 Document', unread: true },
                                { from: 'mike_dev', files: 3, size: '15.7 MB', type: '📸 Media', unread: false },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 20px',
                                    borderBottom: '1px solid #eaedff',
                                    background: item.unread ? 'rgba(0,76,205,0.02)' : 'white',
                                }}>
                                    <div style={{
                                        width: '8px', height: '8px',
                                        borderRadius: '50%',
                                        background: item.unread ? '#004ccd' : 'transparent',
                                        flexShrink: 0,
                                    }} />
                                    <div style={{
                                        width: '36px', height: '36px',
                                        borderRadius: '50%',
                                        background: '#e2e7ff',
                                        border: '1px solid rgba(0,76,205,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: '#004ccd',
                                        flexShrink: 0,
                                    }}>
                                        {item.from.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{
                                            fontSize: '13px',
                                            fontWeight: item.unread ? 600 : 400,
                                            color: '#131b2e',
                                            margin: 0,
                                        }}>
                                            {item.from}
                                        </p>
                                        <p style={{
                                            fontSize: '12px',
                                            color: '#737687',
                                            margin: '2px 0 0',
                                        }}>
                                            {item.files} files · {item.size}
                                        </p>
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '3px 8px',
                                        borderRadius: '999px',
                                        border: '1px solid #e2e7ff',
                                        color: '#424656',
                                    }}>
                                        {item.type}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Right — copy */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h2 style={{
                                fontSize: '36px',
                                fontWeight: 600,
                                letterSpacing: '-0.02em',
                                color: '#131b2e',
                                margin: 0,
                            }}>
                                Designed for the Creative Workflow
                            </h2>
                            <p style={{
                                fontSize: '18px',
                                lineHeight: '28px',
                                color: '#424656',
                                margin: 0,
                            }}>
                                MediaShare isn't just about moving bits. It's about empowering
                                your creative process with tools that understand media.
                            </p>
                            {[
                                'Direct user-to-user transfers — no public links',
                                'Real-time notifications when files arrive',
                                'Block unwanted senders instantly',
                                'Images and videos up to 500MB per file',
                                'Storage quota tracking per account',
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                }}>
                                    <span style={{
                                        color: '#006a61',
                                        fontSize: '18px',
                                        lineHeight: 1,
                                        marginTop: '2px',
                                    }}>
                                        ✓
                                    </span>
                                    <span style={{
                                        fontSize: '15px',
                                        color: '#131b2e',
                                        lineHeight: '24px',
                                    }}>
                                        {item}
                                    </span>
                                </div>
                            ))}
                            <div style={{ paddingTop: '8px' }}>
                                <button
                                    onClick={() => navigate('/register')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#004ccd',
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                >
                                    Start sharing for free →
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── CTA ───────────────────────────────────────── */}
                <section style={{ padding: '80px 32px' }}>
                    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                        <div style={{
                            borderRadius: '32px',
                            background: '#131b2e',
                            padding: '80px 60px',
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            {/* Glow */}
                            <div style={{
                                position: 'absolute',
                                top: '-100px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '600px',
                                height: '400px',
                                background: 'rgba(0,76,205,0.2)',
                                borderRadius: '50%',
                                filter: 'blur(80px)',
                                pointerEvents: 'none',
                            }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <h2 style={{
                                    fontSize: '48px',
                                    fontWeight: 700,
                                    color: 'white',
                                    letterSpacing: '-0.03em',
                                    margin: '0 0 16px',
                                }}>
                                    Ready to share without limits?
                                </h2>
                                <p style={{
                                    fontSize: '18px',
                                    color: 'rgba(255,255,255,0.65)',
                                    maxWidth: '560px',
                                    margin: '0 auto 32px',
                                    lineHeight: '28px',
                                }}>
                                    Join thousands of professionals who trust MediaShare for their
                                    sensitive data. Get started today for free.
                                </p>
                                <button
                                    onClick={() => navigate('/register')}
                                    style={{
                                        padding: '16px 40px',
                                        background: 'white',
                                        color: '#004ccd',
                                        border: 'none',
                                        borderRadius: '14px',
                                        fontSize: '17px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#dbe1ff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                    Create Your Account
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Footer ────────────────────────────────────────── */}
            <footer style={{
                padding: '48px 32px',
                background: 'white',
                borderTop: '1px solid rgba(195,198,216,0.4)',
            }}>
                <div style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div>
                        <p style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: '#131b2e',
                            margin: '0 0 4px',
                        }}>
                            MediaShare
                        </p>
                        <p style={{
                            fontSize: '12px',
                            color: '#737687',
                            margin: 0,
                        }}>
                            © 2026 MediaShare. All rights reserved. Secure &amp; Private.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '32px' }}>
                        {['Privacy Policy', 'Terms of Service', 'Security', 'Contact'].map(link => (
                            <a key={link} href="#" style={{
                                fontSize: '13px',
                                color: '#737687',
                                textDecoration: 'none',
                                transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#004ccd'}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#737687'}
                            >
                                {link}
                            </a>
                        ))}
                    </div>
                </div>
            </footer>

            {/* Float animation */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </div>
    )
}