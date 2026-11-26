import { useId, useState } from 'react';
import './goal-panel.css';

export type PreviewGoal =
  | { kind: 'distance'; meters: number; unit: 'mi' | 'km' }
  | { kind: 'time'; activeMillis: number };

type DistanceUnit = 'mi' | 'km';
const metersPerUnit = (unit: DistanceUnit) => unit === 'mi' ? 1609.344 : 1000;
const numberText = (value: number) => String(Number(value.toPrecision(12)));
const distanceTextFor = (meters: number, unit: DistanceUnit) => numberText(meters / metersPerUnit(unit));

function timeTextFor(activeMillis: number): string {
  const minutes = Math.floor(activeMillis / 60000);
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  if (activeMillis % 60000 === 0) return clock;
  const seconds = String(Math.floor(activeMillis / 1000) % 60).padStart(2, '0');
  const millis = activeMillis % 1000;
  return `${clock}:${seconds}${millis ? `.${String(millis).padStart(3, '0')}` : ''}`;
}

function parseDistance(text: string, unit: DistanceUnit): PreviewGoal | null {
  const clean = text.trim().replace(',', '.');
  if (!/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/.test(clean)) return null;
  const meters = Number(clean) * metersPerUnit(unit);
  return Number.isFinite(meters) && meters > 0 && meters <= 1000000
    ? { kind: 'distance', meters, unit } : null;
}

function parseTime(text: string): PreviewGoal | null {
  const clock = /^([0-9]{1,3}):([0-9]{2})(?::([0-9]{2})(?:\.([0-9]{1,3}))?)?$/.exec(text.trim());
  if (!clock) return null;
  const minutes = Number(clock[2]);
  const seconds = Number(clock[3] ?? 0);
  if (minutes > 59 || seconds > 59) return null;
  const millis = Number((clock[4] ?? '').padEnd(3, '0'));
  const activeMillis = (Number(clock[1]) * 60 + minutes) * 60000 + seconds * 1000 + millis;
  return activeMillis > 0 && activeMillis <= 604800000 ? { kind: 'time', activeMillis } : null;
}

export function goalLabel(goal: PreviewGoal | null): string {
  if (!goal) return 'Goal';
  return goal.kind === 'distance'
    ? `${distanceTextFor(goal.meters, goal.unit)} ${goal.unit}`
    : `${numberText(goal.activeMillis / 60000)} min`;
}

/** The public demo keeps a goal in browser memory only. Input is a draft until Save. */
export function GoalPanel({ value, onSave, onClose }: {
  value: PreviewGoal | null;
  onSave: (goal: PreviewGoal | null) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [kind, setKind] = useState<'distance' | 'time'>(value?.kind ?? 'distance');
  const [unit, setUnit] = useState<DistanceUnit>(value?.kind === 'distance' ? value.unit : 'mi');
  const [distanceText, setDistanceText] = useState(() => value?.kind === 'distance'
    ? distanceTextFor(value.meters, value.unit) : '3');
  const [timeText, setTimeText] = useState(() => value?.kind === 'time' ? timeTextFor(value.activeMillis) : '00:30');
  // Preserve the chosen exact target when a unit switch changes only its displayed rounding.
  const [exactDistance, setExactDistance] = useState<number | null>(value?.kind === 'distance' ? value.meters : null);
  const text = kind === 'distance' ? distanceText : timeText;
  const parsed = kind === 'distance' ? parseDistance(text, unit) : parseTime(text);
  const candidate: PreviewGoal | null = kind === 'distance' && exactDistance !== null
    && text.trim().replace(',', '.') === distanceTextFor(exactDistance, unit)
    ? { kind: 'distance', meters: exactDistance, unit }
    : parsed;
  const invalid = text.trim().length > 0 && candidate === null;
  const inputLabel = kind === 'distance' ? 'Distance goal' : 'Active time goal in hours and minutes';

  function changeUnit(next: DistanceUnit) {
    if (unit === next) return;
    const meters = candidate?.kind === 'distance' ? candidate.meters : null;
    setExactDistance(meters);
    setDistanceText(meters === null ? '' : distanceTextFor(meters, next));
    setUnit(next);
  }

  return <form className="rs-goal-panel" onSubmit={event => { event.preventDefault(); if (candidate) onSave(candidate); }}>
    <header className="rs-goal-heading"><h2 id={`${id}-title`}>Set a goal</h2><button type="button" onClick={onClose}>Close</button></header>
    <div className="rs-goal-types" role="group" aria-label="Goal type">
      {(['distance', 'time'] as const).map(choice => <button type="button" key={choice}
        className="rs-goal-type" aria-pressed={kind === choice} onClick={() => setKind(choice)}>
        {choice === 'distance' ? 'Distance' : 'Time'}
      </button>)}
    </div>
    <div className={`rs-goal-entry${invalid ? ' is-invalid' : ''}`}>
      <input aria-label={inputLabel} aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        value={text} type="text" inputMode={kind === 'distance' ? 'decimal' : 'text'}
        autoComplete="off" maxLength={24} spellCheck={false}
        onChange={event => { if (kind === 'distance') { setExactDistance(null); setDistanceText(event.target.value); } else setTimeText(event.target.value); }}/>
      {kind === 'distance' ? <select aria-label="Distance unit" value={unit} onChange={event => changeUnit(event.target.value as DistanceUnit)}>
        <option value="mi">mi</option><option value="km">km</option>
      </select> : <span className="rs-goal-clock-unit" aria-hidden="true">{text.split(':').length > 2 ? 'h:mm:ss' : 'h:mm'}</span>}
    </div>
    {invalid && <span className="rs-goal-error" id={`${id}-error`} role="status">{kind === 'distance'
      ? 'Enter a positive distance up to 1,000 kilometers.'
      : 'Enter hours and minutes, such as 00:30, up to 168:00.'}</span>}
    <button type="submit" className="rs-goal-save" disabled={!candidate}>Save goal</button>
    {value !== null && <button type="button" className="rs-goal-remove" onClick={() => onSave(null)}>Remove goal</button>}
  </form>;
}
