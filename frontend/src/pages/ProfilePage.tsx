// src/pages/ProfilePage.tsx

import { useState, useEffect } from "react";
import { usersApi } from "../api/users";
import { useAuthStore } from "../store/authStore";
import type { Profile } from "../types/profile";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<{ username: string }[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
  });

  useEffect(() => {
    usersApi
      .getMyProfile()
      .then((res) => {
        setProfile(res.data);
        setForm({
          display_name: res.data.display_name || "",
          bio: res.data.bio || "",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    usersApi
      .getBlockedUsers()
      .then((res) => setBlockedUsers(res.data))
      .catch(console.error)
      .finally(() => setLoadingBlocked(false));
  }, []);

  const handleUnblock = async (username: string) => {
    try {
      await usersApi.unblock(username);
      setBlockedUsers((prev) => prev.filter((u) => u.username !== username));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await usersApi.updateProfile({
        display_name: form.display_name || undefined,
        bio: form.bio || undefined,
      });
      setProfile(res.data);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || "MS";
  const quotaPercent = profile
    ? Math.round(
        (profile.storage_used_bytes / profile.storage_quota_bytes) * 100,
      )
    : 0;

  if (loading) {
    return (
      <div style={{ padding: "32px" }}>
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            height: "300px",
            borderRadius: "16px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "560px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "4px",
          }}
        >
          Profile
        </h1>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>
          Your account information
        </p>
      </div>

      {/* Profile card */}
      <div
        style={{
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          marginBottom: "16px",
        }}
      >
        {/* Avatar + username */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            paddingBottom: "24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--accent-dim)",
              border: "2px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "2px",
              }}
            >
              {user?.username}
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted)" }}>
              {user?.email}
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: "4px",
                fontSize: "11px",
                color: "var(--accent)",
                background: "var(--accent-dim)",
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Editable fields */}
        {editing ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Input
              label="Display name"
              placeholder="Your name"
              value={form.display_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, display_name: e.target.value }))
              }
              maxLength={60}
            />
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Bio
              </label>
              <textarea
                placeholder="Tell people a little about yourself"
                value={form.bio}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bio: e.target.value }))
                }
                maxLength={500}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  textAlign: "right",
                }}
              >
                {form.bio.length}/500
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button onClick={handleSave} loading={saving} size="sm">
                Save changes
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                Display name
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: profile?.display_name ? "var(--text)" : "var(--muted)",
                }}
              >
                {profile?.display_name || "Not set"}
              </p>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                Bio
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: profile?.bio ? "var(--text)" : "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                {profile?.bio || "Not set"}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          </div>
        )}
      </div>

      {/* Storage card */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            Storage
          </p>
          <p style={{ fontSize: "12px", color: "var(--muted)" }}>
            {formatBytes(profile?.storage_used_bytes || 0)} of{" "}
            {formatBytes(profile?.storage_quota_bytes || 0)}
          </p>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "6px",
            borderRadius: "3px",
            background: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "3px",
              background:
                quotaPercent > 80
                  ? "#f87171"
                  : quotaPercent > 60
                    ? "#f59e0b"
                    : "var(--accent)",
              width: `${quotaPercent}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        <p
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            marginTop: "8px",
          }}
        >
          {quotaPercent}% used
        </p>
      </div>

      {/* Blocked users card */}
      <div
        style={{
          marginTop: "16px",
          padding: "20px 24px",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text)",
            marginBottom: "16px",
          }}
        >
          Blocked users
        </p>

        {loadingBlocked ? (
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>Loading...</p>
        ) : blockedUsers.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>
            You haven't blocked anyone.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {blockedUsers.map((u) => (
              <div
                key={u.username}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(239,68,68,0.15)",
                  background: "rgba(239,68,68,0.04)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#f87171",
                    }}
                  >
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text)" }}>
                    {u.username}
                  </span>
                </div>
                <button
                  onClick={() => handleUnblock(u.username)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "transparent",
                    color: "#f87171",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved toast */}
      {saved && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 20px",
            borderRadius: "10px",
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.3)",
            color: "#34d399",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          ✓ Profile saved
        </div>
      )}
    </div>
  );
}
