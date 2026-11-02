import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  Heart,
  X,
  QrCode,
  Radio,
  UserRound,
  KeyRound,
  Download,
  Briefcase,
  Mail,
  Send,
  Bell,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { categories, moreSkills } from "./demo";
import { intents, intentLabel } from "./match";

export function Avatar({ person }) {
  return <PixelAvatar person={person} compact />;
}
function avatarIndex(person) {
  const key = person?.user_id || person?.name || "guest";
  let hash = 0;
  for (let i = 0; i < key.length; i++)
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  return Math.abs(hash) % 49;
}
function PixelAvatar({ person, compact = false }) {
  const index = avatarIndex(person),
    column = index % 7,
    row = Math.floor(index / 7);
  return (
    <div
      className={`pixel-avatar${compact ? " pixel-avatar-compact avatar avatar-large" : ""}`}
      aria-hidden="true"
      style={{
        "--avatar-x": `${(column * 100) / 6}%`,
        "--avatar-y": `${(row * 100) / 6}%`,
      }}
    />
  );
}
export const roleLine = (p) =>
  p?.intent === "job_seeking"
    ? p.headline
      ? `Looking for ${p.headline}`
      : "Looking for work"
    : [p?.headline, p?.company].filter(Boolean).join(" · ");
export function IntentBadge({ intent }) {
  return (
    <span className={`intent-badge intent-${intent || "networking"}`}>
      {intentLabel(intent)}
    </span>
  );
}

export function Modal({ children, onClose, label = "Event room dialog" }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
            "button,input,textarea,a[href]",
          ),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    ref.current.querySelector("input,button")?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay" onClick={onClose}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="dialog form-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button aria-label="Close dialog" className="close" onClick={onClose}>
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}

export function AuthForm({ onSubmit, busy, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  return (
    <form
      className="profile-form auth-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(mode, email.trim(), password);
      }}
    >
      <label>
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            mode === "login" ? "Your password" : "At least 6 characters"
          }
        />
      </label>
      <button className="primary full" disabled={busy}>
        {busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
        <ArrowRight size={17} />
      </button>
      <p className="privacy">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          className="text-btn inline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </form>
  );
}

// What people see after scanning the QR code: log in, or join as a guest.
export function Gate({ room, busy, onAuth, onGuest }) {
  const [step, setStep] = useState("choose");
  return (
    <section className="gate">
      <div className="eyebrow">
        <span className="dot" /> YOU’RE INVITED
      </div>
      <h1 className="landing-title gate-title">{room.name}</h1>
      <p className="landing-description">
        Meet the people worth talking to. How would you like to join?
      </p>
      {step === "choose" && (
        <div className="entry-grid">
          <section className="entry-card">
            <div className="stat-ico purple">
              <KeyRound size={24} />
            </div>
            <h2>Log in or sign up</h2>
            <p>
              Keep your profile for future events. We’ll pre-fill it next time
              you scan.
            </p>
            <button className="primary" onClick={() => setStep("login")}>
              Continue with email <ArrowRight size={17} />
            </button>
          </section>
          <section className="entry-card">
            <div className="stat-ico mint">
              <UserRound size={24} />
            </div>
            <h2>Continue as guest</h2>
            <p>
              No password. Tell us a little about yourself and jump straight in.
            </p>
            <button className="primary" onClick={() => setStep("guest")}>
              Join as guest <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
      {step === "login" && (
        <section className="entry-card gate-form">
          <button className="text-btn back" onClick={() => setStep("choose")}>
            <ArrowLeft size={15} /> Back
          </button>
          <h2>Welcome.</h2>
          <AuthForm onSubmit={onAuth} busy={busy} />
        </section>
      )}
      {step === "guest" && (
        <section className="onboard">
          <div>
            <Sparkles size={26} />
            <h2>Tell us about you.</h2>
            <p>
              Takes about a minute. We use it to suggest who to meet and what to
              say.
            </p>
            <button className="text-btn back" onClick={() => setStep("choose")}>
              <ArrowLeft size={15} /> Back
            </button>
          </div>
          <ProfileForm
            profile={BLANK}
            onSave={onGuest}
            busy={busy}
            cta="Join as guest"
          />
        </section>
      )}
    </section>
  );
}

const contactModes = [
  ["email", "Email"],
  ["whatsapp", "WhatsApp"],
  ["telegram", "Telegram"],
  ["linkedin", "LinkedIn"],
  ["other", "Other"],
];
export function ContactExchangeForm({ email = "", person, onSubmit, busy }) {
  const [form, setForm] = useState({
    email,
    mode: "email",
    contact: email,
    message: "",
  });
  const set = (field, value) => setForm((old) => ({ ...old, [field]: value }));
  const choose = (mode) =>
    setForm((old) => ({
      ...old,
      mode,
      contact:
        old.contact === old.email
          ? mode === "email"
            ? old.email
            : ""
          : old.contact,
    }));
  return (
    <form
      className="contact-exchange-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="contact-form-person">
        <div className="contact-form-icon">
          <Send size={20} />
        </div>
        <div>
          <b>
            Send your contact card{person?.name ? ` to ${person.name}` : ""}
          </b>
          <span>This is required to confirm that you met.</span>
        </div>
      </div>
      <label>
        Email
        <input
          required
          type="email"
          maxLength={254}
          autoComplete="email"
          value={form.email}
          onChange={(e) => {
            set("email", e.target.value);
            if (form.mode === "email") set("contact", e.target.value);
          }}
          placeholder="you@example.com"
        />
      </label>
      <div>
        <div className="field-title">Preferred contact mode</div>
        <div className="contact-mode-picker" role="radiogroup">
          {contactModes.map(([id, label]) => (
            <button
              type="button"
              role="radio"
              aria-checked={form.mode === id}
              className={form.mode === id ? "selected" : ""}
              key={id}
              onClick={() => choose(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label>
        {form.mode === "email"
          ? "Contact email"
          : form.mode === "whatsapp"
            ? "WhatsApp number"
            : form.mode === "telegram"
              ? "Telegram username"
              : form.mode === "linkedin"
                ? "LinkedIn profile"
                : "Contact details"}
        <input
          required
          maxLength={200}
          value={form.contact}
          onChange={(e) => set("contact", e.target.value)}
          placeholder={
            {
              email: "you@example.com",
              whatsapp: "+65 9123 4567",
              telegram: "@username",
              linkedin: "linkedin.com/in/yourname",
              other: "How should they reach you?",
            }[form.mode]
          }
        />
      </label>
      <label>
        Message <small>Optional</small>
        <textarea
          maxLength={500}
          rows={4}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Great meeting you — let’s continue our conversation!"
        />
      </label>
      <button className="primary full" disabled={busy}>
        {busy ? "Sending..." : "Confirm we met & send card"}
        <Send size={16} />
      </button>
      <p className="privacy">Only you and this connection can see this card.</p>
    </form>
  );
}

export function MeetingInviteForm({ target, people, onSubmit, busy }) {
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState([]);
  const toggle = (id) =>
    setSelected((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id].slice(0, 6),
    );
  return (
    <form
      className="meeting-invite-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ note: note.trim(), participantIds: selected });
      }}
    >
      <div className="invite-primary-person">
        <Avatar person={target} />
        <div>
          <b>Invite {target?.name}</b>
          <span>{roleLine(target) || "Fellow attendee"}</span>
        </div>
      </div>
      <label>
        Add a note <small>Optional</small>
        <textarea
          rows={4}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Hey! I’d love to chat about your project. Want to meet near the registration desk?"
        />
      </label>
      {people.length > 0 && (
        <div>
          <div className="field-title">
            Mention other people <small>Invite up to 6 people</small>
          </div>
          <div className="invite-people-picker">
            {people.map((person) => (
              <label key={person.user_id}>
                <input
                  type="checkbox"
                  checked={selected.includes(person.user_id)}
                  onChange={() => toggle(person.user_id)}
                />
                <Avatar person={person} />
                <span>
                  <b>{person.name}</b>
                  <small>{roleLine(person) || "Attendee"}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <button className="primary full" disabled={busy}>
        {busy ? "Sending..." : "Send meeting request"}
        <UserPlus size={16} />
      </button>
    </form>
  );
}

export function Inbox({
  intros,
  cards,
  members,
  uid,
  room,
  busy,
  onReply,
  onShare,
}) {
  const mine = intros
    .filter(
      (i) =>
        [i.sender_id, i.recipient_id].includes(uid) ||
        (i.participant_ids || []).includes(uid),
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const received = cards.filter((c) => c.recipient_id === uid);
  const sentByIntro = new Set(
    cards.filter((c) => c.sender_id === uid).map((c) => c.introduction_id),
  );
  const person = (id) => members.find((m) => m.user_id === id);
  return (
    <div className="inbox-layout">
      <section>
        <div className="inbox-heading">
          <div>
            <div className="eyebrow">
              <Bell size={14} /> YOUR INBOX
            </div>
            <h2>Connections, all in one place.</h2>
            <p>Meeting requests and contact cards arrive here live.</p>
          </div>
        </div>
        <div className="inbox-feed">
          {received.map((card) => {
            const p = person(card.sender_id);
            return (
              <article
                className={"contact-me-card " + (!card.read_at ? "unread" : "")}
                key={card.id}
              >
                <div className="contact-card-top">
                  <Avatar person={p} />
                  <div>
                    <span className="contact-card-label">
                      <MessageCircle size={13} /> CONTACT ME
                    </span>
                    <h3>{p?.name || "Your connection"}</h3>
                    <p>{roleLine(p) || "You met at this event"}</p>
                  </div>
                  {!card.read_at && <span className="new-pill">NEW</span>}
                </div>
                <div className="contact-details">
                  <a href={`mailto:${card.email}`}>
                    <Mail size={15} />
                    {card.email}
                  </a>
                  <div>
                    <Send size={15} />
                    <span>
                      <b>
                        {contactModes.find(
                          ([id]) => id === card.preferred_mode,
                        )?.[1] || "Contact"}
                      </b>
                      {card.contact_value}
                    </span>
                  </div>
                </div>
                {card.message && <blockquote>“{card.message}”</blockquote>}
              </article>
            );
          })}
          {mine.map((i) => {
            const included = (i.participant_ids || []).includes(uid),
              incoming = i.recipient_id === uid || included,
              p = person(incoming ? i.sender_id : i.recipient_id),
              sent = sentByIntro.has(i.id),
              group = [i.recipient_id, ...(i.participant_ids || [])]
                .map(person)
                .filter(Boolean);
            return (
              <article className="intro-card inbox-request" key={i.id}>
                <Avatar person={p} />
                <div>
                  <h3>{p?.name || "Participant"}</h3>
                  <p>
                    {i.status === "pending"
                      ? incoming
                        ? included
                          ? `Included you in a conversation with ${group
                              .filter((member) => member.user_id !== uid)
                              .map((member) => member.name)
                              .join(" and ")}.`
                          : "Wants to meet you."
                        : "Your meeting request is waiting for a reply."
                      : i.status === "declined"
                        ? "The invitation was declined."
                        : i.status === "accepted"
                          ? `You agreed to meet at ${room.meeting_point}.`
                          : "You met. Keep the connection going."}
                  </p>
                  {i.note && (
                    <blockquote className="invite-note">“{i.note}”</blockquote>
                  )}
                  {group.length > 1 && (
                    <span className="group-invite-names">
                      <Users size={13} /> {group.map((m) => m.name).join(", ")}
                    </span>
                  )}
                  {["accepted", "met"].includes(i.status) && (
                    <span className="meeting-point">{room.meeting_point}</span>
                  )}
                </div>
                <div className="intro-actions">
                  {i.status === "pending" && i.recipient_id === uid ? (
                    <>
                      <button
                        disabled={busy}
                        className="primary"
                        onClick={() => onReply(i.id, "accepted")}
                      >
                        Let's meet
                      </button>
                      <button
                        disabled={busy}
                        className="text-btn"
                        onClick={() => onReply(i.id, "declined")}
                      >
                        Decline
                      </button>
                    </>
                  ) : i.status === "pending" && included ? (
                    <span className="chip">Group invitation</span>
                  ) : i.status === "accepted" ? (
                    <button
                      disabled={busy}
                      className="primary"
                      onClick={() => onShare(i)}
                    >
                      <Check size={16} /> We met
                    </button>
                  ) : i.status === "met" && !sent ? (
                    <button
                      disabled={busy}
                      className="text-btn contact-send"
                      onClick={() => onShare(i)}
                    >
                      <Send size={15} /> Send my contact card
                    </button>
                  ) : sent ? (
                    <span className="chip status-met">Contact card sent</span>
                  ) : (
                    <span className={"chip status-" + i.status}>
                      {i.status}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          {!received.length && !mine.length && (
            <div className="empty">
              <Bell size={25} />
              <b>Your inbox is ready.</b>
              <span>Meeting requests and contact cards will appear here.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export const BLANK = {
  name: "",
  email: "",
  company: "",
  headline: "",
  intent: "networking",
  project: "",
  offers: "",
  needs: "",
  skills: [],
  looking_for: [],
  discoverable: true,
  available: true,
};

function TagInput({ label, hint, value, onChange, suggestions }) {
  const [text, setText] = useState("");
  const add = (raw) => {
    const t = raw.trim().slice(0, 40);
    if (
      !t ||
      value.length >= 12 ||
      value.some((v) => v.toLowerCase() === t.toLowerCase())
    )
      return;
    onChange([...value, t]);
  };
  const commit = () => {
    add(text);
    setText("");
  };
  return (
    <div className="tag-field">
      <div className="field-title">
        {label} <small>{hint}</small>
      </div>
      <div className="tag-picker">
        {value.map((t) => (
          <button
            type="button"
            aria-pressed="true"
            className="selected"
            key={t}
            onClick={() => onChange(value.filter((x) => x !== t))}
          >
            ✓ {t} ×
          </button>
        ))}
        {suggestions
          .filter(
            (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
          )
          .map((s) => (
            <button
              type="button"
              aria-pressed="false"
              key={s}
              onClick={() => add(s)}
            >
              + {s}
            </button>
          ))}
      </div>
      <input
        aria-label={`Add to ${label}`}
        placeholder="Type your own and press Enter"
        value={text}
        maxLength={40}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}

const suggestions = [...categories, ...moreSkills];
const wantsCopy = {
  hiring: ["Skills I’m hiring for", "The skills or roles you want to find"],
  job_seeking: [
    "Work I’m looking for",
    "The roles or skills you want to work in",
  ],
  networking: [
    "Who I’d like to meet",
    "Skills or backgrounds you’re curious about",
  ],
};
export function ProfileForm({ profile, onSave, busy, editing, cta }) {
  const [form, setForm] = useState(profile),
    [problem, setProblem] = useState("");
  const set = (field, value) => setForm((old) => ({ ...old, [field]: value }));
  const chooseIntent = (intent) =>
    setForm((old) => ({
      ...old,
      intent,
      ...(intent === "job_seeking" ? { company: "" } : {}),
    }));
  const [wantsLabel, wantsHint] = wantsCopy[form.intent];
  function submit(e) {
    e.preventDefault();
    if (!form.skills.length)
      return setProblem("Add at least one skill so we can find your matches.");
    setProblem("");
    const clean = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [
        k,
        typeof v === "string" ? v.trim() : v,
      ]),
    );
    // Skills double as what you offer and what you need, which keeps semantic matching fed.
    onSave({
      ...clean,
      offers: clean.skills.join(", ").slice(0, 500),
      needs: clean.looking_for.join(", ").slice(0, 500),
    });
  }
  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="form-pair">
        <label>
          Your name
          <input
            required
            maxLength={80}
            autoComplete="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="What should we call you?"
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@company.com"
          />
        </label>
      </div>
      <div>
        <div className="field-title" id="intent-title">
          What brings you here? <small>We match on this first</small>
        </div>
        <div
          className="intent-picker"
          role="radiogroup"
          aria-labelledby="intent-title"
        >
          {intents.map((i) => (
            <button
              type="button"
              role="radio"
              aria-checked={form.intent === i.id}
              className={form.intent === i.id ? "selected" : ""}
              key={i.id}
              onClick={() => chooseIntent(i.id)}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>
      {form.intent === "job_seeking" ? (
        <label>
          What role are you looking for?
          <input
            required
            maxLength={120}
            autoComplete="organization-title"
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Frontend developer, product designer…"
          />
        </label>
      ) : (
        <div className="form-pair">
          <label>
            Company
            <input
              maxLength={120}
              autoComplete="organization"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Where do you work?"
            />
          </label>
          <label>
            Your role
            <input
              maxLength={120}
              autoComplete="organization-title"
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="Designer, developer, founder…"
            />
          </label>
        </div>
      )}
      <TagInput
        label="My skills"
        hint="What you’re good at"
        value={form.skills}
        onChange={(v) => set("skills", v)}
        suggestions={suggestions}
      />
      <TagInput
        label={wantsLabel}
        hint={wantsHint}
        value={form.looking_for}
        onChange={(v) => set("looking_for", v)}
        suggestions={suggestions}
      />
      <label>
        What are you working on right now?{" "}
        <small>Optional. A good conversation starter.</small>
        <input
          maxLength={500}
          value={form.project}
          onChange={(e) => set("project", e.target.value)}
          placeholder="An AI tutor for university students"
        />
      </label>
      <label className="consent">
        <input
          type="checkbox"
          required={!editing}
          checked={form.discoverable}
          onChange={(e) => set("discoverable", e.target.checked)}
        />
        <span>
          Show my profile to other people in this room so they can find and
          invite me. I can hide it later.
        </span>
      </label>
      {problem && (
        <div className="notice error" role="alert">
          {problem}
        </div>
      )}
      <button className="primary full" disabled={busy}>
        {busy
          ? "Saving…"
          : editing
            ? "Save my profile"
            : cta || "Find my people"}
        <ArrowRight size={17} />
      </button>
      <p className="privacy">
        Your email is only shared with the organizer and people whose
        introduction you accept.
      </p>
    </form>
  );
}

const cell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
function exportCsv(room, members) {
  const rows = [
    [
      "Name",
      "Email",
      "Company",
      "Current / target role",
      "Looking to",
      "Skills",
      "Looking for",
      "Signed up as",
    ],
    ...members.map((m) => [
      m.name,
      m.email,
      m.company,
      m.headline,
      intentLabel(m.intent),
      (m.skills || []).join("; "),
      (m.looking_for || []).join("; "),
      m.is_guest ? "Guest" : "Account",
    ]),
  ];
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob(["﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
      type: "text/csv",
    }),
  );
  link.download = `${room.name.replace(/[^\w-]+/g, "_")}-participants.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
const statusCopy = {
  pending: "Invitation sent",
  accepted: "Agreed to meet",
  declined: "Declined",
  met: "Met ✓",
};

// Screen-share-first organizer room. New members animate onto the event floor through Realtime.
export function Organizer({
  room,
  members,
  intros,
  live,
  hasProfile,
  onInvite,
  onJoin,
}) {
  const [tab, setTab] = useState("room");
  const byId = Object.fromEntries(members.map((m) => [m.user_id, m]));
  const made = intros.filter((i) => ["accepted", "met"].includes(i.status));
  const sorted = [...intros].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  return (
    <section className="organizer-dashboard">
      <div className="organizer-toolbar">
        <div className="room-tabs" role="tablist">
          {[
            ["room", "Live room"],
            ["connections", `Connections (${intros.length})`],
            ["people", `People (${members.length})`],
          ].map(([id, label]) => (
            <button
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "active" : ""}
              key={id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="organizer-actions">
          <span className={"availability " + (live ? "available" : "")}>
            {live ? "Live updates on" : "Connecting..."}
          </span>
          {!hasProfile && (
            <button className="text-btn" onClick={onJoin}>
              <Sparkles size={14} /> Join matching too
            </button>
          )}
          {members.length > 0 && (
            <button
              className="text-btn"
              onClick={() => exportCsv(room, members)}
            >
              <Download size={15} /> Export CSV
            </button>
          )}
        </div>
      </div>
      {tab === "room" ? (
        <div className="live-room-stage">
          <div className="stage-glow stage-glow-one" />
          <div className="stage-glow stage-glow-two" />
          <div className="stage-top">
            <div>
              <div className="stage-kicker">
                <span className="live-pulse" /> LIVE EVENT ROOM
              </div>
              <h2>{room.name}</h2>
              <p>
                {members.length
                  ? `${members.length} ${members.length === 1 ? "person is" : "people are"} here now. New arrivals appear automatically.`
                  : "Your room is ready. Show the QR code to welcome the first attendee."}
              </p>
            </div>
            <div className="stage-actions">
              <div className="stage-count">
                <strong>{made.length}</strong>
                <span>connections made</span>
              </div>
              <button className="stage-qr" onClick={onInvite}>
                <QrCode size={20} /> Show QR code
              </button>
            </div>
          </div>
          <div
            className={"people-floor " + (!members.length ? "is-empty" : "")}
          >
            {members.length ? (
              members.map((m, index) => (
                <article
                  className="room-person"
                  key={m.user_id}
                  style={{ "--arrival": `${Math.min(index, 12) * 55}ms` }}
                >
                  <div className="floating-name">
                    <strong>{m.name}</strong>
                    <span>{roleLine(m) || intentLabel(m.intent)}</span>
                  </div>
                  <PixelAvatar person={m} />
                  <span
                    className={
                      "person-presence " + (m.available ? "available" : "")
                    }
                  >
                    {m.available ? "Ready to meet" : "Taking a break"}
                  </span>
                </article>
              ))
            ) : (
              <div className="stage-empty">
                <div className="empty-orbit">
                  <Users size={30} />
                </div>
                <b>Your room is open</b>
                <span>
                  Attendee avatars will appear right here in realtime.
                </span>
              </div>
            )}
          </div>
          <div className="stage-footer">
            <span>
              <Radio size={14} /> Supabase Realtime
            </span>
            <span>
              Meeting point: <b>{room.meeting_point}</b>
            </span>
          </div>
        </div>
      ) : tab === "connections" ? (
        <div className="organizer-member-list">
          {sorted.length ? (
            sorted.map((i) => {
              const a = byId[i.sender_id],
                b = byId[i.recipient_id];
              return (
                <article className="organizer-member connection" key={i.id}>
                  <div className="pair">
                    <PixelAvatar person={a} />
                    <PixelAvatar person={b} />
                  </div>
                  <div>
                    <h3>
                      {a?.name || "Participant"}{" "}
                      <span className="arrow">to</span>{" "}
                      {b?.name || "Participant"}
                    </h3>
                    <p>
                      {[roleLine(a), roleLine(b)].filter(Boolean).join(" / ")}
                    </p>
                    {["accepted", "met"].includes(i.status) && (
                      <span>
                        {[a?.email, b?.email].filter(Boolean).join(" / ")}
                      </span>
                    )}
                  </div>
                  <span className={"chip status-" + i.status}>
                    {statusCopy[i.status]}
                  </span>
                </article>
              );
            })
          ) : (
            <div className="empty">
              <Heart size={24} />
              <b>No connections yet.</b>
              <span>
                When participants invite each other, the pairs show up here.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="organizer-member-list">
          {members.length ? (
            members.map((m) => (
              <article className="organizer-member" key={m.user_id}>
                <PixelAvatar person={m} />
                <div>
                  <h3>
                    {m.name} {m.is_guest && <span className="chip">Guest</span>}
                  </h3>
                  <p>{roleLine(m) || "No role listed"}</p>
                  {m.email && (
                    <span>
                      <Mail size={11} /> {m.email}
                    </span>
                  )}
                  <div className="chips">
                    {(m.skills || []).map((t) => (
                      <span className="chip" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="person-side">
                  <IntentBadge intent={m.intent} />
                  <span
                    className={
                      "availability " + (m.available ? "available" : "")
                    }
                  >
                    {m.available ? "Open to meet" : "On a break"}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">
              <Users size={24} />
              <b>No participants yet.</b>
              <span>Show the QR code and the first name will appear here.</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Previous compact dashboard retained temporarily for easy comparison during iteration.
function OrganizerLegacy({
  room,
  members,
  intros,
  live,
  hasProfile,
  onInvite,
  onJoin,
}) {
  const [tab, setTab] = useState("connections");
  const byId = Object.fromEntries(members.map((m) => [m.user_id, m]));
  const made = intros.filter((i) => ["accepted", "met"].includes(i.status));
  const sorted = [...intros].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  return (
    <section className="organizer-dashboard">
      <div className="organizer-hero">
        <div>
          <div className="eyebrow">
            <Radio size={14} /> ORGANIZER VIEW
          </div>
          <h2>
            {members.length
              ? `${members.length} ${members.length === 1 ? "person is" : "people are"} in the room.`
              : "Your room is ready."}
          </h2>
          <p>
            Keep this screen open. Participants and their connections appear
            here live. Meeting point: {room.meeting_point}.
          </p>
        </div>
        <div className="organizer-actions">
          <button className="primary" onClick={onInvite}>
            <QrCode size={17} /> Show QR code
          </button>
          {!hasProfile && (
            <button className="text-btn" onClick={onJoin}>
              <Sparkles size={16} /> Join matching too
            </button>
          )}
        </div>
      </div>
      <section className="stat-grid">
        <div className="stat">
          <div className="stat-ico purple">
            <Users size={20} />
          </div>
          <div>
            <strong>{members.length}</strong>
            <span>Participants joined</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-ico peach">
            <Briefcase size={20} />
          </div>
          <div>
            <strong>
              {members.filter((m) => m.intent === "hiring").length} /{" "}
              {members.filter((m) => m.intent === "job_seeking").length}
            </strong>
            <span>Hiring / open to work</span>
          </div>
        </div>
        <div className="stat">
          <div className="stat-ico mint">
            <Heart size={20} />
          </div>
          <div>
            <strong>{made.length}</strong>
            <span>
              Connections made
              {intros.length > made.length
                ? ` · ${intros.length - made.length} pending or declined`
                : ""}
            </span>
          </div>
        </div>
      </section>
      <div className="section-head">
        <div>
          <div className="room-tabs" role="tablist">
            {[
              ["connections", `Who connected (${intros.length})`],
              ["people", `People (${members.length})`],
            ].map(([id, label]) => (
              <button
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? "active" : ""}
                key={id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="organizer-actions">
          <span className={"availability " + (live ? "available" : "")}>
            {live ? "Live updates on" : "Connecting…"}
          </span>
          {members.length > 0 && (
            <button
              className="text-btn"
              onClick={() => exportCsv(room, members)}
            >
              <Download size={15} /> Export CSV
            </button>
          )}
        </div>
      </div>
      {tab === "connections" ? (
        <div className="organizer-member-list">
          {sorted.length ? (
            sorted.map((i) => {
              const a = byId[i.sender_id],
                b = byId[i.recipient_id];
              return (
                <article className="organizer-member connection" key={i.id}>
                  <div className="pair">
                    <Avatar person={a} />
                    <Avatar person={b} />
                  </div>
                  <div>
                    <h3>
                      {a?.name || "Participant"}{" "}
                      <span className="arrow">→</span>{" "}
                      {b?.name || "Participant"}
                    </h3>
                    <p>
                      {[roleLine(a), roleLine(b)].filter(Boolean).join("  ↔  ")}
                    </p>
                    {["accepted", "met"].includes(i.status) && (
                      <span>
                        {[a?.email, b?.email].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  <span className={"chip status-" + i.status}>
                    {statusCopy[i.status]}
                  </span>
                </article>
              );
            })
          ) : (
            <div className="empty">
              <Heart size={24} />
              <b>No connections yet.</b>
              <span>
                When participants invite each other, the pairs show up here.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="organizer-member-list">
          {members.length ? (
            members.map((m) => (
              <article className="organizer-member" key={m.user_id}>
                <Avatar person={m} />
                <div>
                  <h3>
                    {m.name} {m.is_guest && <span className="chip">Guest</span>}
                  </h3>
                  <p>{roleLine(m) || "No role listed"}</p>
                  {m.email && (
                    <span>
                      <Mail size={11} /> {m.email}
                    </span>
                  )}
                  <div className="chips">
                    {(m.skills || []).map((t) => (
                      <span className="chip" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="person-side">
                  <IntentBadge intent={m.intent} />
                  <span
                    className={
                      "availability " + (m.available ? "available" : "")
                    }
                  >
                    {m.available ? "Open to meet" : "On a break"}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">
              <Users size={24} />
              <b>No participants yet.</b>
              <span>Show the QR code and the first name will appear here.</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
