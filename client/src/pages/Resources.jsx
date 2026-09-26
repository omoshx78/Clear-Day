import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

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

const LEARNING = [
  { name: "Khan Academy", desc: "Completely free, no audit/paywall catch — any subject, any level.", url: "https://www.khanacademy.org/" },
  { name: "freeCodeCamp", desc: "Completely free coding and tech courses, with certificates.", url: "https://www.freecodecamp.org/" },
  { name: "Coursera (audit)", desc: "Most courses can be audited free — full content, no certificate. Availability varies by course.", url: "https://www.coursera.org/" },
  { name: "edX (audit)", desc: "Free audit track on most courses — access expires after the course length, so certificates cost extra.", url: "https://www.edx.org/" },
];

const READING = [
  { name: "Project Gutenberg", desc: "70,000+ free ebooks, public domain classics.", url: "https://www.gutenberg.org/" },
  { name: "Open Library", desc: "Free book lending from the Internet Archive — modern titles too, not just classics.", url: "https://openlibrary.org/" },
];

const CALENDAR = [
  { month: "April", title: "Alcohol Awareness Month" },
  { month: "May 31", title: "World No Tobacco Day" },
  { month: "August 31", title: "International Overdose Awareness Day" },
  { month: "September", title: "National Recovery Month" },
];

export default function Resources() {
  const [crisisResources, setCrisisResources] = useState([]);

  useEffect(() => {
    api.getCrisisResources().then(setCrisisResources).catch(() => {});
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-ink">Resources</h1>

      <Link
        to="/places"
        className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
      >
        <p className="font-semibold text-ink">📍 Find places near you</p>
        <p className="text-sm text-muted mt-1">Churches, mosques, gyms, cafés, and community centers close to you</p>
      </Link>

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
        <p className="text-sm font-semibold text-ink mb-1">Free learning</p>
        <p className="text-xs text-faint mb-3">Filling the time with something that grows you</p>
        <div className="space-y-3">
          {LEARNING.map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
            >
              <p className="font-semibold text-ink">{l.name}</p>
              <p className="text-sm text-muted mt-1">{l.desc}</p>
            </a>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink mb-3">Free reading</p>
        <div className="space-y-3">
          {READING.map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
            >
              <p className="font-semibold text-ink">{r.name}</p>
              <p className="text-sm text-muted mt-1">{r.desc}</p>
            </a>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink mb-1">Take a break</p>
        <p className="text-xs text-faint mb-3">
          Sometimes the move is just to step away. Put on music you actually like, or watch
          something that pulls your attention elsewhere for a while — everyone's taste is
          different, so we won't pretend to pick for you. A couple of starting points if you
          want one:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noreferrer"
            className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition text-center"
          >
            <p className="font-semibold text-ink">YouTube</p>
            <p className="text-xs text-muted mt-1">Music, films, anything — free with ads</p>
          </a>
          <a
            href="https://open.spotify.com/"
            target="_blank"
            rel="noreferrer"
            className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition text-center"
          >
            <p className="font-semibold text-ink">Spotify</p>
            <p className="text-xs text-muted mt-1">Free tier, ad-supported</p>
          </a>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink mb-3">Crisis support — free, 24/7 where noted</p>
        <div className="space-y-3">
          {crisisResources.map((r) => (
            <a
              key={r.name}
              href={`tel:${r.tel}`}
              className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
            >
              <p className="font-semibold text-ink">{r.name}</p>
              <p className="text-brand-700 font-medium text-sm">{r.number}</p>
              <p className="text-xs text-muted mt-1">{r.description}</p>
            </a>
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
          <Link
            to="/contact"
            className="block bg-surface rounded-2xl shadow-sm border border-subtle p-4 hover:border-brand-300 transition"
          >
            <p className="font-semibold text-ink">Contact the ClearDay team</p>
            <p className="text-sm text-muted mt-1">Suggestions, compliments, complaints, or general help</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
