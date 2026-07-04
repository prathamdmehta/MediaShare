// src/pages/SearchPage.tsx

import { useState, useEffect } from "react";
import { usersApi } from "../api/users";
import { mediaApi } from "../api/media";
import { sharesApi } from "../api/shares";
import type { SearchResult } from "../types/profile";
import type { MediaFile } from "../types/media";
import Button from "../components/ui/Button";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── Send Modal ──────────────────────────────────────────────────────

function SendModal({
  recipient,
  onClose,
  onBlock,
}: {
  recipient: SearchResult;
  onClose: () => void;
  onBlock: () => void; // ← callback to parent
}) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    mediaApi
      .list()
      .then((res) =>
        setFiles(res.data.filter((f) => f.processing_status === "ready")),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleFile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 20) next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    setError("");
    try {
      await sharesApi.send({
        media_file_ids: Array.from(selectedIds),
        recipient_usernames: [recipient.username],
        message: message.trim() || undefined,
      });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleBlockFromModal = async () => {
    try {
      await usersApi.block(recipient.username);
      onBlock(); // tell parent to remove from results + close modal
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
              }}
            >
              {recipient.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                Send to {recipient.username}
              </p>
              {recipient.display_name && (
                <p style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {recipient.display_name}
                </p>
              )}
            </div>
          </div>

          {/* Header right — block + close */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleBlockFromModal}
              title="Block this user"
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                border: "1px solid rgba(239,68,68,0.3)",
                background: "transparent",
                color: "#f87171",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Block
            </button>
            <button
              onClick={onClose}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {sent ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>✓</div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#34d399",
                marginBottom: "6px",
              }}
            >
              Sent successfully
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "24px",
              }}
            >
              {selectedIds.size} file{selectedIds.size > 1 ? "s" : ""} sent to{" "}
              {recipient.username}
            </p>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loading ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: "13px",
                  }}
                >
                  Loading your files...
                </div>
              ) : files.length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--muted)",
                    fontSize: "13px",
                  }}
                >
                  No ready files yet.{" "}
                  <a href="/upload" style={{ color: "var(--accent)" }}>
                    Upload some first
                  </a>
                </div>
              ) : (
                files.map((file) => {
                  const selected = selectedIds.has(file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleFile(file.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 24px",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        background: selected
                          ? "rgba(108,99,255,0.08)"
                          : "transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "5px",
                          border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                          background: selected
                            ? "var(--accent)"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {selected && (
                          <span
                            style={{
                              color: "white",
                              fontSize: "11px",
                              lineHeight: 1,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {file.thumbnail_url ? (
                          <img
                            src={file.thumbnail_url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "18px" }}>
                            {file.file_type === "image"
                              ? "🖼"
                              : file.file_type === "video"
                                ? "🎬"
                                : file.file_type === "pdf"
                                  ? "📄"
                                  : "📎"}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
                          {file.original_name}
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            marginTop: "2px",
                          }}
                        >
                          {formatBytes(file.size_bytes)} · {file.file_type}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <input
                placeholder="Add a message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              {error && (
                <p style={{ fontSize: "12px", color: "#f87171" }}>{error}</p>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {selectedIds.size} of 20 selected
                </span>
                <Button
                  onClick={handleSend}
                  loading={sending}
                  disabled={selectedIds.size === 0}
                  size="sm"
                >
                  Send files →
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Search Page ────────────────────────────────────────────────

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadBlockedUsers = async () => {
      try {
        const res = await usersApi.getBlockedUsers();
        setBlockedUsers(new Set(res.data.map((user) => user.username)));
      } catch (err) {
        console.error("Failed to load blocked users", err);
      }
    };

    loadBlockedUsers();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      try {
        const res = await usersApi.search(query.trim());
        setResults(res.data.results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Block from search results list
  const handleBlock = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    try {
      if (blockedUsers.has(username)) {
        await usersApi.unblock(username);
        setBlockedUsers((prev) => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      } else {
        await usersApi.block(username);
        setBlockedUsers((prev) => new Set([...prev, username]));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Block from inside the send modal
  const handleBlockFromModal = (username: string) => {
    setBlockedUsers((prev) => new Set([...prev, username]));
    setSelectedUser(null);
  };

  return (
    <div style={{ padding: "32px", maxWidth: "600px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "4px",
          }}
        >
          Find people
        </h1>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          Search by username to send files
        </p>
      </div>

      <div style={{ position: "relative", marginBottom: "24px" }}>
        <div
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--muted)",
            pointerEvents: "none",
            fontSize: "16px",
          }}
        >
          {searching ? (
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          ) : (
            "🔍"
          )}
        </div>
        <input
          autoFocus
          placeholder="Search username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 12px 12px 40px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            color: "var(--text)",
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {!hasSearched ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--muted)",
          }}
        >
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>👤</p>
          <p style={{ fontSize: "14px" }}>Type a username to find someone</p>
        </div>
      ) : results.length === 0 && !searching ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--muted)",
          }}
        >
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</p>
          <p style={{ fontSize: "14px" }}>No users found for "{query}"</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {results.map((user) => {
            const isBlocked = blockedUsers.has(user.username);

            return (
              <div
                key={user.username}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: `1px solid ${isBlocked ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                  background: isBlocked
                    ? "rgba(239,68,68,0.04)"
                    : "var(--surface)",
                  cursor: isBlocked ? "default" : "pointer",
                  transition: "all 0.15s ease",
                  opacity: isBlocked ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (isBlocked) return;
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "rgba(108,99,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (isBlocked) return;
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--surface)";
                }}
                onClick={() => !isBlocked && setSelectedUser(user)}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: isBlocked
                      ? "rgba(239,68,68,0.1)"
                      : "var(--accent-dim)",
                    border: `1px solid ${isBlocked ? "rgba(239,68,68,0.3)" : "var(--accent)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: isBlocked ? "#f87171" : "var(--accent)",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {user.username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--text)",
                      }}
                    >
                      {user.username}
                    </p>
                    {isBlocked && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#f87171",
                          padding: "1px 6px",
                          borderRadius: "10px",
                          border: "1px solid rgba(239,68,68,0.3)",
                          background: "rgba(239,68,68,0.08)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Blocked
                      </span>
                    )}
                  </div>

                  {user.display_name && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--muted)",
                        marginTop: "1px",
                      }}
                    >
                      {user.display_name}
                    </p>
                  )}
                </div>

                {/* Action — Send files OR Unblock */}
                {isBlocked ? (
                  <button
                    onClick={(e) => handleBlock(e, user.username)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(239,68,68,0.3)",
                      background: "transparent",
                      color: "#f87171",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Unblock
                  </button>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--accent)",
                        fontWeight: 500,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--accent-dim)",
                        background: "var(--accent-dim)",
                        flexShrink: 0,
                      }}
                    >
                      Send files
                    </span>

                    <button
                      onClick={(e) => handleBlock(e, user.username)}
                      title="Block user"
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(239,68,68,0.4)";
                        e.currentTarget.style.background =
                          "rgba(239,68,68,0.08)";
                        e.currentTarget.style.color = "#f87171";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--muted)";
                      }}
                    >
                      🚫
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {selectedUser && (
        <SendModal
          recipient={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBlock={() => handleBlockFromModal(selectedUser.username)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
