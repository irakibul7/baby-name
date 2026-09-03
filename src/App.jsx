import { useEffect, useState } from "react";
import {
  Baby, CheckCircle, Copy, Flask, Heart, ListBullets,
  LockKey, MagicWand, MagnifyingGlass, PencilSimple, Plus, ShareNetwork,
  Sparkle, Star, Trash, UserPlus, UsersThree, X,
} from "@phosphor-icons/react";
import {
  castFamilyPollVote,
  createFamilyName,
  createFamilyPoll,
  deleteFamilyName,
  ensureAnonymousUser,
  familyCode,
  fetchFamilyMemberCount,
  fetchFamilyNames,
  fetchFamilyPolls,
  isSupabaseConfigured,
  joinFamily,
  setFamilyNameReaction,
  subscribeToFamilyNames,
  subscribeToFamilyPolls,
  updateFamilyName,
} from "./lib/supabase";

const EMPTY_NAMES = { boy: [], girl: [] };

const generatedNames = [
  { name: "Zayd", native: "زيد", type: "boy", meaning: "Growth, abundance", origin: "Arabic" },
  { name: "Layla", native: "ليلى", type: "girl", meaning: "Night", origin: "Arabic" },
  { name: "Rayyan", native: "ريّان", type: "boy", meaning: "Watered, luxuriant", origin: "Arabic" },
  { name: "Inaya", native: "عناية", type: "girl", meaning: "Care, concern", origin: "Arabic" },
  { name: "Amir", native: "أمير", type: "boy", meaning: "Commander, prince", origin: "Arabic" },
  { name: "Noor", native: "نور", type: "girl", meaning: "Light", origin: "Arabic" },
  { name: "Arman", native: "آرمان", type: "boy", meaning: "Wish, hope", origin: "Persian" },
  { name: "Darya", native: "دریا", type: "girl", meaning: "Sea, ocean", origin: "Persian" },
  { name: "Kian", native: "کیان", type: "boy", meaning: "King, foundation, pride", origin: "Persian" },
  { name: "Shirin", native: "شیرین", type: "girl", meaning: "Sweet", origin: "Persian" },
  { name: "Navid", native: "نوید", type: "boy", meaning: "Good news", origin: "Persian" },
  { name: "Ava", native: "آوا", type: "girl", meaning: "Voice, sound", origin: "Persian" },
  { name: "Kamran", native: "کامران", type: "boy", meaning: "Prosperous, fortunate", origin: "Persian" },
  { name: "Laleh", native: "لاله", type: "girl", meaning: "Tulip", origin: "Persian" },
  { name: "Kerem", native: "کرم", type: "boy", meaning: "Generosity, nobility", origin: "Turkish" },
  { name: "Baran", native: "باران", type: "boy", meaning: "Rain", origin: "Kurdish" },
  { name: "Ayaan", native: "ایان", type: "boy", meaning: "Gift, blessing", origin: "Urdu" },
  { name: "Aylin", native: "آیلین", type: "girl", meaning: "Halo around the moon", origin: "Turkish" },
  { name: "Rojin", native: "ڕۆژین", type: "girl", meaning: "Bright as the day", origin: "Kurdish" },
  { name: "Zoya", native: "زویا", type: "girl", meaning: "Life, loving", origin: "Urdu" },
];

const originOptions = ["Arabic", "Persian", "Turkish", "Urdu", "Kurdish"];

function firstUnreviewedIndexes(names) {
  return {
    boy: Math.max(0, names.boy.findIndex((item) => !item.currentStatus)),
    girl: Math.max(0, names.girl.findIndex((item) => !item.currentStatus)),
  };
}

const USER_NAME_STORAGE_KEY = "nomi-display-name-v1";

function NameLane({ type, title, names, activeId, memberId, onToggle, onAdd, onEdit, onDelete, isMobileActive = true }) {
  return (
    <section className={`name-lane ${type} ${isMobileActive ? "" : "mobile-inactive"}`} aria-labelledby={`${type}-heading`} id={`${type}-list-panel`}>
      <div className="lane-heading">
        <span className="baby-medallion" aria-hidden="true"><Baby size={44} weight="duotone" /></span>
        <h2 id={`${type}-heading`}>{title}</h2>
      </div>
      <div className="lane-rule" aria-hidden="true"><span /><Star size={18} weight="fill" /><span /></div>
      <div className="name-list">
        {names.map((item) => {
          const canManage = item.isCustom && item.createdBy === memberId;
          return (
            <article className={`name-row ${activeId === item.id ? "active" : ""}`} key={item.id}>
              <button className="name-row-main" onClick={() => onToggle(item.id)} aria-pressed={item.liked}>
                <span className="name-identity">
                  <b>{item.name}</b>
                  {item.native && <span className="native-list-name" dir="rtl" lang={item.origin === "Arabic" ? "ar" : "fa"}>{item.native}</span>}
                  <small>{item.origin}</small>
                </span>
                <span className="star-tap-target" aria-hidden="true"><Star size={27} weight={item.liked ? "fill" : "regular"} /></span>
              </button>
              {canManage ? <div className="name-row-actions">
                <button onClick={() => onEdit(item, type)} aria-label={`Edit ${item.name}`}><PencilSimple size={18} weight="bold" /></button>
                <button onClick={() => onDelete(item, type)} aria-label={`Delete ${item.name}`}><Trash size={18} weight="bold" /></button>
              </div> : null}
            </article>
          );
        })}
      </div>
      <button className="add-lane-button" onClick={() => onAdd(type)}>
        <Plus size={24} weight="bold" /> Add your own
      </button>
    </section>
  );
}

function Dialog({ title, children, onClose }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose || undefined}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          {onClose ? <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22} weight="bold" /></button> : null}
        </div>
        {children}
      </section>
    </div>
  );
}

function NameSearch({ names, query, onQueryChange, onSelect }) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = normalizedQuery ? ["boy", "girl"].flatMap((type) => names[type]
    .filter((item) => [item.name, item.native, item.origin, item.meaning].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)))
    .map((item) => ({ ...item, type }))).slice(0, 8) : [];

  return (
    <section className="name-search" aria-label="Find a name">
      <label htmlFor="name-search"><MagnifyingGlass size={21} weight="bold" /><span>Find a name</span></label>
      <input id="name-search" type="search" dir="auto" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search name, meaning, or origin" />
      {normalizedQuery ? <div className="name-search-results" aria-live="polite">
        {results.length ? results.map((item) => (
          <button key={`${item.type}-${item.id}`} onClick={() => onSelect(item)}>
            <span><strong dir="auto">{item.name}</strong>{item.native ? <em dir="rtl">{item.native}</em> : null}</span>
            <small>{item.type} · {item.origin}</small>
            <p>{item.meaning}</p>
          </button>
        )) : <p className="no-search-results">No matching family names yet.</p>}
      </div> : null}
    </section>
  );
}

function NameLab({ onSave }) {
  const [origin, setOrigin] = useState("either");
  const [resultIndex, setResultIndex] = useState(0);
  const filteredNames = origin === "either" ? generatedNames : generatedNames.filter((item) => item.origin === origin);
  const result = filteredNames[resultIndex % filteredNames.length];
  const chooseOrigin = (value) => {
    setOrigin(value);
    setResultIndex(0);
  };
  return (
    <section className="feature-view name-lab-view">
      <div className="feature-copy">
        <span className="eyebrow"><Sparkle size={18} weight="fill" /> Meaningful heritage names</span>
        <h1>Find a name rooted in heritage.</h1>
        <p>Explore meaningful names across five heritages for both lists. The gender stays a surprise.</p>
        <fieldset className="theme-picker">
          <legend>Which heritage should we explore?</legend>
          {["Surprise me", ...originOptions].map((label) => (
            <button key={label} className={origin === (label === "Surprise me" ? "either" : label) ? "selected" : ""} onClick={() => chooseOrigin(label === "Surprise me" ? "either" : label)}>{label}</button>
          ))}
        </fieldset>
        <button className="primary-button lab-generate" onClick={() => setResultIndex((index) => (index + 1) % generatedNames.length)}>
          <MagicWand size={22} weight="bold" /> Generate another
        </button>
      </div>
      <article className={`generated-card ${result.type}`} aria-live="polite">
        <span className="generated-label">{result.origin} · {result.type} name</span>
        <h2>{result.name}</h2>
        <span className="generated-native" dir="rtl" lang={result.origin === "Arabic" ? "ar" : "fa"}>{result.native}</span>
        <p>{result.meaning}</p>
        <button onClick={() => onSave(result)}><Plus size={20} weight="bold" /> Save to {result.type} list</button>
      </article>
    </section>
  );
}

function PollCard({ poll, candidates, onVote, disabled = false }) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const hasVoted = Boolean(poll.votedOptionId);

  return (
    <article className={`community-poll ${poll.type}`}>
      <header className="community-poll-meta">
        <span><Baby size={18} weight="duotone" /> {poll.type} names</span>
        <small>By {poll.createdBy}</small>
      </header>
      <h2>{poll.question}</h2>
      <div className="poll-choices">
        {poll.options.map((option) => {
          const percent = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
          const selected = poll.votedOptionId === option.id;
          const details = candidates.find((item) => item.name.toLocaleLowerCase() === option.name.toLocaleLowerCase() || item.native === option.name);
          return (
            <button
              key={option.id}
              className={`poll-choice ${selected ? "chosen" : ""}`}
              onClick={() => onVote(poll.id, option.id)}
              disabled={hasVoted || disabled}
              aria-pressed={selected}
            >
              <span className="poll-choice-copy">
                <strong dir="auto">{option.name}</strong>
                {details?.native && details.native !== option.name && <em dir="rtl" lang={details.origin === "Arabic" ? "ar" : "fa"}>{details.native}</em>}
              </span>
              <span className="poll-choice-result">{hasVoted ? `${percent}%` : "Vote"}</span>
              {hasVoted && <i className="poll-progress" style={{ width: `${percent}%` }} aria-hidden="true" />}
              {selected && <CheckCircle size={22} weight="fill" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <footer aria-live="polite">{hasVoted ? "Thanks — your vote is in." : `${totalVotes} ${totalVotes === 1 ? "vote" : "votes"} · Choose one name`}</footer>
    </article>
  );
}

function FamilyPoll({ names, familySession }) {
  const [polls, setPolls] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [pollType, setPollType] = useState("boy");
  const [question, setQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollError, setPollError] = useState("");
  const [pollSyncError, setPollSyncError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [votingPollId, setVotingPollId] = useState(null);

  useEffect(() => {
    if (familySession.status !== "ready" || !familySession.userId) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const remotePolls = await fetchFamilyPolls(familySession.userId, familyCode);
        if (cancelled) return;
        setPolls(remotePolls);
        setPollSyncError("");
      } catch (error) {
        if (!cancelled) setPollSyncError(error.message || "Could not refresh family polls.");
      }
    };
    void refresh();
    const unsubscribe = subscribeToFamilyPolls(familyCode, refresh);
    return () => { cancelled = true; unsubscribe(); };
  }, [familySession.status, familySession.userId]);

  const syncStatus = familySession.status === "ready" && pollSyncError ? "error" : familySession.status;
  const syncError = pollSyncError || familySession.error;

  const openCreatePoll = (type = "boy") => {
    setPollType(type);
    setQuestion("");
    setPollOptions(["", ""]);
    setPollError("");
    setIsCreating(true);
  };
  const updatePollOption = (index, value) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  const castVote = async (pollId, optionId) => {
    if (!familySession.userId || votingPollId) return;
    try {
      setVotingPollId(pollId);
      await castFamilyPollVote(pollId, optionId);
      setPolls(await fetchFamilyPolls(familySession.userId, familyCode));
      setPollSyncError("");
    } catch (error) {
      setPollSyncError(error.message || "Your vote could not be saved.");
    } finally {
      setVotingPollId(null);
    }
  };
  const createPoll = async (event) => {
    event.preventDefault();
    const uniqueNames = pollOptions
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, allNames) => allNames.findIndex((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()) === index);
    if (uniqueNames.length < 2) {
      setPollError("Add at least two different names.");
      return;
    }
    const pollQuestion = question.trim() || `Which ${pollType} name is your favorite?`;

    if (!familySession.userId) {
      setPollError("The family database is still connecting. Try again in a moment.");
      return;
    }

    try {
      setPublishing(true);
      await createFamilyPoll({ code: familyCode, type: pollType, question: pollQuestion, names: uniqueNames });
      setPolls(await fetchFamilyPolls(familySession.userId, familyCode));
      setIsCreating(false);
      setPollSyncError("");
    } catch (error) {
      setPollError(error.message || "The poll could not be published.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="feature-view poll-view">
      <div className="poll-heading">
        <span className="eyebrow"><UsersThree size={19} weight="fill" /> Family polls</span>
        <h1>Everyone gets a voice.</h1>
        <p>Create a poll for boy or girl names, suggest your favorites, and let the family vote.</p>
        <button className="primary-button create-poll-button" onClick={() => openCreatePoll()} disabled={syncStatus === "connecting" || syncStatus === "error"}><Plus size={21} weight="bold" /> Create a new poll</button>
      </div>

      <div className={`poll-sync-status ${syncStatus}`} role="status">
        {syncStatus === "ready" && <><CheckCircle size={18} weight="fill" /> Live family polls · code {familyCode}</>}
        {syncStatus === "connecting" && <>Connecting to the family database…</>}
        {syncStatus === "error" && <>Family polls are temporarily unavailable{import.meta.env.DEV && syncError ? ` · ${syncError}` : ""}</>}
      </div>

      <div className="poll-groups">
        {["boy", "girl"].map((type) => {
          const typePolls = polls.filter((poll) => poll.type === type);
          return (
            <section className={`poll-group ${type}`} key={type} aria-labelledby={`${type}-poll-heading`}>
              <div className="poll-group-heading">
                <span className="baby-medallion" aria-hidden="true"><Baby size={31} weight="duotone" /></span>
                <div><h2 id={`${type}-poll-heading`}>{type === "boy" ? "Boy polls" : "Girl polls"}</h2><p>{typePolls.length} active {typePolls.length === 1 ? "poll" : "polls"}</p></div>
              </div>
              <div className="poll-stack">
                {typePolls.length ? typePolls.map((poll) => <PollCard key={poll.id} poll={poll} candidates={[...names[type], ...generatedNames.filter((item) => item.type === type)]} onVote={castVote} disabled={votingPollId === poll.id} />) : <div className="empty-poll-state"><Sparkle size={22} weight="duotone" /><p>No {type} polls yet.</p><button onClick={() => openCreatePoll(type)}>Create the first one</button></div>}
              </div>
            </section>
          );
        })}
      </div>

      {isCreating && <Dialog title="Create a family poll" onClose={() => setIsCreating(false)}>
        <form className="create-poll-form" onSubmit={createPoll}>
          <p className="dialog-copy">Choose one list, then suggest 2–5 names for everyone to vote on.</p>
          <fieldset><legend>This poll is for</legend><div className="poll-type-choice">
            {[{ value: "boy", label: "Boy names" }, { value: "girl", label: "Girl names" }].map((item) => (
              <button type="button" key={item.value} className={pollType === item.value ? "selected" : ""} onClick={() => { setPollType(item.value); setPollError(""); }}>{item.label}</button>
            ))}
          </div></fieldset>
          <label htmlFor="poll-question">Question <small>optional</small></label>
          <input id="poll-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={`Which ${pollType} name is your favorite?`} />
          <fieldset className="poll-name-fields"><legend>Name suggestions</legend>
            <datalist id={`${pollType}-poll-suggestions`}>
              {names[pollType].flatMap((item) => [<option key={`${item.id}-latin`} value={item.name}>{item.native}</option>, <option key={`${item.id}-native`} value={item.native}>{item.name}</option>])}
            </datalist>
            {pollOptions.map((value, index) => (
              <div className="poll-option-input" key={index}>
                <input dir="auto" list={`${pollType}-poll-suggestions`} value={value} onChange={(event) => { updatePollOption(index, event.target.value); setPollError(""); }} aria-label={`Name suggestion ${index + 1}`} placeholder={`Name ${index + 1}`} />
                {pollOptions.length > 2 && <button type="button" onClick={() => setPollOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove name ${index + 1}`}><X size={18} weight="bold" /></button>}
              </div>
            ))}
            {pollOptions.length < 5 && <button className="add-poll-option" type="button" onClick={() => setPollOptions((current) => [...current, ""])}><Plus size={18} weight="bold" /> Add another name</button>}
          </fieldset>
          {pollError && <p className="poll-error" role="alert">{pollError}</p>}
          <button className="primary-button publish-poll-button" type="submit" disabled={publishing}>{publishing ? "Publishing…" : "Publish poll"}</button>
        </form>
      </Dialog>}
    </section>
  );
}

export function App() {
  const [userName, setUserName] = useState(() => {
    try {
      return window.localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() || "";
    } catch {
      return "";
    }
  });
  const [draftUserName, setDraftUserName] = useState("");
  const [userNameError, setUserNameError] = useState("");
  const [activeView, setActiveView] = useState("lists");
  const [names, setNames] = useState(EMPTY_NAMES);
  const [familySession, setFamilySession] = useState({
    status: isSupabaseConfigured ? "connecting" : "error",
    userId: null,
    familyId: null,
    memberId: null,
    memberCount: 0,
    error: isSupabaseConfigured ? "" : "Supabase is not configured.",
  });
  const [familyActionError, setFamilyActionError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [swipeIndexes, setSwipeIndexes] = useState({ boy: 0, girl: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [newName, setNewName] = useState("");
  const [newNameNative, setNewNameNative] = useState("");
  const [newNameMeaning, setNewNameMeaning] = useState("");
  const [newNameType, setNewNameType] = useState("boy");
  const [newNameOrigin, setNewNameOrigin] = useState("Arabic");
  const [selectedCustomName, setSelectedCustomName] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", native: "", meaning: "", origin: "Arabic", type: "boy" });
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [mobileLane, setMobileLane] = useState("boy");
  const currentBoy = names.boy.length ? names.boy[swipeIndexes.boy % names.boy.length] : null;
  const currentGirl = names.girl.length ? names.girl[swipeIndexes.girl % names.girl.length] : null;
  const currentSwipeName = mobileLane === "boy" ? currentBoy : currentGirl;

  useEffect(() => {
    if (!userName || !isSupabaseConfigured) return undefined;
    let cancelled = false;
    const connect = async () => {
      try {
        setFamilySession((current) => ({ ...current, status: "connecting", error: "" }));
        const user = await ensureAnonymousUser(userName);
        const context = await joinFamily(familyCode, userName);
        if (!context?.family_id || !context?.member_id) {
          throw new Error("Run the latest Supabase migration before using shared family data.");
        }
        const [familyNames, memberCount] = await Promise.all([
          fetchFamilyNames(context.family_id, context.member_id),
          fetchFamilyMemberCount(context.family_id),
        ]);
        if (cancelled) return;
        setNames(familyNames);
        setSwipeIndexes(firstUnreviewedIndexes(familyNames));
        setFamilySession({
          status: "ready",
          userId: user.id,
          familyId: context.family_id,
          memberId: context.member_id,
          memberCount,
          error: "",
        });
      } catch (error) {
        if (!cancelled) {
          setFamilySession((current) => ({ ...current, status: "error", error: error.message || "Could not join this family." }));
        }
      }
    };
    void connect();
    return () => { cancelled = true; };
  }, [userName]);

  useEffect(() => {
    if (familySession.status !== "ready" || !familySession.familyId || !familySession.memberId) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const [familyNames, memberCount] = await Promise.all([
          fetchFamilyNames(familySession.familyId, familySession.memberId),
          fetchFamilyMemberCount(familySession.familyId),
        ]);
        if (cancelled) return;
        setNames(familyNames);
        setFamilySession((current) => ({ ...current, memberCount, error: "" }));
        setFamilyActionError("");
      } catch (error) {
        if (!cancelled) setFamilyActionError(error.message || "Could not refresh family names.");
      }
    };
    const unsubscribe = subscribeToFamilyNames(familySession.familyId, refresh);
    return () => { cancelled = true; unsubscribe(); };
  }, [familySession.status, familySession.familyId, familySession.memberId]);

  const refreshNames = async () => {
    if (!familySession.familyId || !familySession.memberId) return;
    const familyNames = await fetchFamilyNames(familySession.familyId, familySession.memberId);
    setNames(familyNames);
  };

  const toggleName = async (type, id) => {
    if (familySession.status !== "ready") return;
    const item = names[type].find((name) => name.id === id);
    if (!item) return;
    const nextStatus = item.currentStatus === "favorite" ? "passed" : "favorite";
    setNames((current) => ({
      ...current,
      [type]: current[type].map((name) => name.id === id ? { ...name, liked: nextStatus === "favorite", currentStatus: nextStatus } : name),
    }));
    try {
      await setFamilyNameReaction(id, nextStatus);
      await refreshNames();
      setFamilyActionError("");
    } catch (error) {
      await refreshNames().catch(() => undefined);
      setFamilyActionError(error.message || "Could not save that favorite.");
    }
  };
  const openAddDialog = (type) => {
    setNewNameType(type);
    setNewName("");
    setNewNameNative("");
    setNewNameMeaning("");
    setNewNameOrigin("Arabic");
    setDialog("add");
  };
  const addName = async (event) => {
    event.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName || !familySession.familyId) return;
    try {
      setSavingName(true);
      const nameId = await createFamilyName({
        familyId: familySession.familyId,
        name: cleanName,
        native: newNameNative.trim(),
        origin: newNameOrigin,
        meaning: newNameMeaning.trim() || "Family suggestion",
        type: newNameType,
      });
      await setFamilyNameReaction(nameId, "favorite");
      await refreshNames();
      setDialog(null);
      setFamilyActionError("");
    } catch (error) {
      setFamilyActionError(error.message || "Could not add that name.");
    } finally {
      setSavingName(false);
    }
  };
  const saveGenerated = async (result) => {
    if (!familySession.familyId) return;
    try {
      const existing = names[result.type].find((item) => item.name === result.name);
      const nameId = existing?.id || await createFamilyName({ familyId: familySession.familyId, ...result, isCustom: false });
      await setFamilyNameReaction(nameId, "favorite");
      await refreshNames();
      setActiveView("lists");
      setFamilyActionError("");
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      setFamilyActionError(error.message || "Could not save that name.");
    }
  };
  const openEditDialog = (item, type) => {
    setSelectedCustomName(item);
    setEditDraft({ name: item.name, native: item.native, meaning: item.meaning, origin: item.origin, type });
    setDialog("edit");
  };
  const saveEditedName = async (event) => {
    event.preventDefault();
    if (!selectedCustomName || !editDraft.name.trim()) return;
    try {
      setSavingName(true);
      await updateFamilyName({ id: selectedCustomName.id, ...editDraft });
      await refreshNames();
      setDialog(null);
      setSelectedCustomName(null);
      setFamilyActionError("");
    } catch (error) {
      setFamilyActionError(error.message || "Could not update that name.");
    } finally {
      setSavingName(false);
    }
  };
  const openDeleteDialog = (item, type) => {
    setSelectedCustomName({ ...item, type });
    setDialog("delete");
  };
  const confirmDeleteName = async () => {
    if (!selectedCustomName) return;
    try {
      setSavingName(true);
      await deleteFamilyName(selectedCustomName.id);
      await refreshNames();
      setDialog(null);
      setSelectedCustomName(null);
      setFamilyActionError("");
    } catch (error) {
      setFamilyActionError(error.message || "Could not delete that name.");
    } finally {
      setSavingName(false);
    }
  };
  const selectSearchResult = (item) => {
    const index = names[item.type].findIndex((name) => name.id === item.id);
    if (index >= 0) setSwipeIndexes((current) => ({ ...current, [item.type]: index }));
    setMobileLane(item.type);
    setSearchQuery("");
    window.setTimeout(() => document.getElementById("match-heading")?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  };
  const performSwipe = (direction) => {
    if (swipeDirection || !currentSwipeName || familySession.status !== "ready") return;
    const type = mobileLane;
    const targetId = currentSwipeName.id;
    const nextStatus = direction === "right" ? "favorite" : "passed";
    setNames((current) => ({
      ...current,
      [type]: current[type].map((item) => item.id === targetId ? { ...item, liked: nextStatus === "favorite", currentStatus: nextStatus } : item),
    }));
    void setFamilyNameReaction(targetId, nextStatus)
      .then(() => refreshNames())
      .catch((error) => setFamilyActionError(error.message || "Could not save that swipe."));
    setSwipeDirection(direction);
    setDragX(direction === "right" ? 520 : -520);
    window.setTimeout(() => {
      setSwipeIndexes((current) => ({ ...current, [type]: current[type] + 1 }));
      setDragX(0);
      setSwipeDirection(null);
    }, 260);
  };
  const beginSwipe = (event) => {
    if (swipeDirection || (event.button !== undefined && event.button !== 0)) return;
    setDragStart(event.clientX);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveSwipe = (event) => {
    if (dragStart === null || swipeDirection) return;
    setDragX(Math.max(-170, Math.min(170, event.clientX - dragStart)));
  };
  const endSwipe = (event) => {
    if (dragStart === null || swipeDirection) return;
    const distance = event.clientX - dragStart;
    setDragStart(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (Math.abs(distance) >= 70) performSwipe(distance > 0 ? "right" : "left");
    else setDragX(0);
  };
  const cancelSwipe = () => { setDragStart(null); setDragX(0); };
  const inviteUrl = `${window.location.origin}/join/${familyCode}`;
  const copyInvite = async () => { await navigator.clipboard?.writeText(inviteUrl); setCopied(true); };
  const changeView = (view) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const navItems = [
    { id: "lists", label: "Our Lists", icon: ListBullets },
    { id: "lab", label: "Name Lab", icon: Flask },
    { id: "poll", label: "Family Polls", icon: UsersThree },
  ];

  const saveUserName = (event) => {
    event.preventDefault();
    const cleanUserName = draftUserName.trim();
    if (cleanUserName.length < 2) {
      setUserNameError("Please enter at least 2 characters.");
      return;
    }
    try {
      window.localStorage.setItem(USER_NAME_STORAGE_KEY, cleanUserName);
    } catch {
      // The name still works for this session when browser storage is unavailable.
    }
    setUserName(cleanUserName);
    setUserNameError("");
  };

  if (!userName) {
    return (
      <main className="app-shell onboarding-shell">
        <div className="onboarding-brand" aria-hidden="true">Nomi <Star size={25} weight="fill" /></div>
        <Dialog title="Welcome to Nomi">
          <form className="user-name-form" onSubmit={saveUserName}>
            <p className="dialog-copy">No email or password. Just add your name so family members know who created each poll.</p>
            <label htmlFor="user-name">What should we call you?</label>
            <input
              id="user-name"
              dir="auto"
              autoFocus
              autoComplete="nickname"
              maxLength={40}
              value={draftUserName}
              onChange={(event) => { setDraftUserName(event.target.value); setUserNameError(""); }}
              placeholder="Your name"
            />
            {userNameError ? <p className="user-name-error" role="alert">{userNameError}</p> : null}
            <button className="primary-button" type="submit">Continue</button>
            <small>Your name is only used inside this family space.</small>
          </form>
        </Dialog>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => changeView("lists")} aria-label="Nomi home">Nomi <Star size={25} weight="fill" /></button>
        <nav aria-label="Primary navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? "active" : ""} aria-current={activeView === id ? "page" : undefined} onClick={() => changeView(id)}>
              <Icon size={25} weight={activeView === id ? "fill" : "bold"} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="invite-button" onClick={() => setDialog("invite")} aria-label="Invite Family"><UserPlus size={23} weight="bold" /><span>Invite Family</span></button>
      </header>

      {activeView === "lists" && <>
        <div className="privacy-banner">
          <span><LockKey size={22} weight="bold" /> Gender stays a surprise</span><i aria-hidden="true" />
          <span className="member-status"><UsersThree size={25} weight="bold" /><span className="member-long">{familySession.memberCount} family {familySession.memberCount === 1 ? "member has" : "members have"} joined</span><span className="member-short">{familySession.memberCount} joined</span></span>
        </div>
        {familySession.status !== "ready" ? <div className={`family-sync-status ${familySession.status}`} role="status">{familySession.status === "connecting" ? "Loading your shared family space…" : "Family data is unavailable. Please check the Supabase setup."}</div> : null}
        {familyActionError ? <div className="family-action-error" role="alert">{familyActionError}</div> : null}
        <NameSearch names={names} query={searchQuery} onQueryChange={setSearchQuery} onSelect={selectSearchResult} />
        <section className="match-layout">
          <NameLane type="boy" title="Boy Names" names={names.boy} activeId={currentBoy?.id} memberId={familySession.memberId} onToggle={(id) => toggleName("boy", id)} onAdd={openAddDialog} onEdit={openEditDialog} onDelete={openDeleteDialog} isMobileActive={mobileLane === "boy"} />
          <section className="match-stage" aria-labelledby="match-heading">
            <div className="accent-rays" aria-hidden="true"><Sparkle size={32} weight="fill" /></div>
            <h1 id="match-heading">Swipe your way<br />to a favorite</h1>
            <p className="swipe-intro">One meaningful name at a time.</p>
            <div className="swipe-type-switcher" role="tablist" aria-label="Choose names to review">
              {[{ type: "boy", label: "Boy list", count: names.boy.length }, { type: "girl", label: "Girl list", count: names.girl.length }].map((lane) => (
                <button
                  key={lane.type}
                  role="tab"
                  aria-selected={mobileLane === lane.type}
                  className={mobileLane === lane.type ? "active" : ""}
                  onClick={() => { if (!swipeDirection) { setMobileLane(lane.type); setDragStart(null); setDragX(0); } }}
                >
                  {lane.label}<span>{lane.count}</span>
                </button>
              ))}
            </div>
            <div className="swipe-deck">
              {currentSwipeName ? <article
                className={`swipe-card ${mobileLane} ${dragStart !== null ? "dragging" : ""}`}
                style={{ transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)`, opacity: Math.max(0.38, 1 - Math.abs(dragX) / 520) }}
                onPointerDown={beginSwipe}
                onPointerMove={moveSwipe}
                onPointerUp={endSwipe}
                onPointerCancel={cancelSwipe}
                aria-live="polite"
              >
                <span className="swipe-stamp pass" style={{ opacity: Math.max(0, -dragX / 90) }}>Pass</span>
                <span className="swipe-stamp favorite" style={{ opacity: Math.max(0, dragX / 90) }}>Favorite</span>
                <div className="swipe-card-topline"><span>{currentSwipeName.origin} · {mobileLane} name</span><small>{(swipeIndexes[mobileLane] % names[mobileLane].length) + 1} of {names[mobileLane].length}</small></div>
                <div className="swipe-card-copy">
                  <strong>{currentSwipeName.name}</strong>
                  {currentSwipeName.native && <span className="swipe-native" dir="rtl" lang={currentSwipeName.origin === "Arabic" ? "ar" : "fa"}>{currentSwipeName.native}</span>}
                  <i>Meaning</i>
                  <p>{currentSwipeName.meaning}</p>
                </div>
                <span className="swipe-card-hint">Drag the card left or right</span>
              </article> : <div className="swipe-card swipe-card-loading" role="status"><Sparkle size={30} weight="duotone" /><strong>{familySession.status === "error" ? "Names unavailable" : "Loading names…"}</strong></div>}
            </div>
            <div className="swipe-actions" aria-label="Choose this name">
              <button className="swipe-action pass" onClick={() => performSwipe("left")} disabled={Boolean(swipeDirection) || !currentSwipeName}><X size={28} weight="bold" /><span>Pass</span></button>
              <button className="swipe-action favorite" onClick={() => performSwipe("right")} disabled={Boolean(swipeDirection) || !currentSwipeName}><Heart size={29} weight="fill" /><span>Favorite</span></button>
            </div>
            <p className="swipe-help"><span>← Swipe left to pass</span><span>Swipe right to favorite →</span></p>
            <button className="secondary-button" onClick={() => openAddDialog(mobileLane)}><Plus size={21} weight="bold" /> Add your own</button>
          </section>
          <NameLane type="girl" title="Girl Names" names={names.girl} activeId={currentGirl?.id} memberId={familySession.memberId} onToggle={(id) => toggleName("girl", id)} onAdd={openAddDialog} onEdit={openEditDialog} onDelete={openDeleteDialog} isMobileActive={mobileLane === "girl"} />
        </section>
      </>}

      {activeView === "lab" && <NameLab onSave={saveGenerated} />}
      {activeView === "poll" && <FamilyPoll names={names} familySession={familySession} />}
      <div className="mobile-nav-spacer" aria-hidden="true" />

      {dialog === "add" && <Dialog title="Add a name you love" onClose={() => setDialog(null)}>
        <form className="add-form" onSubmit={addName}>
          <label htmlFor="new-name">Name</label>
          <input id="new-name" dir="auto" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Type a name in either script" />
          <label htmlFor="new-name-native">Native script <small>optional</small></label>
          <input id="new-name-native" dir="auto" value={newNameNative} onChange={(event) => setNewNameNative(event.target.value)} placeholder="Arabic, Persian, Urdu, or Kurdish script" />
          <label htmlFor="new-name-meaning">Meaning <small>optional</small></label>
          <input id="new-name-meaning" value={newNameMeaning} onChange={(event) => setNewNameMeaning(event.target.value)} placeholder="What does the name mean?" />
          <fieldset><legend>Add it to</legend><div className="type-choice">
            {[["boy", "Boy list"], ["girl", "Girl list"]].map(([value, label]) => <button type="button" key={value} className={newNameType === value ? "selected" : ""} onClick={() => setNewNameType(value)}>{label}</button>)}
          </div></fieldset>
          <fieldset><legend>Name origin</legend><div className="type-choice">
            {originOptions.map((value) => <button type="button" key={value} className={newNameOrigin === value ? "selected" : ""} onClick={() => setNewNameOrigin(value)}>{value}</button>)}
          </div></fieldset>
          {familyActionError ? <p className="poll-error" role="alert">{familyActionError}</p> : null}
          <button className="primary-button" type="submit" disabled={savingName || familySession.status !== "ready"}>{savingName ? "Saving…" : "Add to our list"}</button>
        </form>
      </Dialog>}

      {dialog === "edit" && selectedCustomName ? <Dialog title={`Edit ${selectedCustomName.name}`} onClose={() => setDialog(null)}>
        <form className="add-form" onSubmit={saveEditedName}>
          <label htmlFor="edit-name">Name</label>
          <input id="edit-name" dir="auto" autoFocus value={editDraft.name} onChange={(event) => setEditDraft((current) => ({ ...current, name: event.target.value }))} />
          <label htmlFor="edit-native">Native script <small>optional</small></label>
          <input id="edit-native" dir="auto" value={editDraft.native} onChange={(event) => setEditDraft((current) => ({ ...current, native: event.target.value }))} />
          <label htmlFor="edit-meaning">Meaning</label>
          <input id="edit-meaning" value={editDraft.meaning} onChange={(event) => setEditDraft((current) => ({ ...current, meaning: event.target.value }))} />
          <fieldset><legend>List</legend><div className="type-choice">
            {[["boy", "Boy list"], ["girl", "Girl list"]].map(([value, label]) => <button type="button" key={value} className={editDraft.type === value ? "selected" : ""} onClick={() => setEditDraft((current) => ({ ...current, type: value }))}>{label}</button>)}
          </div></fieldset>
          <fieldset><legend>Name origin</legend><div className="type-choice">
            {originOptions.map((value) => <button type="button" key={value} className={editDraft.origin === value ? "selected" : ""} onClick={() => setEditDraft((current) => ({ ...current, origin: value }))}>{value}</button>)}
          </div></fieldset>
          {familyActionError ? <p className="poll-error" role="alert">{familyActionError}</p> : null}
          <button className="primary-button" type="submit" disabled={savingName}>{savingName ? "Saving…" : "Save changes"}</button>
        </form>
      </Dialog> : null}

      {dialog === "delete" && selectedCustomName ? <Dialog title="Delete this name?" onClose={() => setDialog(null)}>
        <p className="dialog-copy"><strong dir="auto">{selectedCustomName.name}</strong> will be removed from this family’s {selectedCustomName.type} list. Existing poll labels will remain.</p>
        {familyActionError ? <p className="poll-error" role="alert">{familyActionError}</p> : null}
        <div className="delete-dialog-actions">
          <button className="secondary-dialog-button" onClick={() => setDialog(null)}>Keep name</button>
          <button className="danger-button" onClick={confirmDeleteName} disabled={savingName}>{savingName ? "Deleting…" : "Delete name"}</button>
        </div>
      </Dialog> : null}

      {dialog === "invite" && <Dialog title="Bring your favorite people in" onClose={() => setDialog(null)}>
        <p className="dialog-copy">Anyone with this private link can suggest names and vote. The gender still stays hidden.</p>
        <div className="invite-link"><span>{inviteUrl.replace(/^https?:\/\//, "")}</span><button onClick={copyInvite}>{copied ? <CheckCircle size={21} weight="fill" /> : <Copy size={21} weight="bold" />}{copied ? "Copied" : "Copy"}</button></div>
        <button className="primary-button share-button" onClick={copyInvite}><ShareNetwork size={22} weight="bold" /> Share invite</button>
      </Dialog>}
    </main>
  );
}
