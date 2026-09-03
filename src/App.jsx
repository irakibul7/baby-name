import { useMemo, useState } from "react";
import {
  ArrowRight, Baby, CheckCircle, Copy, Flask, Heart, ListBullets,
  LockKey, MagicWand, Plus, ShareNetwork, Sparkle, Star, UserPlus,
  UsersThree, X,
} from "@phosphor-icons/react";

const starterNames = {
  boy: ["Auden", "Felix", "Jasper", "Luca", "Miles"].map((name, index) => ({ id: `b${index}`, name, liked: name === "Luca" })),
  girl: ["Aria", "Cleo", "Georgia", "Lena", "Nova"].map((name, index) => ({ id: `g${index}`, name, liked: name === "Lena" })),
};

const generatedNames = [
  { name: "Elio", type: "boy", meaning: "Sun", origin: "Italian" },
  { name: "Mira", type: "girl", meaning: "Wonderful", origin: "Latin" },
  { name: "Rowan", type: "boy", meaning: "Little red one", origin: "Irish" },
  { name: "Iris", type: "girl", meaning: "Rainbow", origin: "Greek" },
  { name: "Ari", type: "boy", meaning: "Lion", origin: "Hebrew" },
  { name: "Maeve", type: "girl", meaning: "She who rules", origin: "Irish" },
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
            <span>{item.name}</span>
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
  const [theme, setTheme] = useState("bright");
  const [resultIndex, setResultIndex] = useState(0);
  const result = generatedNames[resultIndex];
  return (
    <section className="feature-view name-lab-view">
      <div className="feature-copy">
        <span className="eyebrow"><Sparkle size={18} weight="fill" /> Name Lab</span>
        <h1>Find a name with a little spark.</h1>
        <p>Pick a feeling and we’ll suggest a name for either list. The gender stays a surprise.</p>
        <fieldset className="theme-picker">
          <legend>What should it feel like?</legend>
          {["bright", "nature", "classic"].map((item) => (
            <button key={item} className={theme === item ? "selected" : ""} onClick={() => setTheme(item)}>{item}</button>
          ))}
        </fieldset>
        <button className="primary-button lab-generate" onClick={() => setResultIndex((index) => (index + 1) % generatedNames.length)}>
          <MagicWand size={22} weight="bold" /> Generate another
        </button>
      </div>
      <article className={`generated-card ${result.type}`} aria-live="polite">
        <span className="generated-label">A {theme} idea</span>
        <h2>{result.name}</h2>
        <p>{result.meaning} · {result.origin}</p>
        <button onClick={() => onSave(result)}><Plus size={20} weight="bold" /> Save to {result.type} list</button>
      </article>
    </section>
  );
}

function FamilyPoll({ boyName, girlName }) {
  const [votes, setVotes] = useState({ boy: 12, girl: 15 });
  const [choice, setChoice] = useState(null);
  const total = votes.boy + votes.girl;
  const castVote = (type) => {
    if (choice) return;
    setChoice(type);
    setVotes((current) => ({ ...current, [type]: current[type] + 1 }));
  };
  return (
    <section className="feature-view poll-view">
      <div className="poll-heading">
        <span className="eyebrow"><UsersThree size={19} weight="fill" /> Family poll</span>
        <h1>Help us choose a favorite</h1>
        <p>Votes guide the parents; the final name stays their little secret.</p>
      </div>
      <div className="poll-options">
        {[{ type: "boy", name: boyName }, { type: "girl", name: girlName }].map((option) => {
          const percent = Math.round((votes[option.type] / total) * 100);
          return (
            <button key={option.type} className={`poll-option ${option.type} ${choice === option.type ? "chosen" : ""}`} onClick={() => castVote(option.type)} disabled={Boolean(choice)}>
              <span>{option.type} list finalist</span><strong>{option.name}</strong>
              {choice ? <small>{percent}% · {votes[option.type]} votes</small> : <small>Choose this name</small>}
              {choice === option.type && <CheckCircle size={25} weight="fill" />}
            </button>
          );
        })}
      </div>
      <p className="poll-note">{choice ? "Thanks! Your vote is in." : "One vote per family member."}</p>
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
  const [copied, setCopied] = useState(false);
  const [mobileLane, setMobileLane] = useState("boy");
  const liked = useMemo(() => ({ boy: names.boy.filter((item) => item.liked), girl: names.girl.filter((item) => item.liked) }), [names]);
  const currentBoy = liked.boy[matchIndex % Math.max(liked.boy.length, 1)]?.name || names.boy[0].name;
  const currentGirl = liked.girl[matchIndex % Math.max(liked.girl.length, 1)]?.name || names.girl[0].name;

  const toggleName = (type, id) => setNames((current) => ({ ...current, [type]: current[type].map((item) => item.id === id ? { ...item, liked: !item.liked } : item) }));
  const openAddDialog = (type) => { setNewNameType(type); setNewName(""); setDialog("add"); };
  const addName = (event) => {
    event.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return;
    setNames((current) => ({ ...current, [newNameType]: [...current[newNameType], { id: `${newNameType}-${Date.now()}`, name: cleanName, liked: true }] }));
    setDialog(null);
  };
  const saveGenerated = (result) => {
    setNames((current) => current[result.type].some((item) => item.name === result.name) ? current : ({ ...current, [result.type]: [...current[result.type], { id: `${result.type}-${Date.now()}`, name: result.name, liked: true }] }));
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
    { id: "poll", label: "Family Poll", icon: UsersThree },
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
          <NameLane type="boy" title="Boy Names" names={names.boy} activeId={names.boy.find((item) => item.name === currentBoy)?.id} onToggle={(id) => toggleName("boy", id)} onAdd={openAddDialog} isMobileActive={mobileLane === "boy"} />
          <section className="match-stage" aria-labelledby="match-heading">
            <div className="accent-rays" aria-hidden="true"><Sparkle size={32} weight="fill" /></div>
            <h1 id="match-heading">Which name<br />feels right today?</h1>
            <div className="match-cards">
              <button className={`match-card boy ${matchChoice === "boy" ? "chosen" : ""}`} onClick={() => pickMatch("boy")} aria-label={`Choose ${currentBoy}`}><strong>{currentBoy}</strong><Heart size={53} weight={matchChoice === "boy" ? "fill" : "regular"} /></button>
              <span className="versus" aria-hidden="true">vs</span>
              <button className={`match-card girl ${matchChoice === "girl" ? "chosen" : ""}`} onClick={() => pickMatch("girl")} aria-label={`Choose ${currentGirl}`}><strong>{currentGirl}</strong><Heart size={53} weight={matchChoice === "girl" ? "fill" : "regular"} /></button>
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
          <NameLane type="girl" title="Girl Names" names={names.girl} activeId={names.girl.find((item) => item.name === currentGirl)?.id} onToggle={(id) => toggleName("girl", id)} onAdd={openAddDialog} isMobileActive={mobileLane === "girl"} />
        </section>
      </>}

      {activeView === "lab" && <NameLab onSave={saveGenerated} />}
      {activeView === "poll" && <FamilyPoll boyName={currentBoy} girlName={currentGirl} />}

      {dialog === "add" && <Dialog title="Add a name you love" onClose={() => setDialog(null)}>
        <form className="add-form" onSubmit={addName}>
          <label htmlFor="new-name">Name</label>
          <input id="new-name" autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Type a name" />
          <fieldset><legend>Add it to</legend><div className="type-choice">
            {[["boy", "Boy list"], ["girl", "Girl list"]].map(([value, label]) => <button type="button" key={value} className={newNameType === value ? "selected" : ""} onClick={() => setNewNameType(value)}>{label}</button>)}
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
