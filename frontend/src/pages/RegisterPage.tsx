// src/pages/RegisterPage.tsx

import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";

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

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const allRulesPassed = passwordRules.every((r) => r.test(form.password));
  const strength = form.password ? getPasswordStrength(form.password) : null;
  const strengthColor = { weak: "#ba1a1a", fair: "#9e3100", strong: "#006a61" };
  const strengthWidth = { weak: "33%", fair: "66%", strong: "100%" };

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
      setError(
        Array.isArray(detail)
          ? detail[0]?.msg
          : detail || "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px 11px 44px",
    background: "#faf8ff",
    border: "1px solid #c3c6d8",
    borderRadius: "8px",
    fontSize: "15px",
    color: "#131b2e",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "all 0.2s ease",
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: "#faf8ff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 0,
          width: "600px",
          height: "600px",
          background: "rgba(180,197,255,0.3)",
          borderRadius: "50%",
          filter: "blur(120px)",
          transform: "translate(25%, -50%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          zIndex: 0,
          width: "500px",
          height: "500px",
          background: "rgba(107,216,203,0.3)",
          borderRadius: "50%",
          filter: "blur(100px)",
          transform: "translate(-25%, 50%)",
          pointerEvents: "none",
        }}
      />

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ width: "100%", maxWidth: "480px" }}>
          {/* Brand anchor */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "28px",
              gap: "6px",
            }}
          >
            <Link
              to="/"
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#004ccd",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              📁 MediaShare
            </Link>
            <p
              style={{
                fontSize: "14px",
                color: "#424656",
                margin: 0,
              }}
            >
              Secure professional asset sharing
            </p>
          </div>

          {/* Card */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "36px 40px",
              boxShadow: "0px 4px 20px rgba(15,23,42,0.05)",
              border: "1px solid rgba(195,198,216,0.3)",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  color: "#131b2e",
                  letterSpacing: "-0.02em",
                  margin: "0 0 10px",
                }}
              >
                Create Account
              </h2>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  background: "rgba(134,242,228,0.2)",
                  borderRadius: "999px",
                }}
              >
                <span style={{ fontSize: "12px" }}>🛡️</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#006a61",
                  }}
                >
                  End-to-end encrypted account creation
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Username */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#424656",
                  }}
                >
                  Username
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#737687",
                      fontSize: "16px",
                      pointerEvents: "none",
                    }}
                  >
                    👤
                  </span>
                  <input
                    type="text"
                    placeholder="john_doe"
                    value={form.username}
                    onChange={update("username")}
                    required
                    autoFocus
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#004ccd";
                      e.target.style.boxShadow = "0 0 0 4px rgba(0,76,205,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#c3c6d8";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#424656",
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#737687",
                      fontSize: "16px",
                      pointerEvents: "none",
                    }}
                  >
                    ✉
                  </span>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={update("email")}
                    required
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#004ccd";
                      e.target.style.boxShadow = "0 0 0 4px rgba(0,76,205,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#c3c6d8";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#424656",
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#737687",
                      fontSize: "16px",
                      pointerEvents: "none",
                    }}
                  >
                    🔒
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={update("password")}
                    onFocus={(e) => {
                      setShowRules(true);
                      e.target.style.borderColor = "#004ccd";
                      e.target.style.boxShadow = "0 0 0 4px rgba(0,76,205,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#c3c6d8";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#737687",
                      fontSize: "15px",
                    }}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>

                {/* Strength bar */}
                {form.password && (
                  <div
                    style={{
                      height: "3px",
                      background: "#eaedff",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: strength
                          ? strengthColor[strength]
                          : "#eaedff",
                        width: strength ? strengthWidth[strength] : "0%",
                        transition: "all 0.3s ease",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                )}

                {/* Rules */}
                {showRules && form.password && (
                  <div
                    style={{
                      padding: "12px",
                      background: "#faf8ff",
                      border: "1px solid #e2e7ff",
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
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
                              color: passed ? "#006a61" : "#737687",
                              transition: "color 0.2s ease",
                              fontWeight: 600,
                            }}
                          >
                            {passed ? "✓" : "○"}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: passed ? "#006a61" : "#737687",
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

                <p style={{ fontSize: "12px", color: "#737687", margin: 0 }}>
                  Must be at least 8 characters with uppercase, number and
                  special character.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(186,26,26,0.06)",
                    border: "1px solid rgba(186,26,26,0.2)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#ba1a1a",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!allRulesPassed || loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  background:
                    !allRulesPassed || loading ? "#b4c5ff" : "#004ccd",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor:
                    !allRulesPassed || loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "4px",
                  boxShadow: "0 2px 8px rgba(0,76,205,0.15)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (allRulesPassed && !loading)
                    e.currentTarget.style.background = "#0f62fe";
                }}
                onMouseLeave={(e) => {
                  if (allRulesPassed && !loading)
                    e.currentTarget.style.background = "#004ccd";
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Creating account...
                  </>
                ) : (
                  <>Create Account →</>
                )}
              </button>
            </form>

            {/* Sign in link */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "24px",
                borderTop: "1px solid rgba(195,198,216,0.3)",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "14px", color: "#424656", margin: 0 }}>
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{
                    color: "#004ccd",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          {/* Security badges */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              marginTop: "16px",
            }}
          >
            {["🔒 AES-256 Storage", "🛡️ SOC2 Compliant"].map((badge) => (
              <span
                key={badge}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#737687",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "24px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p style={{ fontSize: "13px", color: "#737687", margin: 0 }}>
          © 2026 MediaShare. All rights reserved.
        </p>
        <div style={{ display: "flex", gap: "24px" }}>
          {["Privacy Policy", "Terms of Service", "Contact"].map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontSize: "13px",
                color: "#737687",
                textDecoration: "none",
              }}
            >
              {link}
            </a>
          ))}
        </div>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
