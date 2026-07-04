// src/pages/UploadPage.tsx

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { mediaApi } from "../api/media";
import type { MediaFile } from "../types/media";
import Button from "../components/ui/Button";

// ── Constants ──────────────────────────────────────────────────────

const MAX_VIDEO_DURATION = 300; // 5 minutes in seconds

const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "application/pdf": "pdf",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "document",
};

const MAX_SIZES: Record<string, number> = {
  image: 20 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  document: 50 * 1024 * 1024,
};

// ── Helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(0);
  });
}

// ── Upload state type ──────────────────────────────────────────────

interface UploadState {
  file: File;
  status: "validating" | "uploading" | "processing" | "ready" | "error";
  progress: number;
  error?: string;
  result?: MediaFile;
}

// ── File type icon ─────────────────────────────────────────────────

function FileIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    image: "🖼",
    video: "🎬",
    pdf: "📄",
    document: "📎",
  };
  return <span style={{ fontSize: "24px" }}>{icons[type] || "📎"}</span>;
}

// ── Single upload row ──────────────────────────────────────────────

function UploadRow({ state }: { state: UploadState }) {
  const fileType = ACCEPTED_TYPES[state.file.type] || "document";

  const statusLabel: Record<UploadState["status"], string> = {
    validating: "Checking...",
    uploading: `${state.progress}%`,
    processing: "Processing...",
    ready: "Ready",
    error: state.error || "Failed",
  };

  const statusColor: Record<UploadState["status"], string> = {
    validating: "var(--muted)",
    uploading: "var(--accent)",
    processing: "#f59e0b",
    ready: "#34d399",
    error: "#f87171",
  };

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <FileIcon type={fileType} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "280px",
            }}
          >
            {state.file.name}
          </p>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: statusColor[state.status],
              flexShrink: 0,
              marginLeft: "12px",
            }}
          >
            {statusLabel[state.status]}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "3px",
            borderRadius: "2px",
            background: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "2px",
              background: statusColor[state.status],
              width:
                state.status === "ready"
                  ? "100%"
                  : state.status === "uploading"
                    ? `${state.progress}%`
                    : state.status === "processing"
                      ? "85%"
                      : state.status === "error"
                        ? "100%"
                        : "5%",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <p
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            marginTop: "4px",
          }}
        >
          {formatBytes(state.file.size)}
          {state.status === "ready" && state.result && (
            <span style={{ color: "#34d399" }}> · Uploaded successfully</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Main Upload Page ────────────────────────────────────────────────

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateUpload = (index: number, patch: Partial<UploadState>) => {
    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, ...patch } : u)),
    );
  };

  const processFile = async (file: File, index: number) => {
    const fileType = ACCEPTED_TYPES[file.type];

    // ── Validate type ──────────────────────────────────────────
    if (!fileType) {
      updateUpload(index, {
        status: "error",
        error: "File type not supported",
      });
      return;
    }

    // ── Validate size ──────────────────────────────────────────
    const maxSize = MAX_SIZES[fileType];
    if (file.size > maxSize) {
      updateUpload(index, {
        status: "error",
        error: `Too large — max ${formatBytes(maxSize)}`,
      });
      return;
    }

    // ── Validate video duration ────────────────────────────────
    if (fileType === "video") {
      const duration = await getVideoDuration(file);
      if (duration > MAX_VIDEO_DURATION) {
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        updateUpload(index, {
          status: "error",
          error: `Video is ${mins}m ${secs}s — max 5 minutes`,
        });
        return;
      }
    }

    try {
      // ── Step 1: Initiate ───────────────────────────────────
      updateUpload(index, { status: "uploading", progress: 0 });

      const initiateRes = await mediaApi.initiate({
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });

      const { upload_id, presigned_url, s3_key } = initiateRes.data;

      // ── Step 2: Upload to S3 via XHR (tracks progress) ────
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateUpload(index, { progress: pct });
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`S3 upload failed: ${xhr.status}`));
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));

        xhr.open("PUT", presigned_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // ── Step 3: Confirm ────────────────────────────────────
      updateUpload(index, { status: "processing", progress: 100 });

      const confirmRes = await mediaApi.confirm({ upload_id, s3_key });
      const mediaId = confirmRes.data.id;

      // ── Step 4: Poll until processing_status = 'ready' ────
      const pollInterval = setInterval(async () => {
        try {
          const fileRes = await mediaApi.get(mediaId);
          const status = fileRes.data.processing_status;

          if (status === "ready") {
            clearInterval(pollInterval);
            updateUpload(index, { status: "ready", result: fileRes.data });
          } else if (status === "rejected") {
            clearInterval(pollInterval);
            updateUpload(index, {
              status: "error",
              error: fileRes.data.rejection_reason || "File rejected",
            });
          } else if (status === "failed") {
            clearInterval(pollInterval);
            updateUpload(index, {
              status: "error",
              error: "Processing failed",
            });
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 2000);
    } catch (err: any) {
      updateUpload(index, {
        status: "error",
        error: err.message || "Upload failed",
      });
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newUploads: UploadState[] = Array.from(files).map((file) => ({
      file,
      status: "validating",
      progress: 0,
    }));

    setUploads((prev) => {
      const startIndex = prev.length;
      const updated = [...prev, ...newUploads];
      // Start processing each file
      newUploads.forEach((_, i) => {
        processFile(files[i], startIndex + i);
      });
      return updated;
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const readyFiles = uploads.filter((u) => u.status === "ready");

  return (
    <div style={{ padding: "32px", maxWidth: "640px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "4px",
          }}
        >
          Upload
        </h1>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          Images, videos, PDFs and documents up to 500MB
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "16px",
          padding: "48px 32px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          background: isDragging ? "rgba(108,99,255,0.06)" : "transparent",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: isDragging ? "var(--accent-dim)" : "var(--surface)",
            border: `1px solid ${isDragging ? "var(--accent)" : "var(--border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "22px",
            transition: "all 0.2s ease",
          }}
        >
          ↑
        </div>
        <p
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: isDragging ? "var(--accent)" : "var(--text)",
            marginBottom: "6px",
          }}
        >
          {isDragging ? "Drop to upload" : "Drop files here"}
        </p>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          or <span style={{ color: "var(--accent)" }}>browse files</span>
        </p>
        <p
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            marginTop: "12px",
            opacity: 0.7,
          }}
        >
          Videos: max 5 min · 500MB · Images: max 20MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={Object.keys(ACCEPTED_TYPES).join(",")}
          style={{ display: "none" }}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleFiles(e.target.files)
          }
        />
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {uploads.map((upload, i) => (
            <UploadRow key={i} state={upload} />
          ))}
        </div>
      )}

      {/* Ready files summary */}
      {readyFiles.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: "13px", color: "#34d399" }}>
            {readyFiles.length} file{readyFiles.length > 1 ? "s" : ""} ready to
            share
          </p>
          <Button size="sm" onClick={() => (window.location.href = "/search")}>
            Share now →
          </Button>
        </div>
      )}
    </div>
  );
}
