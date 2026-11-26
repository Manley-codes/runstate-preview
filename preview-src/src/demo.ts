import { goalLabel, type PreviewGoal } from './GoalPanel';
export type Energy = 'Low' | 'Moderate' | 'High' | null;
export type Appearance = 'night' | 'day';
export type DemoRun = {
  id: string;
  goal?: PreviewGoal|null;
  distance: number;
  activeSeconds: number;
  averagePace: string;
  splitPace: string;
  preEnergy: Energy;
  postEnergy: Energy;
  effort: number | null;
  reflection: string | null;
  reflectionSong?: {title:string; artist:string};
  completedAt: string;
  note?: string | null;
};
export const asset = (name: string) => `${import.meta.env.BASE_URL}media/${name}`;
export function exampleRun(preEnergy: Energy = 'High'): DemoRun {
  return {id:'example-current',distance:2.75,activeSeconds:1680,averagePace:'10:11',splitPace:'10:04',preEnergy,postEnergy:null,effort:null,reflection:null,completedAt:'2026-10-29T08:30:00'};
}
export function formatTime(seconds: number): string {
  const value=Math.floor(seconds);
  return [Math.floor(value/3600),Math.floor(value/60)%60,value%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export function exampleReflection(run: DemoRun): string {
  const opening = run.preEnergy && run.postEnergy
    ? `You started ${run.preEnergy.toLowerCase()} and finished ${run.postEnergy.toLowerCase()}, with ${Math.floor(run.activeSeconds/60)} active minutes between those two answers.`
    : `You covered ${run.distance.toFixed(2)} miles in ${Math.floor(run.activeSeconds/60)} active minutes.`;
  return `${opening} A little room for your own rhythm. Let that be what you carry into the rest of your day.`;
}
export const exampleHistory: DemoRun[] = [
  {...exampleRun('Moderate'),id:'example-1',distance:3.1,activeSeconds:1860,averagePace:'10:00',postEnergy:'High',effort:3,completedAt:'2026-10-26T07:30:00',reflectionSong:{title:'Evening Stride',artist:'RunState Studio'},reflection:'Thirty-one minutes in, you had more energy than you brought to the start. That steady groove in Evening Stride found you with something left in your legs.'},
  {...exampleRun('High'),id:'example-2',distance:4.0,activeSeconds:2520,averagePace:'10:30',postEnergy:'Moderate',effort:5,completedAt:'2026-10-24T18:30:00',reflection:'Four miles and forty-two active minutes. You made room for the run, then brought it home.'},
  {...exampleRun('Low'),id:'example-3',distance:2.2,activeSeconds:1287,averagePace:'9:45',postEnergy:'Moderate',effort:4,completedAt:'2026-10-22T07:15:00',reflection:'You started low and finished moderate. Twenty-one active minutes made their own mark on the morning.'},
];

/** Example-run outcome uses recorded sample metrics; no AI or paid service call. */
export function goalOutcome(run:DemoRun):string|null {
  if(!run.goal)return null;
  const achieved=run.goal.kind==='time'?run.activeSeconds*1000>=run.goal.activeMillis:run.distance*1609.344>=run.goal.meters;
  return `Goal · ${goalLabel(run.goal)} · ${achieved?'Reached':'Not reached'}`;
}
