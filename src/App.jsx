import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Radar,
  ArrowRight,
  Sparkles,
  Users,
  Heart,
  X,
  Check,
  Copy,
  QrCode,
  ArrowLeft,
  Radio,
  MapPin,
  Search,
  Mail,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { scoreMatch } from "./match";
import { supabase, isLive } from "./supabase";
import * as api from "./room-api";
import {
  Avatar,
  IntentBadge,
  roleLine,
  Modal,
  AuthForm,
  Gate,
  ProfileForm,
  Organizer,
  Inbox,
  ContactExchangeForm,
  MeetingInviteForm,
  BLANK,
} from "./views";

const initialCode = new URLSearchParams(location.search).get("room") || "";
const fields = (m) =>
  Object.fromEntries(Object.keys(BLANK).map((k) => [k, m[k] ?? BLANK[k]]));

export default function App() {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [gate, setGate] = useState(null),
    [authFor, setAuthFor] = useState(null);
  const [room, setRoom] = useState(null),
    [members, setMembers] = useState([]),
    [intros, setIntros] = useState([]),
    [cards, setCards] = useState([]),
    [loaded, setLoaded] = useState(false),
    [prefill, setPrefill] = useState(null);
  const [code, setCode] = useState(initialCode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [create, setCreate] = useState(false),
    [editing, setEditing] = useState(false),
    [joining, setJoining] = useState(false),
    [invite, setInvite] = useState(false),
    [invitationTarget, setInvitationTarget] = useState(null),
    [celebration, setCelebration] = useState(null),
    [contactExchange, setContactExchange] = useState(null),
    [tab, setTab] = useState("matches"),
    [query, setQuery] = useState(""),
    [live, setLive] = useState(false),
    [ownerView, setOwnerView] = useState("admin");
  const [draft, setDraft] = useState({
    name: "",
    meeting_point: "Registration desk",
  });
  const [semantic, setSemantic] = useState([]),
    [semanticState, setSemanticState] = useState("off");
  const semanticEnabled =
    isLive && import.meta.env.VITE_ENABLE_SEMANTIC_MATCHING === "true";
  const roomRef = useRef(null),
    known = useRef(null),
    knownIntros = useRef(null),
    knownCards = useRef(null);
  const uid = user?.id,
    isAccount = Boolean(user && !user.isAnonymous);
  const me = members.find((m) => m.user_id === uid),
    owner = Boolean(room && room.owner_id === uid);
  useEffect(() => {
    api
      .currentUser()
      .then(setUser)
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready && initialCode) run(() => open(initialCode));
  }, [ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function load(r) {
    const data = await api.roomData(r.id);
    if (roomRef.current?.id !== r.id) return data;
    if (known.current) {
      const arrival = data.members.find(
        (m) => !known.current.has(m.user_id) && m.user_id !== uid,
      );
      if (arrival)
        setNotice(
          `${arrival.name} just joined.${owner ? "" : " Your connections have updated."}`,
        );
    }
    if (knownIntros.current) {
      const invitation = data.intros.find(
        (i) =>
          !knownIntros.current.has(i.id) &&
          i.recipient_id === uid &&
          i.status === "pending",
      );
      if (invitation) {
        const sender = data.members.find(
          (m) => m.user_id === invitation.sender_id,
        );
        setNotice(`${sender?.name || "Someone"} wants to meet you.`);
      }
    }
    if (knownCards.current) {
      const contactCard = (data.cards || []).find(
        (c) => !knownCards.current.has(c.id) && c.recipient_id === uid,
      );
      if (contactCard) {
        const sender = data.members.find(
          (m) => m.user_id === contactCard.sender_id,
        );
        setNotice(`${sender?.name || "Your connection"} sent a contact card.`);
      }
    }
    known.current = new Set(data.members.map((m) => m.user_id));
    knownIntros.current = new Set(data.intros.map((i) => i.id));
    knownCards.current = new Set((data.cards || []).map((c) => c.id));
    setMembers((old) =>
      isLive
        ? data.members
        : [...data.members, ...old.filter((m) => m.user_id === uid)],
    );
    if (isLive) {
      setIntros(data.intros);
      setCards(data.cards || []);
    }
    return data;
  }
  async function enter(r, u = user) {
    roomRef.current = r;
    known.current = null;
    knownIntros.current = null;
    knownCards.current = null;
    setRoom(r);
    setGate(null);
    setMembers([]);
    setIntros([]);
    setCards([]);
    setLoaded(false);
    setPrefill(null);
    setCreate(false);
    setInvitationTarget(null);
    setCelebration(null);
    setContactExchange(null);
    setTab("matches");
    setOwnerView("admin");
    history.replaceState(
      {},
      "",
      `${location.pathname}?room=${encodeURIComponent(r.code)}`,
    );
    const data = await load(r);
    // Returning account holders get their last profile pre-filled.
    if (
      !u.isAnonymous &&
      r.owner_id !== u.id &&
      !data.members.some((m) => m.user_id === u.id)
    )
      setPrefill(await api.lastProfile(u.id).catch(() => null));
    setLoaded(true);
  }
  // A signed-in person goes straight into the room; everyone else chooses login or guest mode first.
  async function open(c) {
    const r = await api.findRoom(c);
    if (user) await enter(r);
    else setGate(r);
  }
  async function authenticate(mode, email, password) {
    await run(async () => {
      const u =
        mode === "login"
          ? await api.signIn(email, password)
          : await api.signUp(email, password);
      if (!u) {
        setNotice("Account created. Confirm your email, then log in.");
        return;
      }
      const target = authFor;
      setUser(u);
      setAuthFor(null);
      if (gate) await enter(gate, u);
      else if (target === "host") setCreate(true);
    });
  }
  async function joinAsGuest(profile) {
    await run(async () => {
      const u = await api.signInGuest();
      setUser(u);
      await api.saveMember(
        gate.id,
        u.id,
        { ...profile, is_guest: true },
        false,
      );
      await enter(gate, u);
      setNotice("You’re in. Let’s find your people.");
    });
  }
  async function logout() {
    await run(async () => {
      await api.signOut();
      setUser(null);
      reset();
      setGate(null);
    });
  }
  useEffect(() => {
    if (!room || !isLive || !uid) return;
    let active = true;
    const update = () =>
      load(room).catch((e) => {
        if (active) setError(e.message);
      });
    const channel = supabase
      .channel(`room:${room.id}:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${room.id}`,
        },
        update,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "member_contacts",
          filter: `room_id=eq.${room.id}`,
        },
        update,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "introductions",
          filter: `room_id=eq.${room.id}`,
        },
        update,
      )
      .subscribe((s) => {
        if (active) setLive(s === "SUBSCRIBED");
      });
    // Kept on a separate channel so older projects without contact_cards do not
    // break room-member and introduction updates during a staged SQL rollout.
    const cardChannel = supabase
      .channel(`contact-cards:${room.id}:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_cards",
          filter: `room_id=eq.${room.id}`,
        },
        update,
      )
      .subscribe();
    window.addEventListener("focus", update);
    return () => {
      active = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(cardChannel);
      window.removeEventListener("focus", update);
      setLive(false);
    };
  }, [room?.id, uid]);
  const semanticSignature = members
    .map(
      (m) =>
        `${m.user_id}:${m.project}:${m.needs}:${m.offers}:${m.embedding_updated_at || ""}`,
    )
    .sort()
    .join("|");
  useEffect(() => {
    if (!semanticEnabled || !room || !me) {
      setSemantic([]);
      setSemanticState("off");
      return;
    }
    let active = true;
    setSemanticState("loading");
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("match-room", {
          body: { room_id: room.id },
        });
        if (error) throw error;
        if (active) {
          setSemantic(data.matches || []);
          setSemanticState("ready");
        }
      } catch {
        if (active) {
          setSemantic([]);
          setSemanticState("fallback");
        }
      }
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [room?.id, uid, Boolean(me), semanticSignature, semanticEnabled]);
  const matches = useMemo(() => {
    const q = query.toLowerCase();
    return members
      .filter(
        (m) =>
          m.user_id !== uid &&
          m.discoverable &&
          `${m.name} ${m.company} ${m.headline} ${m.project} ${(m.skills || []).join(" ")}`
            .toLowerCase()
            .includes(q),
      )
      .map((m) => {
        const base = scoreMatch(me || BLANK, m),
          vector = semantic.find((s) => s.user_id === m.user_id);
        return {
          ...m,
          match: {
            ...base,
            ...(vector
              ? {
                  score: vector.reciprocal * 100,
                  why: vector.why || base.why,
                  icebreaker: vector.icebreaker || base.icebreaker,
                  source: vector.source || "vector",
                }
              : {}),
          },
        };
      })
      .sort(
        (a, b) => b.available - a.available || b.match.score - a.match.score,
      );
  }, [members, me, uid, query, semantic]);
  async function save(profile) {
    await run(async () => {
      const row = await api.saveMember(
        room.id,
        uid,
        { ...profile, is_guest: user.isAnonymous },
        Boolean(me),
      );
      setMembers((old) => [
        ...old.filter((m) => m.user_id !== uid),
        { ...me, ...row },
      ]);
      setEditing(false);
      setNotice("Profile saved. Let’s find your people.");
    });
  }
  function request(p) {
    if (!isLive) {
      setNotice(
        "Introductions need a live Supabase room. Demo attendees are fictional.",
      );
      return;
    }
    if (!me.discoverable) {
      setError("Make your profile visible before requesting an introduction.");
      return;
    }
    setInvitationTarget(p);
  }
  async function submitInvitation({ note, participantIds }) {
    await run(async () => {
      const i = await api.sendIntro(
        room.id,
        uid,
        invitationTarget.user_id,
        note,
        participantIds,
      );
      setIntros((old) => [...old.filter((x) => x.id !== i.id), i]);
      const invited = [
        invitationTarget,
        ...members.filter((m) => participantIds.includes(m.user_id)),
      ];
      setInvitationTarget(null);
      setCelebration({ kind: "request", names: invited.map((p) => p.name) });
      setTimeout(() => {
        setCelebration(null);
        setTab("matches");
      }, 2600);
    });
  }
  async function reply(id, status) {
    await run(async () => {
      const introduction = intros.find((i) => i.id === id);
      await api.replyIntro(id, status);
      setIntros((old) => old.map((i) => (i.id === id ? { ...i, status } : i)));
      setNotice(
        status === "accepted"
          ? `You’re both in! Meet at ${room.meeting_point}.`
          : status === "met"
            ? "Connection confirmed. Nice to meet your people!"
            : "Invitation declined.",
      );
      if (status === "accepted" && introduction) {
        const people = [
          introduction.sender_id,
          introduction.recipient_id,
          ...(introduction.participant_ids || []),
        ]
          .map((personId) => members.find((m) => m.user_id === personId))
          .filter(Boolean)
          .map((person) => person.name);
        setCelebration({ kind: "accepted", names: people });
        setTimeout(() => {
          setCelebration(null);
          setTab("matches");
        }, 2600);
      }
      load(room).catch(() => {});
    });
  }
  async function completeMeeting(form) {
    await run(async () => {
      const card = await api.shareContactCard(contactExchange.id, form);
      setCards((old) => [card, ...old.filter((c) => c.id !== card.id)]);
      setIntros((old) =>
        old.map((i) =>
          i.id === contactExchange.id ? { ...i, status: "met" } : i,
        ),
      );
      setContactExchange(null);
      setTab("inbox");
      setNotice("Contact card sent. Connection saved!");
      load(room).catch(() => {});
    });
  }
  async function openInbox() {
    setTab("inbox");
    setQuery("");
    const unread = cards.filter((c) => c.recipient_id === uid && !c.read_at);
    if (unread.length) {
      await Promise.allSettled(
        unread.map((c) => api.markContactCardRead(c.id)),
      );
      setCards((old) =>
        old.map((c) =>
          c.recipient_id === uid
            ? { ...c, read_at: c.read_at || new Date().toISOString() }
            : c,
        ),
      );
    }
  }
  function reset() {
    roomRef.current = null;
    known.current = null;
    knownIntros.current = null;
    knownCards.current = null;
    setRoom(null);
    setMembers([]);
    setIntros([]);
    setCards([]);
    setLoaded(false);
    setError("");
    setQuery("");
    setInvitationTarget(null);
    setCelebration(null);
    setContactExchange(null);
    history.replaceState({}, "", location.pathname);
  }
  function leave() {
    reset();
    setGate(null);
  }
  function startHosting() {
    if (isAccount) setCreate(true);
    else setAuthFor("host");
  }
  const joinUrl = room
    ? `${location.origin}${location.pathname}?room=${encodeURIComponent(room.code)}`
    : "";
  const pending = intros.filter(
    (i) => i.recipient_id === uid && i.status === "pending",
  ).length;
  const unreadCards = cards.filter(
    (c) => c.recipient_id === uid && !c.read_at,
  ).length;
  const inboxCount = pending + unreadCards;
  const showAdmin = owner && (!me || ownerView === "admin");
  const accepted = intros.filter((i) => ["accepted", "met"].includes(i.status));
  const exchangePerson = contactExchange
    ? members.find(
        (m) =>
          m.user_id ===
          (contactExchange.sender_id === uid
            ? contactExchange.recipient_id
            : contactExchange.sender_id),
      )
    : null;
  return (
    <div className={"room-app" + (room ? "" : " is-landing")}>
      <header className="room-header">
        <button className="wordmark" onClick={leave}>
          <span className="brand-icon">
            <Radar size={22} />
          </span>
          missed<span>connection</span>
          <b>.</b>
        </button>
        <div className="header-right">
          {isLive && user && (
            <>
              <span className="who">
                {user.isAnonymous ? "Guest" : user.email}
              </span>
              <button className="text-btn" disabled={busy} onClick={logout}>
                Log out
              </button>
            </>
          )}
          <span className="mode mode-live">
            {isLive
              ? room
                ? live
                  ? "● LIVE ROOM"
                  : "● CONNECTING"
                : "● POWERED BY SUPABASE"
              : "● LOCAL DEMO"}
          </span>
        </div>
      </header>
      <main
        className={
          room ? `room-content ${showAdmin ? "admin-mode" : ""}` : "landing"
        }
      >
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="notice success" role="status">
            <Check size={16} />
            {notice}
          </div>
        )}
        {!ready ? (
          <p className="landing-description">Loading…</p>
        ) : room ? (
          !loaded ? (
            <p className="landing-description">Opening your room…</p>
          ) : (
            <>
              <button className="text-btn back" onClick={leave}>
                <ArrowLeft size={15} /> All rooms
              </button>
              <div className="room-title-row">
                <div>
                  <div className="eyebrow">
                    <Radio size={14} />{" "}
                    {showAdmin
                      ? "YOU’RE HOSTING"
                      : "THE RIGHT PLACE. THE RIGHT PEOPLE."}
                  </div>
                  <h1 className="page-title">{room.name}</h1>
                  <p className="subtitle">
                    One good conversation could change what you build next.
                  </p>
                </div>
                <button className="primary" onClick={() => setInvite(true)}>
                  <QrCode size={17} /> Invite people
                </button>
              </div>
              {owner && me && (
                <div className="room-tabs" role="tablist">
                  {[
                    ["admin", "Organizer view"],
                    ["matches", "My matches"],
                  ].map(([id, label]) => (
                    <button
                      role="tab"
                      aria-selected={ownerView === id}
                      className={ownerView === id ? "active" : ""}
                      key={id}
                      onClick={() => setOwnerView(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {showAdmin ? (
                <Organizer
                  room={room}
                  members={members}
                  intros={intros}
                  live={live}
                  hasProfile={Boolean(me)}
                  onInvite={() => setInvite(true)}
                  onJoin={() => setJoining(true)}
                />
              ) : !me ? (
                <section className="onboard">
                  <div>
                    <Sparkles size={26} />
                    <h2>Give your next connection a starting point.</h2>
                    <p>
                      Tell us who you are, whether you’re hiring or looking for
                      work, and what you’re good at. We’ll tell you who to say
                      hello to first.
                    </p>
                  </div>
                  <ProfileForm
                    key={room.id}
                    profile={{
                      ...BLANK,
                      ...(prefill || {}),
                      email: user.email,
                    }}
                    onSave={save}
                    busy={busy}
                  />
                </section>
              ) : (
                <>
                  <section className="stat-grid">
                    <div className="stat">
                      <div className="stat-ico purple">
                        <Users size={20} />
                      </div>
                      <div>
                        <strong>
                          {members.filter((m) => m.discoverable).length}
                        </strong>
                        <span>People in the room</span>
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-ico peach">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <strong>
                          {
                            matches.filter(
                              (m) => m.match.reciprocal || m.match.hire,
                            ).length
                          }
                        </strong>
                        <span>Strong matches</span>
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-ico mint">
                        <Heart size={20} />
                      </div>
                      <div>
                        <strong>{accepted.length}</strong>
                        <span>
                          {owner
                            ? "Room introductions"
                            : "Accepted introductions"}
                        </span>
                      </div>
                    </div>
                  </section>
                  <div className="profile-strip">
                    <Avatar person={me} />
                    <div>
                      <b>Hey, {me.name.split(" ")[0]}.</b>
                      <small>
                        {[
                          roleLine(me),
                          me.discoverable
                            ? "Visible to this room"
                            : "Hidden from discovery",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => setEditing(true)}
                    >
                      Edit profile
                    </button>
                    <button
                      className={
                        "availability " + (me.available ? "available" : "")
                      }
                      disabled={busy}
                      onClick={() =>
                        save({ ...fields(me), available: !me.available })
                      }
                    >
                      <span className="dot" />
                      {me.available ? "Available to meet" : "Taking a break"}
                    </button>
                  </div>
                  <div className="room-tabs" role="tablist">
                    {[
                      ["matches", "Your connections"],
                      ["directory", "Everyone"],
                      ["inbox", `Inbox${inboxCount ? ` (${inboxCount})` : ""}`],
                    ].map(([id, label]) => (
                      <button
                        role="tab"
                        aria-selected={tab === id}
                        className={tab === id ? "active" : ""}
                        key={id}
                        onClick={() =>
                          id === "inbox"
                            ? openInbox()
                            : (setTab(id), setQuery(""))
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {tab === "inbox" ? (
                    <Inbox
                      intros={intros}
                      cards={cards}
                      members={members}
                      uid={uid}
                      room={room}
                      busy={busy}
                      onReply={reply}
                      onShare={setContactExchange}
                    />
                  ) : tab === "intros" ? (
                    <>
                      <div className="section-head">
                        <div>
                          <h2>Make the first move.</h2>
                          <p>
                            Accept an invitation, find each other, and say
                            hello.
                          </p>
                        </div>
                      </div>
                      <div className="intro-list">
                        {intros.filter((i) =>
                          [i.sender_id, i.recipient_id].includes(uid),
                        ).length ? (
                          intros
                            .filter((i) =>
                              [i.sender_id, i.recipient_id].includes(uid),
                            )
                            .map((i) => {
                              const incoming = i.recipient_id === uid,
                                p = members.find(
                                  (m) =>
                                    m.user_id ===
                                    (incoming ? i.sender_id : i.recipient_id),
                                );
                              return (
                                <article className="intro-card" key={i.id}>
                                  <Avatar person={p} />
                                  <div>
                                    <h3>{p?.name || "Participant"}</h3>
                                    <p>
                                      {i.status === "pending"
                                        ? incoming
                                          ? "Would like to meet you."
                                          : "Invitation sent. Waiting for their reply."
                                        : i.status === "declined"
                                          ? "Invitation declined."
                                          : i.status === "met"
                                            ? "You met. A connection worth keeping."
                                            : `You’re both in! Meet at ${room.meeting_point}.`}
                                    </p>
                                    {["accepted", "met"].includes(i.status) && (
                                      <>
                                        <span className="meeting-point">
                                          <MapPin size={15} />
                                          {room.meeting_point}
                                        </span>
                                        {p?.email && (
                                          <a
                                            className="meeting-point"
                                            href={`mailto:${p.email}`}
                                          >
                                            <Mail size={15} />
                                            {p.email}
                                          </a>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <div className="intro-actions">
                                    {i.status === "pending" && incoming ? (
                                      <>
                                        <button
                                          disabled={busy}
                                          className="primary"
                                          onClick={() =>
                                            reply(i.id, "accepted")
                                          }
                                        >
                                          Let’s meet
                                        </button>
                                        <button
                                          disabled={busy}
                                          className="text-btn"
                                          onClick={() =>
                                            reply(i.id, "declined")
                                          }
                                        >
                                          Decline
                                        </button>
                                      </>
                                    ) : i.status === "accepted" ? (
                                      <button
                                        disabled={busy}
                                        className="primary"
                                        onClick={() => reply(i.id, "met")}
                                      >
                                        <Check size={16} /> We met
                                      </button>
                                    ) : (
                                      <span className="chip">{i.status}</span>
                                    )}
                                  </div>
                                </article>
                              );
                            })
                        ) : (
                          <div className="empty">
                            Your next conversation starts with an invitation.
                            Find someone in Your connections.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="section-head">
                        <div>
                          <div className="eyebrow">
                            {tab === "matches"
                              ? "A REASON TO SAY HELLO"
                              : "MEET THE ROOM"}
                          </div>
                          <h2>
                            {tab === "matches"
                              ? "People worth meeting."
                              : "Different skills. Shared possibilities."}
                          </h2>
                          <p>
                            Ranked by what you’re hiring for or looking for,
                            plus skills in common. New arrivals appear live.
                          </p>
                        </div>
                      </div>
                      {tab === "directory" && (
                        <div className="search">
                          <Search size={18} />
                          <input
                            aria-label="Search attendees"
                            placeholder="Search people, companies, or skills"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="match-grid">
                        {(tab === "matches"
                          ? matches.slice(0, 6)
                          : matches
                        ).map((p) => {
                          const intro = intros.find(
                            (i) =>
                              [i.sender_id, i.recipient_id].includes(
                                p.user_id,
                              ) && [i.sender_id, i.recipient_id].includes(uid),
                          );
                          return (
                            <article className="match-card" key={p.user_id}>
                              <div className="card-top">
                                <Avatar person={p} />
                                <span
                                  className={
                                    "availability " +
                                    (p.available ? "available" : "")
                                  }
                                >
                                  {p.available ? "Open to meet" : "On a break"}
                                </span>
                              </div>
                              <div className="person-name">{p.name}</div>
                              <div className="person-headline">
                                {roleLine(p) || "Fellow attendee"}
                              </div>
                              <div>
                                <IntentBadge intent={p.intent} />
                              </div>
                              <div className="match-reason">
                                <Sparkles size={16} />
                                <b>{p.match.label}</b>
                                <span className="match-score">
                                  {Math.round(p.match.score)}% match
                                </span>
                              </div>
                              <p className="match-why">{p.match.why}</p>
                              {p.project && (
                                <>
                                  <div className="card-label">WORKING ON</div>
                                  <p className="card-copy">{p.project}</p>
                                </>
                              )}
                              <div className="chips">
                                {(p.skills || []).map((t) => (
                                  <span className="chip" key={t}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <blockquote className="talk-quote">
                                <small>TRY SAYING</small>“{p.match.icebreaker}”
                              </blockquote>
                              <button
                                className="connect"
                                disabled={
                                  busy || !p.available || Boolean(intro)
                                }
                                onClick={() => request(p)}
                              >
                                {intro
                                  ? {
                                      pending:
                                        intro.recipient_id === uid
                                          ? "Invitation received · see Inbox"
                                          : "Invitation sent",
                                      accepted: "Accepted · see Inbox",
                                      declined: "Invitation declined",
                                      met: "You met ✓",
                                    }[intro.status]
                                  : "Let’s meet"}
                                <ArrowRight size={16} />
                              </button>
                            </article>
                          );
                        })}
                        {!matches.length && (
                          <div className="empty">
                            {members.length <= 1
                              ? "You’re first! Share the room QR code. Your matches will appear as people join."
                              : "No people found. Try a different search."}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <p className="footnote">
                    <Radio size={16} />
                    {isLive
                      ? `Supabase Realtime · ${semanticState === "ready" ? "Semantic matching with pgvector" : semanticState === "loading" ? "Finding semantic connections…" : semanticState === "fallback" ? "Semantic matching unavailable · skill matching active" : "Intent and skill matching"} · Email shared only with the organizer and accepted connections`
                      : "Local demo · Fictional attendees · No shared data"}
                  </p>
                </>
              )}
            </>
          )
        ) : gate ? (
          <Gate
            room={gate}
            busy={busy}
            onAuth={authenticate}
            onGuest={joinAsGuest}
          />
        ) : (
          <>
            <div className="eyebrow">
              <span className="dot" /> LESS SMALL TALK. MORE POSSIBILITY.
            </div>
            <h1 className="landing-title">
              Your people are
              <br />
              <em>already in the room.</em>
            </h1>
            <p className="landing-description">
              Tell us whether you’re hiring or looking for work and what you’re
              good at. We’ll tell you who to say hello to first, and what to
              say.
            </p>
            <div className="sticker-row" aria-hidden="true">
              <span className="sticker s1">★ Hiring · React</span>
              <span className="sticker s2">92% match</span>
              <span className="sticker s3">✦ Open to work</span>
              <span className="sticker s4">“Hi! Loved your demo.”</span>
              <span className="sticker s5">Say hello first</span>
            </div>
            <div className="entry-grid">
              <section className="entry-card">
                <div className="stat-ico purple">
                  <QrCode size={24} />
                </div>
                <h2>Join an event</h2>
                <p>
                  Scanned a QR code? You’re almost there. Or enter the code your
                  organizer shared. No account needed.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(() => open(code.trim()));
                  }}
                >
                  <label htmlFor="room-code">ROOM CODE</label>
                  <div className="join-input">
                    <input
                      id="room-code"
                      required
                      maxLength={20}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. A1B2C3D4E5"
                      autoComplete="off"
                    />
                    <button
                      className="primary"
                      disabled={busy}
                      aria-label="Join room"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </form>
              </section>
              <section className="entry-card organizer-card">
                <div className="stat-ico mint">
                  <Users size={24} />
                </div>
                <h2>Host an event</h2>
                <p>
                  Organizers use an account. Create a room, share its QR code,
                  and see who connects with whom.
                </p>
                <button className="primary" onClick={startHosting}>
                  {isAccount ? "Create an event room" : "Log in to host"}{" "}
                  <ArrowRight size={17} />
                </button>
              </section>
            </div>
            <div className="landing-footer">
              <span>BUILT FOR THE CONNECTION YOU ALMOST MISSED</span>
              {!isLive && (
                <button
                  className="text-btn"
                  disabled={busy}
                  onClick={() => run(() => open("DEMO"))}
                >
                  Explore local demo <ArrowRight size={15} />
                </button>
              )}
            </div>
          </>
        )}
      </main>
      {authFor === "host" && (
        <Modal onClose={() => setAuthFor(null)} label="Organizer login">
          <div className="dialog-eyebrow">ORGANIZER ACCOUNT</div>
          <h2>Log in to host.</h2>
          <p>
            Organizers need an account so rooms stay yours. Guests can still
            join without one.
          </p>
          <AuthForm onSubmit={authenticate} busy={busy} />
        </Modal>
      )}
      {create && isAccount && (
        <Modal onClose={() => setCreate(false)}>
          <div className="dialog-eyebrow">HOST SOMETHING GOOD</div>
          <h2>Create your event room.</h2>
          <p>One QR code. A room full of possibilities.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await enter(await api.createRoom(draft, uid));
                setInvite(true);
              });
            }}
          >
            <label>
              Event name
              <input
                required
                maxLength={100}
                placeholder="Claude × Supabase Singapore"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Where should people meet?
              <input
                required
                maxLength={120}
                value={draft.meeting_point}
                onChange={(e) =>
                  setDraft({ ...draft, meeting_point: e.target.value })
                }
              />
            </label>
            <p className="privacy">
              Attendees scan the QR code, then log in or join as a guest. You’ll
              see everyone who joins and who they connect with.
            </p>
            <button className="primary full" disabled={busy}>
              {busy ? "Creating…" : "Create room & get QR code"}
              <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {invite && room && (
        <Modal onClose={() => setInvite(false)}>
          <div className="dialog-eyebrow">GOOD PEOPLE KNOW GOOD PEOPLE</div>
          <h2>Bring your room to life.</h2>
          <p>Scan to join {room.name}.</p>
          <div className="qr-wrap">
            <QRCodeSVG value={joinUrl} size={220} marginSize={4} level="M" />
          </div>
          <div className="invite-code">{room.code}</div>
          <p className="privacy">Or enter this code on the home page.</p>
          <button
            className="primary full"
            onClick={() =>
              run(async () => {
                await navigator.clipboard.writeText(joinUrl);
                setNotice("Invitation link copied.");
              })
            }
          >
            <Copy size={16} /> Copy invitation link
          </button>
          <input
            className="share-url"
            aria-label="Invitation link"
            readOnly
            value={joinUrl}
            onFocus={(e) => e.target.select()}
          />
          {location.hostname === "localhost" && (
            <p className="privacy">
              For phones at the event, deploy to a public URL first. This QR
              currently points to localhost.
            </p>
          )}
        </Modal>
      )}
      {editing && me && (
        <Modal onClose={() => setEditing(false)}>
          <div className="dialog-eyebrow">YOUR NEXT INTRODUCTION</div>
          <h2>What brings you here?</h2>
          <ProfileForm profile={fields(me)} onSave={save} busy={busy} editing />
        </Modal>
      )}
      {invitationTarget && me && (
        <Modal
          onClose={() => setInvitationTarget(null)}
          label="Send a meeting request"
        >
          <div className="dialog-eyebrow">START A CONVERSATION</div>
          <h2>Who should join the conversation?</h2>
          <p>Add a note and optionally bring a few more people together.</p>
          <MeetingInviteForm
            target={invitationTarget}
            people={members.filter(
              (m) =>
                m.user_id !== uid &&
                m.user_id !== invitationTarget.user_id &&
                m.discoverable &&
                m.available,
            )}
            onSubmit={submitInvitation}
            busy={busy}
          />
        </Modal>
      )}
      {celebration && (
        <div className="celebration-overlay" role="status">
          <div className="celebration-card">
            <div className="celebration-spark">✓</div>
            <div className="dialog-eyebrow">REQUEST SENT</div>
            <h2>Congratulations!</h2>
            <p>
              {celebration.kind === "accepted"
                ? `${celebration.names.join(", ")} — you’re connected. Have a great conversation!`
                : `${celebration.names.join(", ")} ${celebration.names.length === 1 ? "has" : "have"} been invited. Have a great conversation.`}
            </p>
            <button
              className="primary"
              onClick={() => {
                setCelebration(null);
                setTab("matches");
              }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}
      {contactExchange && me && (
        <Modal
          onClose={() => setContactExchange(null)}
          label="Share your contact card"
        >
          <div className="dialog-eyebrow">CONNECTION MADE</div>
          <h2>Keep the conversation going.</h2>
          <p>
            Confirm how you would like {exchangePerson?.name || "them"} to
            contact you.
          </p>
          <ContactExchangeForm
            email={me.email || user.email}
            person={exchangePerson}
            onSubmit={completeMeeting}
            busy={busy}
          />
        </Modal>
      )}
      {joining && owner && !me && (
        <Modal onClose={() => setJoining(false)}>
          <div className="dialog-eyebrow">JOIN YOUR OWN ROOM</div>
          <h2>Find your connections too.</h2>
          <p>Create a participant profile while keeping organizer access.</p>
          <ProfileForm
            profile={{ ...BLANK, email: user.email }}
            onSave={async (profile) => {
              await save(profile);
              setJoining(false);
              setOwnerView("matches");
            }}
            busy={busy}
          />
        </Modal>
      )}
    </div>
  );
}
