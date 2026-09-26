import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import Toolkit from "./pages/Toolkit.jsx";
import Journal from "./pages/Journal.jsx";
import Upgrade from "./pages/Upgrade.jsx";
import Analytics from "./pages/Analytics.jsx";
import Support from "./pages/Support.jsx";
import Resources from "./pages/Resources.jsx";
import ShareCard from "./pages/ShareCard.jsx";
import ProviderDirectory from "./pages/ProviderDirectory.jsx";
import ProviderApply from "./pages/ProviderApply.jsx";
import Inbox from "./pages/Inbox.jsx";
import Thread from "./pages/Thread.jsx";
import InstitutionApply from "./pages/InstitutionApply.jsx";
import JoinInstitution from "./pages/JoinInstitution.jsx";
import InstitutionDashboard from "./pages/InstitutionDashboard.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import NavBar from "./components/NavBar.jsx";
import BottomNav from "./components/BottomNav.jsx";
import CrisisButton from "./components/CrisisButton.jsx";
import { api } from "./api.js";
import { getAdminSecret, clearAdminSecret } from "./adminApi.js";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("quitapp_token"));
  const [onboarded, setOnboarded] = useState(null); // null = unknown/loading
  const [checking, setChecking] = useState(true);
  const [adminLoggedIn, setAdminLoggedIn] = useState(() => Boolean(getAdminSecret()));
  const [reminderPrefs, setReminderPrefs] = useState(null); // { reminderOptIn, reminderTime }

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    api.getMe()
      .then((u) => {
        setOnboarded(Boolean(u.onboarded));
        setReminderPrefs({ reminderOptIn: Boolean(u.reminderOptIn), reminderTime: u.reminderTime || "19:00" });
      })
      .catch(() => { localStorage.removeItem("quitapp_token"); setToken(null); })
      .finally(() => setChecking(false));
  }, [token]);

  // Best-effort daily reminder: checked once a minute while the app is open
  // in this browser tab. This is NOT a real push notification (that needs a
  // service worker + a server-side push infrastructure we haven't built) —
  // see the README note. It fires a browser Notification if: reminders are
  // on, permission was granted, the clock has reached the chosen time, the
  // person hasn't already been reminded today, and they haven't checked in yet.
  useEffect(() => {
    if (!token || !onboarded || !reminderPrefs?.reminderOptIn) return;
    if (typeof Notification === "undefined") return;

    const interval = setInterval(async () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (hhmm !== reminderPrefs.reminderTime) return;

      const todayKey = now.toDateString();
      if (localStorage.getItem("quitapp_last_reminder_date") === todayKey) return;

      try {
        const checkins = await api.getCheckins();
        const already = checkins.some((c) => new Date(c.date).toDateString() === todayKey);
        if (!already) {
          new Notification("ClearDay", { body: "Haven't checked in today — take a minute for yourself.", icon: "/logo.svg" });
        }
        localStorage.setItem("quitapp_last_reminder_date", todayKey);
      } catch {
        // silent — reminders are a nice-to-have, never worth surfacing an error for
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [token, onboarded, reminderPrefs]);

  function handleLoggedIn(res) {
    setToken(res.token);
    setOnboarded(res.onboarded);
  }

  function handleProfileComplete() {
    setOnboarded(true);
  }

  function handleLogout() {
    localStorage.removeItem("quitapp_token");
    localStorage.removeItem("quitapp_user_id");
    setToken(null);
    setOnboarded(null);
  }

  function handleAdminLogout() {
    clearAdminSecret();
    setAdminLoggedIn(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {token && onboarded && <NavBar onLogout={handleLogout} />}
      <main className="flex-1 pb-20 sm:pb-0">
        {checking ? (
          <p className="text-center text-faint py-16">Loading...</p>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                !token ? (
                  <Login onLoggedIn={handleLoggedIn} />
                ) : !onboarded ? (
                  <Onboarding onProfileComplete={handleProfileComplete} />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />
            <Route
              path="/dashboard"
              element={token && onboarded ? <Dashboard reminderPrefs={reminderPrefs} onReminderPrefsChange={setReminderPrefs} /> : <Navigate to="/" />}
            />
            <Route
              path="/checkin"
              element={token && onboarded ? <CheckIn /> : <Navigate to="/" />}
            />
            <Route
              path="/toolkit"
              element={token && onboarded ? <Toolkit /> : <Navigate to="/" />}
            />
            <Route
              path="/journal"
              element={token && onboarded ? <Journal /> : <Navigate to="/" />}
            />
            <Route
              path="/upgrade"
              element={token && onboarded ? <Upgrade /> : <Navigate to="/" />}
            />
            <Route
              path="/analytics"
              element={token && onboarded ? <Analytics /> : <Navigate to="/" />}
            />
            <Route path="/support" element={token && onboarded ? <Support /> : <Navigate to="/" />} />
            <Route path="/support/directory" element={token && onboarded ? <ProviderDirectory /> : <Navigate to="/" />} />
            <Route path="/support/apply-provider" element={token && onboarded ? <ProviderApply /> : <Navigate to="/" />} />
            <Route path="/support/inbox" element={token && onboarded ? <Inbox /> : <Navigate to="/" />} />
            <Route path="/support/thread/:otherId" element={token && onboarded ? <Thread /> : <Navigate to="/" />} />
            <Route path="/support/register-institution" element={token && onboarded ? <InstitutionApply /> : <Navigate to="/" />} />
            <Route path="/support/join-institution" element={token && onboarded ? <JoinInstitution /> : <Navigate to="/" />} />
            <Route path="/support/institution-dashboard" element={token && onboarded ? <InstitutionDashboard /> : <Navigate to="/" />} />
            <Route path="/resources" element={token && onboarded ? <Resources /> : <Navigate to="/" />} />
            <Route path="/share" element={token && onboarded ? <ShareCard /> : <Navigate to="/" />} />
            <Route
              path="/admin/login"
              element={adminLoggedIn ? <Navigate to="/admin" /> : <AdminLogin onLoggedIn={() => setAdminLoggedIn(true)} />}
            />
            <Route
              path="/admin"
              element={adminLoggedIn ? <AdminDashboard onLogout={handleAdminLogout} /> : <Navigate to="/admin/login" />}
            />
          </Routes>
        )}
      </main>
      <CrisisButton />
      {token && onboarded && <BottomNav />}
    </div>
  );
}
