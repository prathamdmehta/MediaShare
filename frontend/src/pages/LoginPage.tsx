// src/pages/LoginPage.tsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  // Controlled form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // prevent browser from reloading the page
    setError("");
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      const token = res.data.access_token;

      // Get user info with the new token
      // Temporarily set token for the /me call
      localStorage.setItem("access_token", token);
      const meRes = await authApi.me();

      setAuth(meRes.data, token);
      navigate("/inbox");
    } catch (err: any) {
      const message = err.response?.data?.detail || "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1a1830 0%, var(--bg) 60%)",
      }}
    >
      {/* Logo / Brand */}
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-[var(--text)] font-semibold text-lg tracking-tight">
              MediaShare
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text)] mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--muted)]">Sign in to your account</p>
        </div>

        {/* Card */}
        {/* Card — make border more visible */}
        <div
          style={{
            padding: "28px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div
                style={{
                  fontSize: "13px",
                  color: "#f87171",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              className="mt-2 min-h-[45px] rounded-xl text-[15px] font-semibold"
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-[var(--accent)] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
