// src/pages/InboxPage.tsx

import { useState, useEffect } from "react";
import { sharesApi } from "../api/shares";
import type { InboxItem, ClusterDetail } from "../types/shares";

// ── Helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fileTypeIcon(fileType: string): string {
  if (fileType === "image") return "🖼";
  if (fileType === "video") return "🎬";
  if (fileType === "pdf") return "📄";
  return "📎";
}

async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    // Fetch the file as a blob
    const response = await fetch(url);
    const blob = await response.blob();

    // Create a temporary object URL from the blob
    const objectUrl = URL.createObjectURL(blob);

    // Create a hidden anchor and click it programmatically
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename; // this works because it's same-origin blob URL
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error("Download failed:", err);
  }
}

// ── Cluster Detail Modal ────────────────────────────────────────────

function ClusterModal({
  clusterId,
  onClose,
}: {
  clusterId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sharesApi
      .getCluster(clusterId)
      .then((res) => setDetail(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clusterId]);

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "24px",
      }}
    >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "560px",
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
          <div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "2px",
              }}
            >
              From {detail?.sender_username}
            </p>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {loading
                ? "Loading..."
                : `${detail?.file_count} ${detail?.share_type === "media" ? "files" : "document"}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Message */}
        {detail?.message && (
          <div
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--border)",
              fontSize: "13px",
              color: "var(--muted)",
              fontStyle: "italic",
            }}
          >
            "{detail.message}"
          </div>
        )}

        {/* Files list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              Loading files...
            </div>
          ) : (
            detail?.files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 24px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {/* Thumbnail or icon */}
                <div
                  style={{
                    width: "44px",
                    height: "44px",
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
                    <span style={{ fontSize: "20px" }}>
                      {fileTypeIcon(file.file_type)}
                    </span>
                  )}
                </div>

                {/* File info */}
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
                      fontSize: "12px",
                      color: "var(--muted)",
                      marginTop: "2px",
                    }}
                  >
                    {formatBytes(file.size_bytes)}
                    {file.duration_secs &&
                      ` · ${Math.floor(file.duration_secs / 60)}:${String(file.duration_secs % 60).padStart(2, "0")}`}
                  </p>
                </div>

                {/* Download button */}
                <button
                  onClick={() =>
                    downloadFile(file.download_url, file.original_name)
                  }
                  style={{
                    padding: "7px 14px",
                    borderRadius: "7px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--accent)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-dim)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  Download
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inbox Item Card ─────────────────────────────────────────────────

function InboxCard({
  item,
  onClick,
  onDelete,
}: {
  item: InboxItem;
  onClick: () => void;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        borderRadius: "12px",
        border: `1px solid var(--border)`,
        background: item.is_read ? "transparent" : "rgba(108,99,255,0.04)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        marginBottom: "8px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.background = "rgba(108,99,255,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = item.is_read
          ? "transparent"
          : "rgba(108,99,255,0.04)";
      }}
    >
      {/* Unread dot */}
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: item.is_read ? "transparent" : "var(--accent)",
          flexShrink: 0,
        }}
      />

      {/* Sender avatar */}
      <div
        style={{
          width: "38px",
          height: "38px",
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
          style={{ color: "var(--accent)", fontSize: "12px", fontWeight: 600 }}
        >
          {item.sender_username.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "3px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: item.is_read ? 400 : 600,
              color: "var(--text)",
            }}
          >
            {item.sender_username}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              padding: "1px 7px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}
          >
            {item.share_type === "media" ? "📸 Media" : "📄 Document"}
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          {item.file_count} {item.file_count === 1 ? "file" : "files"}
          {" · "}
          {formatBytes(item.total_size_bytes)}
          {item.message && ` · "${item.message}"`}
        </p>
      </div>

      {/* Time */}
      <span style={{ fontSize: "12px", color: "var(--muted)", flexShrink: 0 }}>
        {timeAgo(item.created_at)}
      </span>

      {/* Chevron */}
      <span style={{ color: "var(--border)", fontSize: "16px" }}>›</span>

      {/* Delete button */}
      <button
        onClick={onDelete}
        title="Remove from inbox"
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "6px",
          border: "1px solid transparent",
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
          e.currentTarget.style.color = "#f87171";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
          e.currentTarget.style.background = "rgba(239,68,68,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--muted)";
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.background = "transparent";
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Main Inbox Page ─────────────────────────────────────────────────

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  useEffect(() => {
    // useEffect runs after the component first renders
    // This is where we fetch data from the API
    sharesApi
      .inbox()
      .then((res) => setItems(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // empty [] = run once on mount, not on every render

  const handleDelete = async (e: React.MouseEvent, item: InboxItem) => {
    e.stopPropagation(); // prevent opening the cluster modal
    try {
      await sharesApi.deleteFromInbox(item.share_recipient_id);
      setItems((prev) =>
        prev.filter((i) => i.share_recipient_id !== item.share_recipient_id),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (item: InboxItem) => {
    setSelectedCluster(item.cluster_id);
    // Mark as read optimistically (update UI before server confirms)
    setItems((prev) =>
      prev.map((i) =>
        i.cluster_id === item.cluster_id ? { ...i, is_read: true } : i,
      ),
    );
    sharesApi.markRead(item.share_recipient_id).catch(console.error);
  };

  return (
    <div style={{ padding: "32px", maxWidth: "720px" }}>
      {/* Page header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "4px",
          }}
        >
          Inbox
        </h1>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          Files shared with you
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "72px",
                borderRadius: "12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                opacity: 1 - i * 0.2,
              }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
            }}
          >
            📭
          </div>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: "6px",
            }}
          >
            Nothing here yet
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>
            When someone shares files with you, they'll appear here.
          </p>
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <InboxCard
              key={item.share_recipient_id}
              item={item}
              onClick={() => handleOpen(item)}
              onDelete={(e) => handleDelete(e, item)}
            />
          ))}
        </div>
      )}

      {/* Cluster detail modal */}
      {selectedCluster && (
        <ClusterModal
          clusterId={selectedCluster}
          onClose={() => setSelectedCluster(null)}
        />
      )}
    </div>
  );
}
