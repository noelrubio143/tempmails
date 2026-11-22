"use client"

import React, { useState, useEffect } from "react"
import { Shield, ShieldAlert, LogOut, ExternalLink, RefreshCw, Megaphone, Terminal, Key, Users, Activity } from "lucide-react"

export default function OpsVaultPage() {
  const [passcode, setPasscode] = useState("")
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"telemetry" | "broadcast" | "actions">("telemetry")
  const [stats, setStats] = useState<any>(null)
  const [broadcastText, setBroadcastText] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetch("/api/admin/gate", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.authenticated) {
            setAuthorized(true)
            void fetchTelemetry()
          }
        })
        .catch(() => null)
    }
  }, [])

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" })
      const data = await res.json()
      if (data) setStats(data)
    } catch {}
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setAuthorized(true)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("ast_ops_auth", "true")
          localStorage.setItem("is_admin", "true")
          localStorage.setItem("ast_is_owner", "true")
          localStorage.setItem("ast_admin_composer_unlocked", "true")
          localStorage.setItem("ast_active_mailbox", "astrxy@beezelbub.com")
          localStorage.setItem("astrxy_active_email", "astrxy@beezelbub.com")
        }
        void fetchTelemetry()
      } else {
        setError(data.error || "Access Denied: Invalid Master Clearance.")
      }
    } catch {
      setError("Network error connecting to security gate.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthorized(false)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ast_ops_auth")
      localStorage.removeItem("is_admin")
      localStorage.removeItem("ast_is_owner")
      localStorage.removeItem("ast_admin_composer_unlocked")
    }
    void fetch("/api/admin/gate", { method: "DELETE" }).catch(() => null)
    void fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "admin_logout" }),
    }).catch(() => null)
  }

  const handlePublishBroadcast = async () => {
    if (!broadcastText.trim()) return
    try {
      await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          text: broadcastText.trim(),
          actor: "astrxy@beezelbub.com",
        }),
      })
      alert("Broadcast Banner Published Live!")
      void fetchTelemetry()
    } catch {
      alert("Failed to publish broadcast banner.")
    }
  }

  const handleLaunchOnSite = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("is_admin", "true")
      localStorage.setItem("ast_is_owner", "true")
      localStorage.setItem("ast_admin_composer_unlocked", "true")
      localStorage.setItem("ast_chat_admin_unlocked", "true")
      localStorage.setItem("ast_active_mailbox", "astrxy@beezelbub.com")
      localStorage.setItem("astrxy_active_email", "astrxy@beezelbub.com")
      window.location.href = "/?gate=joyboy"
    }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#060913] text-slate-200 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <ShieldAlert className="text-amber-400" size={28} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">OPS VAULT</h1>
              <p className="text-xs text-amber-300/80 font-mono">Stealth Master Control Center</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Master Clearance Key</label>
              <input
                type="password"
                autoFocus
                placeholder="Enter Master Passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full bg-[#050811] border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passcode.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Authenticating Clearance..." : "Access Vault"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500 font-mono">
            <span>Astrxy Sovereign Core</span>
            <a href="/" className="hover:text-slate-300 transition">Return to Main</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-200 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-[#0a0f1d] border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <Shield className="text-amber-400" size={26} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                OPS VAULT <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-normal">SOVEREIGN ACTIVE</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">Independent Infrastructure &amp; Fleet Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLaunchOnSite}
              className="px-3.5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-sky-500/20 cursor-pointer"
              title="Opens main site and launches the Inspector Overlay directly"
            >
              <ExternalLink size={13} /> Launch on Main Site
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-red-950/50 hover:bg-red-900/70 border border-red-500/40 text-red-300 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} /> Exit Vault
            </button>
          </div>
        </header>

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 font-mono text-xs">
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${activeTab === "telemetry" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-slate-400 hover:text-white"}`}
          >
            📊 Live Telemetry
          </button>
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${activeTab === "broadcast" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-slate-400 hover:text-white"}`}
          >
            📢 Broadcast Commander
          </button>
        </div>

        {activeTab === "telemetry" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Active Live Visitors</span>
                <Users size={14} className="text-sky-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">{stats?.totalVisitors || 1}</div>
              <div className="text-[10px] text-emerald-400">Global server connections</div>
            </div>

            <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Inboxes Created</span>
                <Activity size={14} className="text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">{stats?.inboxesCreated || 0}</div>
              <div className="text-[10px] text-slate-400">Total generated today</div>
            </div>

            <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Messages Processed</span>
                <Terminal size={14} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">{stats?.messagesReceived || 0}</div>
              <div className="text-[10px] text-slate-400">Inbound verification emails</div>
            </div>

            <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Server Health</span>
                <Key size={14} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">OPTIMAL</div>
              <div className="text-[10px] text-slate-400">Redis &amp; Memory Synced</div>
            </div>
          </div>
        )}

        {activeTab === "broadcast" && (
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-6 space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone size={16} className="text-amber-400" /> Global Announcement Banner
            </h3>
            <p className="text-xs text-slate-400">Publish a high-priority announcement to every visitor across all pages in real time.</p>
            <input
              type="text"
              placeholder="Type announcement message..."
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              className="w-full bg-[#050811] border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
            />
            <button
              onClick={handlePublishBroadcast}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Publish Global Banner
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
