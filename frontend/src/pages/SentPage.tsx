// src/pages/SentPage.tsx

import { useState, useEffect } from "react";
import { sharesApi } from "../api/shares";
import type { SentItem } from "../types/shares";

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

function SentCard({ item }: { item: SentItem }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        background: "transparent",
        marginBottom: "8px",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--muted)";
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          flexShrink: 0,
        }}
      >
        {item.share_type === "media" ? "📸" : "📄"}
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
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            {item.file_count} {item.file_count === 1 ? "file" : "files"}
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
            {item.share_type}
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          {formatBytes(item.total_size_bytes)}
          {" · "}
          {item.recipient_count} recipient{item.recipient_count > 1 ? "s" : ""}
          {item.message && ` · "${item.message}"`}
        </p>
      </div>

      {/* Time */}
      <span
        style={{
          fontSize: "12px",
          color: "var(--muted)",
          flexShrink: 0,
        }}
      >
        {timeAgo(item.created_at)}
      </span>
    </div>
  );
}

export default function SentPage() {
  const [items, setItems] = useState<SentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sharesApi
      .sent()
      .then((res) => setItems(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "32px", maxWidth: "720px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "4px",
          }}
        >
          Sent
        </h1>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          Files you've shared with others
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
            📤
          </div>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: "6px",
            }}
          >
            Nothing sent yet
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>
            Search for a user and send them files.
          </p>
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <SentCard key={item.cluster_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
