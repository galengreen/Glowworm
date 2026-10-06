import { useCallback, useEffect, useRef, useState } from 'react';
import { coursePath } from '../../course/load';
import { buildPrompt } from '../../course/prompt';
import { useCourse } from '../../render/context';
import { AGENT_NAMES, agentCommand, launchAgent, listMaterials, removeMaterial, revealMaterials, uploadMaterial, type Agent, type MaterialsInfo } from '../../state/materials';

const size = (n: number) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`);
const shQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const AGENT = 'glowworm:agent';

/** Add material: drop files into the course, then hand a build prompt to your own agent. */
export function Materials() {
  const { course, dir } = useCourse();
  const [info, setInfo] = useState<MaterialsInfo>();
  const [error, setError] = useState<string>();
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState('');
  const [agent, setAgent] = useState<Agent>(() => (localStorage.getItem(AGENT) as Agent) ?? 'claude');
  const [done, setDone] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    listMaterials(dir)
      .then((i) => {
        setInfo(i);
        setOffline(false);
      })
      .catch(() => setOffline(true));
  }, [dir]);

  // Poll while the page is open, so files flip to "In sources" as the agent converts them.
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  useEffect(() => localStorage.setItem(AGENT, agent), [agent]);

  async function add(files: FileList | File[]) {
    setError(undefined);
    setBusy((b) => b + files.length);
    for (const f of Array.from(files)) {
      try {
        await uploadMaterial(dir, f);
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
      setBusy((b) => b - 1);
    }
    refresh();
  }

  const files = info?.files ?? [];
  const fresh = files.filter((f) => !f.converted);
  const root = coursePath(course);
  const prompt = buildPrompt(course, dir, root, files, note);
  const installed = info?.agents ?? [];
  const canLaunch = !!info?.canLaunch && installed.includes(agent);

  const flash = (msg: string) => {
    setDone(msg);
    setTimeout(() => setDone(undefined), 2500);
  };
  const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => flash(`${what} copied`));
  const launch = () =>
    launchAgent(dir, agent, prompt)
      .then(() => flash(`${AGENT_NAMES[agent]} opened in Terminal`))
      .catch((e: Error) => setError(e.message));

  return (
    <div className="page narrow">
      <div className="page-head">
        <span className="label-sm">{course.meta.title}</span>
        <h1>Add material</h1>
        <p className="lede">Drop in slides, lecture notes and past papers. Your agent turns them into sources, then builds concepts, lessons and questions from them.</p>
      </div>

      {offline && (
        <p className="sample">Adding files needs the dev server. Run <code>pnpm dev</code>, or put files in <code>{root}/materials/</code> yourself.</p>
      )}

      <section className="section" aria-labelledby="m-files">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="label-sm" id="m-files">01 · Material</span>
          {info && (
            <button className="linkish" style={{ fontSize: 14 }} onClick={() => revealMaterials(dir)} title={info.path}>
              Show folder
            </button>
          )}
        </div>
        <button
          className={`dropzone${over ? ' over' : ''}`}
          disabled={offline}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (!offline && e.dataTransfer.files.length) add(e.dataTransfer.files);
          }}
        >
          <span className="t">{busy ? `Adding ${busy} file${busy === 1 ? '' : 's'}…` : 'Drop files here, or choose files'}</span>
          <span className="s">PDF, slides, Word, Markdown, text or images. Originals are kept as they are.</span>
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files && add(e.target.files).then(() => (e.target.value = ''))} />
        {error && <p className="error-line" role="alert">{error}</p>}

        {files.length > 0 && (
          <ul className="file-list">
            {files.map((f) => (
              <li key={f.name}>
                <span className="t">{f.name}</span>
                <span className="s">{size(f.size)}</span>
                <span className={`state${f.converted ? '' : ' new'}`}>{f.converted ? 'In sources' : 'New'}</span>
                {f.converted ? (
                  <span />
                ) : (
                  <button className="linkish" aria-label={`Remove ${f.name}`} onClick={() => removeMaterial(dir, f.name).then(refresh, (e: Error) => setError(e.message))}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="m-build">
        <span className="label-sm" id="m-build">02 · Build with your agent</span>
        <p className="muted" style={{ marginTop: 0 }}>
          {fresh.length
            ? `${fresh.length} new file${fresh.length === 1 ? '' : 's'} to turn into course content.`
            : files.length
              ? 'Everything is in sources. The agent can still check coverage and fill gaps.'
              : 'Add some material first, or ask the agent to fill gaps in what the course already has.'}{' '}
          The player reloads as the agent writes content.
        </p>

        <div className="build">
          <div className="segmented" role="radiogroup" aria-label="Agent" style={{ width: 260 }}>
            {(Object.keys(AGENT_NAMES) as Agent[]).map((a) => (
              <button key={a} role="radio" aria-checked={agent === a} onClick={() => setAgent(a)}>
                {AGENT_NAMES[a]}
              </button>
            ))}
          </div>
          <label className="note">
            <span className="label-sm">Anything the agent should know? (optional)</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weeks 1–6 only. The exam is mostly short answer. Lecture 4 won't be examined." />
          </label>
          <details>
            <summary className="label-sm">Preview the prompt</summary>
            <pre className="prompt-preview">{prompt}</pre>
          </details>
          <div className="row">
            {canLaunch && (
              <button className="btn live" onClick={launch}>Open {AGENT_NAMES[agent]} in Terminal →</button>
            )}
            <button className={`btn${canLaunch ? '' : ' live'}`} onClick={() => copy(prompt, 'Prompt')}>Copy prompt</button>
            <button className="btn" onClick={() => copy(`${agentCommand(agent)} ${shQuote(prompt)}`, 'Command')}>Copy command</button>
            {done && <span className="muted" role="status">{done}</span>}
          </div>
          {info && !installed.includes(agent) && (
            <p className="muted" style={{ margin: 0 }}>{AGENT_NAMES[agent]} isn't on your PATH, so copy the prompt into whichever agent you use.</p>
          )}
        </div>
      </section>
    </div>
  );
}
