import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Support() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.getMe().then(setUser).catch(() => {});
  }, []);

  if (!user) return <p className="max-w-md mx-auto px-4 py-12 text-faint">Loading...</p>;

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold text-ink mb-2">Support</h1>

      {/* Always available: browse verified providers */}
      <Link to="/support/directory" className="block bg-surface rounded-2xl shadow-sm border border-subtle p-5 hover:border-brand-300 transition">
        <p className="font-semibold text-ink">Find a support provider</p>
        <p className="text-sm text-muted mt-1">Browse verified counselors, chaplains, and coaches</p>
      </Link>

      {/* Provider status branches */}
      {user.isVerifiedProvider ? (
        <Link to="/support/inbox" className="block bg-surface rounded-2xl shadow-sm border border-subtle p-5 hover:border-brand-300 transition">
          <p className="font-semibold text-ink">Your inbox</p>
          <p className="text-sm text-muted mt-1">Messages from people you're supporting</p>
        </Link>
      ) : user.providerStatus === "pending" ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800">Provider application pending</p>
          <p className="text-sm text-amber-700 mt-1">We're reviewing your application to become a verified support provider.</p>
        </div>
      ) : (
        <Link to="/support/apply-provider" className="block bg-surface rounded-2xl shadow-sm border border-subtle p-5 hover:border-brand-300 transition">
          <p className="font-semibold text-ink">Become a support provider</p>
          <p className="text-sm text-muted mt-1">Counselors, chaplains, pastors, imams, peer coaches</p>
        </Link>
      )}

      {/* Institution status branches */}
      {user.institutionAdminOf ? (
        user.institutionAdminOf.status === "verified" ? (
          <Link to="/support/institution-dashboard" className="block bg-surface rounded-2xl shadow-sm border border-subtle p-5 hover:border-brand-300 transition">
            <p className="font-semibold text-ink">{user.institutionAdminOf.name} dashboard</p>
            <p className="text-sm text-muted mt-1">Aggregated, anonymized progress of your members</p>
          </Link>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="font-semibold text-amber-800">Institution application pending</p>
            <p className="text-sm text-amber-700 mt-1">{user.institutionAdminOf.name} is awaiting review.</p>
          </div>
        )
      ) : (
        <Link to="/support/register-institution" className="block bg-surface rounded-2xl shadow-sm border border-subtle p-5 hover:border-brand-300 transition">
          <p className="font-semibold text-ink">Register your institution</p>
          <p className="text-sm text-muted mt-1">Churches, mosques, NACADA centers, rehabs, employers, NGOs</p>
        </Link>
      )}

      {user.institutionId ? (
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5">
          <p className="font-semibold text-brand-800">You're part of a cohort</p>
          <p className="text-sm text-brand-700 mt-1">Your progress contributes to your institution's aggregated, anonymized stats.</p>
        </div>
      ) : (
        <Link to="/support/join-institution" className="block bg-surface rounded-2xl shadow-sm border border-subtle p-5 hover:border-brand-300 transition">
          <p className="font-semibold text-ink">Join an institution</p>
          <p className="text-sm text-muted mt-1">Have an invite code from your church, employer, or center?</p>
        </Link>
      )}
    </div>
  );
}
