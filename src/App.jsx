import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Baby, CheckCircle, Copy, Flask, Heart, ListBullets,
  LockKey, MagicWand, Plus, ShareNetwork, Sparkle, Star, UserPlus,
  UsersThree, X,
} from "@phosphor-icons/react";

const starterNames = {
  boy: [
    { name: "Zayn", native: "زين", origin: "Arabic", meaning: "Beauty, grace" },
    { name: "Rayyan", native: "ريّان", origin: "Arabic", meaning: "Watered, luxuriant" },
    { name: "Amir", native: "أمير", origin: "Arabic", meaning: "Commander, prince" },
    { name: "Arman", native: "آرمان", origin: "Persian", meaning: "Wish, hope" },
    { name: "Kian", native: "کیان", origin: "Persian", meaning: "King, foundation, pride" },
  ].map((item, index) => ({ ...item, id: `b${index}`, liked: item.name === "Zayn" })),
  girl: [
    { name: "Layla", native: "ليلى", origin: "Arabic", meaning: "Night" },
    { name: "Inaya", native: "عناية", origin: "Arabic", meaning: "Care, concern" },
    { name: "Noor", native: "نور", origin: "Arabic", meaning: "Light" },
    { name: "Darya", native: "دریا", origin: "Persian", meaning: "Sea, ocean" },
    { name: "Shirin", native: "شیرین", origin: "Persian", meaning: "Sweet" },
  ].map((item, index) => ({ ...item, id: `g${index}`, liked: item.name === "Shirin" })),
};

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
];

const POLL_STORAGE_KEY = "nomi-family-polls-v1";
const starterPolls = [
  {
    id: "starter-boy-poll",
    type: "boy",
    question: "Which boy name feels strongest?",
    createdBy: "Nomi family",
    votedOptionId: null,
    options: [
      { id: "boy-zayn", name: "Zayn", votes: 8 },
      { id: "boy-arman", name: "Arman", votes: 5 },
      { id: "boy-kian", name: "Kian", votes: 7 },
    ],
  },
  {
    id: "starter-girl-poll",
    type: "girl",
    question: "Which girl name feels sweetest?",
    createdBy: "Nomi family",
    votedOptionId: null,
    options: [
      { id: "girl-layla", name: "Layla", votes: 6 },
      { id: "girl-darya", name: "Darya", votes: 8 },
      { id: "girl-shirin", name: "Shirin", votes: 10 },
    ],
  },
];

function NameLane({ type, title, names, activeId, onToggle, onAdd, isMobileActive = true }) {
  return (
    <section className={`name-lane ${type} ${isMobileActive ? "" : "mobile-inactive"}`} aria-labelledby={`${type}-heading`} id={`${type}-list-panel`}>
      <div className="lane-heading">
        <span className="baby-medallion" aria-hidden="true"><Baby size={44} weight="duotone" /></span>
        <h2 id={`${type}-heading`}>{title}</h2>
      </div>
      <div className="lane-rule" aria-hidden="true"><span /><Star size={18} weight="fill" /><span /></div>
      <div className="name-list">
        {names.map((item) => (
          <button
            className={`name-row ${activeId === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => onToggle(item.id)}
            aria-pressed={item.liked}
          >
            <span className="name-identity">
              <b>{item.name}</b>
              {item.native && <span className="native-list-name" dir="rtl" lang={item.origin === "Arabic" ? "ar" : "fa"}>{item.native}</span>}
              <small>{item.origin}</small>
            </span>
            <Star size={27} weight={item.liked ? "fill" : "regular"} />
          </button>
        ))}
      </div>
      <button className="add-lane-button" onClick={() => onAdd(type)}>
        <Plus size={24} weight="bold" /> Add your own
      </button>
    </section>
  );
}

function Dialog({ title, children, onClose }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22} weight="bold" /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function NameLab({ onSave }) {
  const [origin, setOrigin] = useState("either");
  const [resultIndex, setResultIndex] = useState(0);
  const filteredNames = origin === "either" ? generatedNames : generatedNames.filter((item) => item.origin.toLowerCase() === origin);
  const result = filteredNames[resultIndex % filteredNames.length];
  const chooseOrigin = (value) => {
    setOrigin(value);
    setResultIndex(0);
  };
  return (
    <section className="feature-view name-lab-view">
      <div className="feature-copy">
        <span className="eyebrow"><Sparkle size={18} weight="fill" /> Arabic &amp; Persian names</span>
        <h1>Find a name rooted in heritage.</h1>
        <p>Explore meaningful Arabic and Persian names for both lists. The gender stays a surprise.</p>
        <fieldset className="theme-picker">
          <legend>Which heritage should we explore?</legend>
          {[{ value: "either", label: "Surprise me" }, { value: "arabic", label: "Arabic" }, { value: "persian", label: "Persian" }].map((item) => (
            <button key={item.value} className={origin === item.value ? "selected" : ""} onClick={() => chooseOrigin(item.value)}>{item.label}</button>
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

function PollCard({ poll, candidates, onVote }) {
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
              disabled={hasVoted}
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
      <footer aria-live="polite">{hasVoted ? "Thanks — your vote is in." : `${totalVotes} votes · Choose one name`}</footer>
    </article>
  );
}

function FamilyPoll({ names }) {
  const [polls, setPolls] = useState(() => {
    try {
      const savedPolls = window.localStorage.getItem(POLL_STORAGE_KEY);
      const parsedPolls = savedPolls ? JSON.parse(savedPolls) : null;
      return Array.isArray(parsedPolls) ? parsedPolls : starterPolls;
    } catch {
      return starterPolls;
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [pollType, setPollType] = useState("boy");
  const [question, setQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollError, setPollError] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(POLL_STORAGE_KEY, JSON.stringify(polls));
    } catch {
      // Polls still work for this session when browser storage is unavailable.
    }
  }, [polls]);

  const openCreatePoll = () => {
    setPollType("boy");
    setQuestion("");
    setPollOptions(["", ""]);
    setPollError("");
    setIsCreating(true);
  };
  const updatePollOption = (index, value) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  const castVote = (pollId, optionId) => setPolls((current) => current.map((poll) => {
    if (poll.id !== pollId || poll.votedOptionId) return poll;
    return {
      ...poll,
      votedOptionId: optionId,
      options: poll.options.map((option) => option.id === optionId ? { ...option, votes: option.votes + 1 } : option),
    };
  }));
  const createPoll = (event) => {
    event.preventDefault();
    const uniqueNames = pollOptions
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name, index, allNames) => allNames.findIndex((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase()) === index);
    if (uniqueNames.length < 2) {
      setPollError("Add at least two different names.");
      return;
    }
    const timestamp = Date.now();
    setPolls((current) => [{
      id: `poll-${timestamp}`,
      type: pollType,
      question: question.trim() || `Which ${pollType} name is your favorite?`,
      createdBy: "A family member",
      votedOptionId: null,
      options: uniqueNames.map((name, index) => ({ id: `option-${timestamp}-${index}`, name, votes: 0 })),
    }, ...current]);
    setIsCreating(false);
  };

  return (
    <section className="feature-view poll-view">
      <div className="poll-heading">
        <span className="eyebrow"><UsersThree size={19} weight="fill" /> Family polls</span>
        <h1>Everyone gets a voice.</h1>
        <p>Create a poll for boy or girl names, suggest your favorites, and let the family vote.</p>
        <button className="primary-button create-poll-button" onClick={openCreatePoll}><Plus size={21} weight="bold" /> Create a new poll</button>
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
                {typePolls.map((poll) => <PollCard key={poll.id} poll={poll} candidates={[...names[type], ...generatedNames.filter((item) => item.type === type)]} onVote={castVote} />)}
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
          <button className="primary-button publish-poll-button" type="submit">Publish poll</button>
        </form>
      </Dialog>}
    </section>
  );
}

export function App() {
  const [activeView, setActiveView] = useState("lists");
  const [names, setNames] = useState(starterNames);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchChoice, setMatchChoice] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [newName, setNewName] = useState("");
  const [newNameType, setNewNameType] = useState("boy");
  const [newNameOrigin, setNewNameOrigin] = useState("Arabic");
  const [copied, setCopied] = useState(false);
  const [mobileLane, setMobileLane] = useState("boy");
  const liked = useMemo(() => ({ boy: names.boy.filter((item) => item.liked), girl: names.girl.filter((item) => item.liked) }), [names]);
  const currentBoy = liked.boy[matchIndex % Math.max(liked.boy.length, 1)] || names.boy[0];
  const currentGirl = liked.girl[matchIndex % Math.max(liked.girl.length, 1)] || names.girl[0];

  const toggleName = (type, id) => setNames((current) => ({ ...current, [type]: current[type].map((item) => item.id === id ? { ...item, liked: !item.liked } : item) }));
  const openAddDialog = (type) => { setNewNameType(type); setNewName(""); setNewNameOrigin("Arabic"); setDialog("add"); };
  const addName = (event) => {
    event.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;
    setNames((current) => ({ ...current, [newNameType]: [...current[newNameType], { id: `${newNameType}-${Date.now()}`, name: cleanName, native: "", origin: newNameOrigin, meaning: "Family suggestion", liked: true }] }));
    setDialog(null);
  };
  const saveGenerated = (result) => {
    setNames((current) => current[result.type].some((item) => item.name === result.name) ? current : ({ ...current, [result.type]: [...current[result.type], { ...result, id: `${result.type}-${Date.now()}`, liked: true }] }));
    setActiveView("lists");
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const startMatch = () => { setMatchChoice(null); setMatchIndex((index) => index + 1); };
  const pickMatch = (type) => { setMatchChoice(type); window.setTimeout(startMatch, 750); };
  const copyInvite = async () => { await navigator.clipboard?.writeText("https://nomi.family/join/8H2K"); setCopied(true); };
  const changeView = (view) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const navItems = [
    { id: "lists", label: "Our Lists", icon: ListBullets },
    { id: "lab", label: "Name Lab", icon: Flask },
    { id: "poll", label: "Family Polls", icon: UsersThree },
  ];

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
          <span className="member-status"><UsersThree size={25} weight="bold" /><span className="member-long">8 family members have joined</span><span className="member-short">8 joined</span></span>
        </div>
        <section className="match-layout">
          <NameLane type="boy" title="Boy Names" names={names.boy} activeId={currentBoy.id} onToggle={(id) => toggleName("boy", id)} onAdd={openAddDialog} isMobileActive={mobileLane === "boy"} />
          <section className="match-stage" aria-labelledby="match-heading">
            <div className="accent-rays" aria-hidden="true"><Sparkle size={32} weight="fill" /></div>
            <h1 id="match-heading">Which name<br />feels right today?</h1>
            <div className="match-cards">
              <button className={`match-card boy ${matchChoice === "boy" ? "chosen" : ""}`} onClick={() => pickMatch("boy")} aria-label={`Choose ${currentBoy.name}`}><strong>{currentBoy.name}</strong><span className="match-native" dir="rtl" lang={currentBoy.origin === "Arabic" ? "ar" : "fa"}>{currentBoy.native}</span><small>{currentBoy.origin}</small><Heart size={53} weight={matchChoice === "boy" ? "fill" : "regular"} /></button>
              <span className="versus" aria-hidden="true">vs</span>
              <button className={`match-card girl ${matchChoice === "girl" ? "chosen" : ""}`} onClick={() => pickMatch("girl")} aria-label={`Choose ${currentGirl.name}`}><strong>{currentGirl.name}</strong><span className="match-native" dir="rtl" lang={currentGirl.origin === "Arabic" ? "ar" : "fa"}>{currentGirl.native}</span><small>{currentGirl.origin}</small><Heart size={53} weight={matchChoice === "girl" ? "fill" : "regular"} /></button>
            </div>
            <p className="pick-note"><ArrowRight size={24} weight="bold" /> Pick a favorite!</p>
            <button className="primary-button start-button" onClick={startMatch}>Start a name match <Sparkle size={23} weight="fill" /></button>
            <div className="mobile-list-switcher" role="tablist" aria-label="Choose a shortlist">
              {[{ type: "boy", label: "Boy list", count: names.boy.length }, { type: "girl", label: "Girl list", count: names.girl.length }].map((lane) => (
                <button
                  key={lane.type}
                  role="tab"
                  aria-selected={mobileLane === lane.type}
                  aria-controls={`${lane.type}-list-panel`}
                  className={mobileLane === lane.type ? "active" : ""}
                  onClick={() => setMobileLane(lane.type)}
                >
                  {lane.label}<span>{lane.count}</span>
                </button>
              ))}
            </div>
            <button className="secondary-button" onClick={() => openAddDialog(mobileLane)}><Plus size={21} weight="bold" /> Add your own</button>
          </section>
          <NameLane type="girl" title="Girl Names" names={names.girl} activeId={currentGirl.id} onToggle={(id) => toggleName("girl", id)} onAdd={openAddDialog} isMobileActive={mobileLane === "girl"} />
        </section>
      </>}

      {activeView === "lab" && <NameLab onSave={saveGenerated} />}
      {activeView === "poll" && <FamilyPoll names={names} />}

      {dialog === "add" && <Dialog title="Add a name you love" onClose={() => setDialog(null)}>
        <form className="add-form" onSubmit={addName}>
          <label htmlFor="new-name">Name</label>
          <input id="new-name" dir="auto" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Type a name in either script" />
          <fieldset><legend>Add it to</legend><div className="type-choice">
            {[["boy", "Boy list"], ["girl", "Girl list"]].map(([value, label]) => <button type="button" key={value} className={newNameType === value ? "selected" : ""} onClick={() => setNewNameType(value)}>{label}</button>)}
          </div></fieldset>
          <fieldset><legend>Name origin</legend><div className="type-choice">
            {["Arabic", "Persian"].map((value) => <button type="button" key={value} className={newNameOrigin === value ? "selected" : ""} onClick={() => setNewNameOrigin(value)}>{value}</button>)}
          </div></fieldset>
          <button className="primary-button" type="submit">Add to our list</button>
        </form>
      </Dialog>}

      {dialog === "invite" && <Dialog title="Bring your favorite people in" onClose={() => setDialog(null)}>
        <p className="dialog-copy">Anyone with this private link can suggest names and vote. The gender still stays hidden.</p>
        <div className="invite-link"><span>nomi.family/join/8H2K</span><button onClick={copyInvite}>{copied ? <CheckCircle size={21} weight="fill" /> : <Copy size={21} weight="bold" />}{copied ? "Copied" : "Copy"}</button></div>
        <button className="primary-button share-button" onClick={copyInvite}><ShareNetwork size={22} weight="bold" /> Share invite</button>
      </Dialog>}
    </main>
  );
}
