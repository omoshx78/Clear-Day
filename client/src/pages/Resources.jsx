import React from "react";
import { Link } from "react-router-dom";

const MEETINGS = [
  {
    name: "AA Kenya",
    desc: "Alcoholics Anonymous — in-person and online meetings across Kenya.",
    url: "https://aa-kenya.or.ke/",
  },
  {
    name: "Narcotics Anonymous — Find a Meeting",
    desc: "Global NA meeting search, including online meetings reachable from Kenya.",
    url: "https://www.na.org/meetingsearch/",
  },
  {
    name: "Gamblers Anonymous",
    desc: "In-person, virtual, and telephone meetings for gambling recovery.",
    url: "https://www.gamblersanonymous.org/",
  },
];

const CALENDAR = [
  { month: "April", title: "Alcohol Awareness Month" },
  { month: "May 31", title: "World No Tobacco Day" },
  { month: "August 31", title: "International Overdose Awareness Day" },
  { month: "September", title: "National Recovery Month" },
];

export default function Resources() {
  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-ink">Resources</h1>

      <div>
        <p className="text-sm font-semibold text-ink mb-3">Meetings</p>
        <div className="space-y-3">
          {MEETINGS.map((m) => (
            <a
              key={m.name}
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
            >
              <p className="font-semibold text-ink">{m.name}</p>
              <p className="text-sm text-muted mt-1">{m.desc}</p>
              <p className="text-xs text-brand-600 mt-2">{m.url.replace("https://", "")} ↗</p>
            </a>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink mb-3">Recovery Awareness Calendar</p>
        <div className="bg-surface rounded-2xl shadow-sm border border-subtle divide-y divide-subtle">
          {CALENDAR.map((c) => (
            <div key={c.title} className="flex items-center gap-3 p-4">
              <span className="text-xs font-bold text-brand-700 bg-brand-100 rounded-lg px-2 py-1 whitespace-nowrap">{c.month}</span>
              <span className="text-sm text-ink">{c.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink mb-3">Talk to someone</p>
        <div className="space-y-3">
          <Link
            to="/support/directory"
            className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
          >
            <p className="font-semibold text-ink">Message a support provider</p>
            <p className="text-sm text-muted mt-1">Verified counselors, chaplains, and coaches on ClearDay</p>
          </Link>
          <p className="text-xs text-faint text-center">
            In a crisis? Use the "Need help now?" button on any screen for free, immediate helplines.
          </p>
        </div>
      </div>
    </div>
  );
}
