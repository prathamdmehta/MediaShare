// src/components/layout/Layout.tsx

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authApi } from "../../api/auth";

import { useNotifications } from "../../hooks/useNotifications";
import { useNotificationStore } from "../../store/notificationStore";

import { useState, useRef, useEffect } from "react";
import apiClient from "../../api/client";

import VoiceShare from "../VoiceShare"

const Icons = {
  Inbox: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        d="M22 12h-6l-2 3H10l-2-3H2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Send: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" />
      <polygon
        points="22 2 15 22 11 13 2 9 22 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Upload: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="17 8 12 3 7 8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
    </svg>
  ),
  Search: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  ),
  Profile: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="7"
        r="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Logout: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="16 17 21 12 16 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
    </svg>
  ),
};

const navItems = [
  { to: "/inbox", label: "Inbox", Icon: Icons.Inbox },
  { to: "/sent", label: "Sent", Icon: Icons.Send },
  { to: "/upload", label: "Upload", Icon: Icons.Upload },
  { to: "/search", label: "Search", Icon: Icons.Search },
  { to: "/profile", label: "Profile", Icon: Icons.Profile },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, clearAuth, isAuthenticated } = useAuthStore();
  useNotifications();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { reset, setCount } = useNotificationStore();

  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const [showVoice, setShowVoice] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return;
    apiClient
      .get("/notifications/unread-count")
      .then((res) => setCount(res.data.unread_count))
      .catch(console.error);
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = async () => {
    if (bellOpen) {
      setBellOpen(false);
      return;
    }
    setBellOpen(true);
    setLoadingNotifs(true);
    try {
      const res = await apiClient.get("/notifications/");
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch("/notifications/read-all");
      reset();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function notifMessage(n: any): string {
    if (n.type === "share_received") {
      const { sender_username, file_count, share_type } = n.payload;
      return `${sender_username} shared ${file_count} ${share_type === "media" ? "file" : "document"}${file_count > 1 ? "s" : ""} with you`;
    }
    if (n.type === "file_rejected") {
      return `Your video was rejected — ${n.payload.reason}`;
    }
    return "New notification";
  }

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    navigate("/login");
  };

  // Get initials for avatar
  const initials = user?.username?.slice(0, 2).toUpperCase() || "MS";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        style={{
          width: "220px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{ color: "white", fontWeight: 700, fontSize: "13px" }}
              >
                M
              </span>
            </div>
            <span
              style={{
                fontWeight: 600,
                color: "var(--text)",
                fontSize: "15px",
                letterSpacing: "-0.3px",
              }}
            >
              MediaShare
            </span>
          </div>

          {/* Notification bell */}
          {/* Notification bell */}
          <div ref={bellRef} style={{ position: "relative" }}>
            <button
              onClick={handleBellClick}
              title="Notifications"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: `1px solid ${bellOpen ? "var(--accent)" : "var(--border)"}`,
                background: bellOpen ? "var(--accent-dim)" : "transparent",
                color: unreadCount > 0 ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15px",
                transition: "all 0.15s ease",
              }}
            >
              🔔
            </button>

            {/* Badge */}
            {unreadCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  border: "2px solid var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "white",
                  pointerEvents: "none",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}

            {/* Dropdown */}
            {bellOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "38px",
                  left: "0",
                  width: "300px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                {/* Dropdown header */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        fontSize: "11px",
                        color: "var(--accent)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div
                  style={{
                    maxHeight: "320px",
                    overflowY: "auto",
                  }}
                >
                  {loadingNotifs ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setBellOpen(false);
                          navigate("/inbox");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          background: n.is_read
                            ? "transparent"
                            : "rgba(108,99,255,0.05)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(108,99,255,0.08)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = n.is_read
                            ? "transparent"
                            : "rgba(108,99,255,0.05)";
                        }}
                      >
                        {/* Unread dot */}
                        <div
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: n.is_read
                              ? "transparent"
                              : "var(--accent)",
                            flexShrink: 0,
                            marginTop: "5px",
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--text)",
                              lineHeight: 1.4,
                              marginBottom: "3px",
                            }}
                          >
                            {notifMessage(n)}
                          </p>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "var(--muted)",
                            }}
                          >
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
    onClick={() => setShowVoice(true)}
    title="Voice Share"
    style={{
        width: '30px', height: '30px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        background: 'transparent',
        color: 'var(--muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        transition: 'all 0.15s ease',
    }}
    onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#004ccd'
        e.currentTarget.style.color = '#004ccd'
    }}
    onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--muted)'
    }}
>
    🎙
</button>
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                textDecoration: "none",
                transition: "all 0.15s ease",
                color: isActive ? "var(--accent)" : "var(--muted)",
                background: isActive ? "var(--accent-dim)" : "transparent",
              })}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div
          style={{
            padding: "12px 10px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {/* Avatar + name row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: "var(--accent)",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {initials}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.username || "—"}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.email || "—"}
              </p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "9px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              color: "var(--muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f87171";
              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Icons.Logout />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "var(--bg)",
        }}
      >
        <Outlet />
      </main>

      {showVoice && <VoiceShare onClose={() => setShowVoice(false)} />}
    </div>
  );
}
