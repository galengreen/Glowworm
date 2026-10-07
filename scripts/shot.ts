// `glowworm shot`: render one widget headlessly, press keys, screenshot each state, and check the layout,
// so an agent can see its work and catch overlapping or unreadable labels without eyeballing every image.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { createServer } from 'vite';
import { REPO } from './paths.ts';

export const SHOT_USAGE = `Checks: labels overlapping, sitting on a curve, edge or wire, outside the figure, under 9px or below 4.5:1 contrast.
Usage: glowworm shot <course> <widget> [param=value …] [options]
  --keys "<keys>"   press keys on the figure, then take another shot (repeatable; states build on each other)
                    keys are Playwright names separated by spaces, e.g. "ArrowRight ArrowRight Space r"
  --wait <ms>       wait after each set of keys for animations (default 700, or 150 with --calm)
  --calm            calm mode: no animation
  --theme light     check the light theme too (default dark)
  --width <px>      viewport width (default 1000)
  --out <dir>       where to write PNGs (default .glowworm/shots)`;

interface Options {
  course: string;
  widget: string;
  params: Record<string, string>;
  states: string[];
  wait?: number;
  calm: boolean;
  theme: 'dark' | 'light';
  width: number;
  out: string;
}

function parseArgs(args: string[]): Options {
  const [course, widget] = args;
  if (!course || !widget || course.startsWith('-') || widget.startsWith('-')) throw new Error(SHOT_USAGE);
  const o: Options = { course, widget, params: {}, states: [], calm: false, theme: 'dark', width: 1000, out: join(REPO, '.glowworm', 'shots') };
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    const next = () => {
      if (i + 1 >= args.length) throw new Error(`${a} needs a value\n\n${SHOT_USAGE}`);
      return args[++i];
    };
    if (a === '--keys') o.states.push(next());
    else if (a === '--wait') o.wait = Number(next());
    else if (a === '--calm') o.calm = true;
    else if (a === '--theme') o.theme = next() === 'light' ? 'light' : 'dark';
    else if (a === '--width') o.width = Number(next());
    else if (a === '--out') o.out = next();
    else if (/^[\w-]+=/.test(a)) {
      const [k, ...v] = a.split('=');
      o.params[k] = v.join('=');
    } else throw new Error(`Unknown argument "${a}"\n\n${SHOT_USAGE}`);
  }
  return o;
}

/** Any installed Chromium-based browser, or Playwright's own if it has been downloaded. */
async function launch(): Promise<Browser> {
  const candidates = [
    process.env.GLOWWORM_BROWSER,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter((p): p is string => !!p && existsSync(p));
  for (const executablePath of candidates) {
    try {
      return await chromium.launch({ executablePath, headless: true });
    } catch {
      // try the next one
    }
  }
  try {
    return await chromium.launch({ headless: true });
  } catch {
    throw new Error('No Chromium-based browser found. Install Chrome, or set GLOWWORM_BROWSER to a Chromium executable.');
  }
}

interface LayoutIssue {
  kind: 'overlap' | 'crossing' | 'outside' | 'contrast' | 'tiny';
  message: string;
}

/** Runs in the page: checks every visible label in the figure's stage. */
function checkLayout(): { issues: LayoutIssue[]; readout: string; labels: number } {
  const figure = document.querySelector('figure.figure');
  const stage = figure?.querySelector('svg.stage');
  if (!figure || !stage) return { issues: [{ kind: 'outside', message: 'No figure rendered' }], readout: '', labels: 0 };
  const stageBox = stage.getBoundingClientRect();

  const rgb = (c: string) => (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a: number[], b: number[]) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const bg = rgb(getComputedStyle(figure).backgroundColor);
  const opacity = (el: Element | null) => {
    let o = 1;
    for (let e = el; e && e !== stage; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  };

  const texts = [...stage.querySelectorAll('text')]
    .map((el) => ({ el, box: el.getBoundingClientRect(), text: (el.textContent ?? '').trim(), alpha: opacity(el) }))
    .filter((t) => t.text && t.box.width > 0 && t.alpha > 0.05 && getComputedStyle(t.el).visibility !== 'hidden');

  const issues: LayoutIssue[] = [];
  const name = (t: (typeof texts)[number]) => `"${t.text.slice(0, 40)}"`;
  for (const t of texts) {
    const b = t.box;
    if (b.left < stageBox.left - 1 || b.right > stageBox.right + 1 || b.top < stageBox.top - 1 || b.bottom > stageBox.bottom + 1) {
      issues.push({ kind: 'outside', message: `${name(t)} runs outside the figure` });
    }
    if (b.height < 9) issues.push({ kind: 'tiny', message: `${name(t)} renders ${b.height.toFixed(1)}px tall (min 9px)` });
    const fill = rgb(getComputedStyle(t.el).fill);
    const shown = fill.map((c, i) => c * t.alpha + bg[i] * (1 - t.alpha));
    const r = ratio(shown, bg);
    if (r < 4.5) issues.push({ kind: 'contrast', message: `${name(t)} has contrast ${r.toFixed(1)}:1 (want 4.5:1)` });
  }
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].box;
      const b = texts[j].box;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w <= 0 || h <= 0) continue;
      const smaller = Math.min(a.width * a.height, b.width * b.height);
      if ((w * h) / smaller > 0.15) issues.push({ kind: 'overlap', message: `${name(texts[i])} overlaps ${name(texts[j])}` });
    }
  }
  // Labels sitting on a solid stroke that teaches (curves, edges, wires) are hard to read: walk each stroke
  // and see whether it passes through a label's box (inset a little, so strokes that just graze it are fine).
  const strokes = [...stage.querySelectorAll<SVGGeometryElement>('.curve, .edge, .wire')].filter(
    (el) => typeof el.getTotalLength === 'function' && Number(getComputedStyle(el).opacity) > 0.05 && opacity(el) > 0.05,
  );
  const crossed = new Map<(typeof texts)[number], string>();
  for (const el of strokes) {
    const ctm = el.getScreenCTM();
    if (!ctm) continue;
    const len = el.getTotalLength();
    const step = Math.max(1, len / 400);
    for (let d = 0; d <= len; d += step) {
      const p = el.getPointAtLength(d);
      const x = ctm.a * p.x + ctm.c * p.y + ctm.e;
      const y = ctm.b * p.x + ctm.d * p.y + ctm.f;
      for (const t of texts) {
        const b = t.box;
        const ix = b.width * 0.12;
        const iy = b.height * 0.25;
        if (!crossed.has(t) && x > b.left + ix && x < b.right - ix && y > b.top + iy && y < b.bottom - iy) crossed.set(t, el.getAttribute('class') ?? 'stroke');
      }
    }
  }
  for (const [t, cls] of crossed) issues.push({ kind: 'crossing', message: `${name(t)} sits on a "${cls}" stroke` });

  const readout = figure.querySelector('.readout')?.textContent ?? '';
  return { issues, readout, labels: texts.length };
}

async function snap(page: Page, file: string, label: string) {
  await page.locator('figure.figure').first().screenshot({ path: file });
  const { issues, readout, labels } = await page.evaluate(checkLayout);
  console.log(`\n${label}  ${file}`);
  console.log(`  readout: ${readout || '(none)'} · ${labels} labels`);
  for (const i of issues) console.log(`  ${i.kind.padEnd(8)} ${i.message}`);
  if (!issues.length) console.log('  layout ok');
  return issues.length;
}

export async function shot(args: string[]) {
  const o = parseArgs(args);
  mkdirSync(o.out, { recursive: true });
  const server = await createServer({ configFile: join(REPO, 'vite.config.ts'), root: REPO, logLevel: 'error', server: { port: 0, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  let browser: Browser | undefined;
  let problems = 0;
  try {
    if (!base) throw new Error('Could not start the preview server');
    browser = await launch();
    const page = await browser.newPage({ viewport: { width: o.width, height: 1000 } });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    // tsx keeps function names with a __name helper, which functions passed to page.evaluate still call.
    await page.addInitScript('globalThis.__name = (f) => f');
    await page.addInitScript((s) => localStorage.setItem('glowworm:settings', JSON.stringify(s)), { theme: o.theme, accent: 0, spacing: 'normal', calm: o.calm });
    if (o.calm) await page.emulateMedia({ reducedMotion: 'reduce' });

    const query = new URLSearchParams(o.params).toString();
    await page.goto(`${base}#/c/${encodeURIComponent(o.course)}/widget/${encodeURIComponent(o.widget)}${query ? `?${query}` : ''}`);
    await page.locator('figure.figure svg.stage').first().waitFor({ timeout: 15000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready);
    const wait = o.wait ?? (o.calm ? 150 : 700);
    await page.waitForTimeout(wait);
    if (!(await page.locator(`figure[data-widget="${o.widget}"]`).count())) throw new Error(`Widget "${o.widget}" didn't render in course "${o.course}". ${errors.join(' | ')}`);

    const stem = `${o.widget}${o.theme === 'light' ? '-light' : ''}${o.calm ? '-calm' : ''}`;
    problems += await snap(page, join(o.out, `${stem}-0.png`), 'initial');
    for (const [n, keys] of o.states.entries()) {
      await page.locator('figure.figure svg.stage').first().focus();
      for (const k of keys.split(/\s+/).filter(Boolean)) await page.keyboard.press(k);
      await page.waitForTimeout(wait);
      problems += await snap(page, join(o.out, `${stem}-${n + 1}.png`), `after "${keys}"`);
    }
    if (errors.length) {
      console.log('\npage errors');
      for (const e of [...new Set(errors)]) console.log(`  ${e}`);
      problems += errors.length;
    }
  } finally {
    await browser?.close();
    await server.close();
  }
  process.exitCode = problems ? 1 : 0;
}
