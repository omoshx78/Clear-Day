import React from "react";
import { useParams } from "react-router-dom";
import BackBar from "../components/BackBar.jsx";

const TERMS = `
**Last updated: September 27, 2026**

These are the Terms of Service for ClearDay, run by JazzMedia
(info@jazzmedia.co.ke).

**1. What ClearDay is**
ClearDay is a support tool for people working to quit smoking, alcohol, or
gambling — streak tracking, check-ins, a craving toolkit, journaling, and
optional connections to verified support providers and institutions.

**2. What ClearDay is not**
ClearDay is not a medical device, a substitute for professional medical or
mental health treatment, or an emergency service. If you are in crisis,
use the "Need help now?" button in the app or contact NACADA (1192,
toll-free) or Befrienders Kenya directly.

**3. Accounts**
You register with a phone number and a PIN you choose. You're responsible
for keeping your PIN private. We never ask for your PIN outside the app.

**4. Your content**
Journal entries, check-ins, and messages you send are yours. We store them
to provide the service; we don't sell them, and we don't read them except
as needed to operate or fix the service, or as required by law.

**5. Support providers and institutions**
Support providers on ClearDay are reviewed before being verified, but
ClearDay does not independently confirm professional credentials beyond
what's submitted. Providers are not employees of JazzMedia. Use judgment
when discussing sensitive matters with anyone, verified or not.

**6. Payments**
Pro subscription payments are processed via M-Pesa (Safaricom Daraja).
Subscription details and pricing are shown before you pay.

**7. Termination**
You can delete your account and all associated data at any time from
Settings. We may suspend accounts that abuse the service or other users.

**8. Changes**
We may update these terms. Meaningful changes will be reflected here with
an updated date.

**9. Contact**
JazzMedia — info@jazzmedia.co.ke — https://www.jazzmedia.co.ke/
`;

const PRIVACY = `
**Last updated: September 27, 2026**

This Privacy Policy is written with Kenya's **Data Protection Act, 2019**
in mind, for ClearDay, run by JazzMedia (info@jazzmedia.co.ke).

**1. What we collect**
- Your phone number and a hashed PIN (we never store your PIN in plain text)
- Your addiction type, quit date, and goal — only what you enter
- Daily check-ins (mood, craving level, optional notes) and journal entries
- An optional recovery email, only if you choose to add one
- Messages you send to support providers, if you use that feature
- Basic usage signals (e.g. when you were last active) to help us see
  whether the app is actually being used, shown only to the app owner in
  aggregate/individual admin views — never sold or shared externally

**2. What we don't collect**
No name, no ID number, no location beyond what you explicitly provide to
the nearest-places feature (which is never stored — it's used live, then
discarded), no advertising trackers.

**3. Where your data lives**
Your data is stored with Supabase (a database provider) and processed by
our backend hosted on Render. Payments are processed by Safaricom's Daraja
API for M-Pesa — we don't see or store your M-Pesa PIN or full transaction
credentials.

**4. Who can see it**
- You, always, via the app and the "export my data" option in Settings
- ClearDay's admin (JazzMedia), for support and to keep the app running —
  admin sees aggregated stats and can see your phone number and
  streak/status where needed to help you, but not your journal content
  or private messages, from the admin dashboard as currently built
- A support provider you choose to message, only the messages you send them
- An institution's admin, only as an anonymized, aggregated number (never
  your name, phone, or individual entries) if you join their cohort

**5. Your rights**
Under Kenya's Data Protection Act, you have the right to access, correct,
and delete your personal data. You can export your data or delete your
account entirely at any time from Settings — deletion is immediate and
permanent.

**6. Data retention**
We keep your data as long as your account is active. If you delete your
account, your data is deleted immediately, except anonymized feedback you
submitted (kept for support quality, with your identity removed).

**7. Security**
PINs are hashed (never stored in plain text). Reasonable technical
measures are used to protect your data, but no system is 100% secure.

**8. Changes**
We may update this policy. Meaningful changes will be reflected here with
an updated date.

**9. Contact / complaints**
JazzMedia — info@jazzmedia.co.ke — https://www.jazzmedia.co.ke/. You can
also contact Kenya's Office of the Data Protection Commissioner (ODPC) if
you have concerns about how your data is handled.
`;

function renderMarkdownish(text) {
  return text.split("\n\n").map((block, i) => {
    if (block.startsWith("**") && block.endsWith("**") && !block.slice(2).includes("**")) {
      return <p key={i} className="font-semibold text-ink mt-4 mb-1">{block.slice(2, -2)}</p>;
    }
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-sm text-muted mb-3 leading-relaxed">
        {parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? <strong key={j} className="text-ink">{p.slice(2, -2)}</strong> : p
        )}
      </p>
    );
  });
}

export default function Legal() {
  const { type } = useParams();
  const isTerms = type === "terms";
  const content = isTerms ? TERMS : PRIVACY;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <BackBar fallback="/dashboard" />
      <h1 className="text-2xl font-bold text-ink mt-3 mb-1">{isTerms ? "Terms of Service" : "Privacy Policy"}</h1>
      <div>{renderMarkdownish(content.trim())}</div>
    </div>
  );
}
