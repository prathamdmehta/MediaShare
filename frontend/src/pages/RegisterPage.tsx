// src/pages/RegisterPage.tsx

import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

interface PasswordRule {
  label: string;
  test: (v: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "At least one uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "At least one lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "At least one number", test: (v) => /\d/.test(v) },
  {
    label: "At least one special character",
    test: (v) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;`~]/.test(v),
  },
];

function getPasswordStrength(password: string): "weak" | "fair" | "strong" {
  const passed = passwordRules.filter((r) => r.test(password)).length;
  if (passed <= 2) return "weak";
  if (passed <= 4) return "fair";
  return "strong";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false); // ← add this

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const allRulesPassed = passwordRules.every((r) => r.test(form.password));
  const strength = form.password ? getPasswordStrength(form.password) : null;

  const strengthColor = {
    weak: "#f87171",
    fair: "#f59e0b",
    strong: "#34d399",
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRulesPassed) {
      setError("Please meet all password requirements");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authApi.register(form);
      setAuth(res.data.user, res.data.access_token);
      navigate("/inbox");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Registration failed");
      } else {
        setError(detail || "Registration failed");
      }
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
            Create account
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Start sharing files privately
          </p>
        </div>

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
              label="Username"
              placeholder="john_doe"
              value={form.username}
              onChange={update("username")}
              required
              autoFocus
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
              required
            />

            {/* Password field with live validation */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <Input
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={update("password")}
                onFocus={() => setShowRules(true)}
                required
              />

              {/* Strength bar */}
              {form.password && (
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
                      background: strength
                        ? strengthColor[strength]
                        : "var(--border)",
                      width:
                        strength === "weak"
                          ? "33%"
                          : strength === "fair"
                            ? "66%"
                            : "100%",
                      transition: "all 0.3s ease",
                    }}
                  />
                </div>
              )}

              {/* Password rules — shown on focus or when typing */}
              {showRules && form.password && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {passwordRules.map((rule, i) => {
                    const passed = rule.test(form.password);
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: passed ? "#34d399" : "var(--muted)",
                            transition: "color 0.2s ease",
                            flexShrink: 0,
                          }}
                        >
                          {passed ? "✓" : "○"}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: passed ? "#34d399" : "var(--muted)",
                            transition: "color 0.2s ease",
                          }}
                        >
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
              disabled={!allRulesPassed}
              size="lg"
              className="mt-2 min-h-[45px] rounded-xl text-[15px] font-semibold"
            >
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--muted)] mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
