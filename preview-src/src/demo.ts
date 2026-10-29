export type Energy = 'Low' | 'Moderate' | 'High' | null;
export type Appearance = 'night' | 'day';
export type DemoRun = {
  id: string;
  distance: number;
  activeSeconds: number;
  averagePace: string;
  splitPace: string;
  preEnergy: Energy;
  postEnergy: Energy;
  effort: number | null;
  reflection: string | null;
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
  {...exampleRun('Moderate'),id:'example-1',distance:3.1,activeSeconds:1860,averagePace:'10:00',postEnergy:'High',effort:3,completedAt:'2026-10-26T07:30:00',reflection:'You gave yourself thirty-one active minutes, and finished with more energy than you brought. A good morning to keep in your pocket.'},
  {...exampleRun('High'),id:'example-2',distance:4.0,activeSeconds:2520,averagePace:'10:30',postEnergy:'Moderate',effort:5,completedAt:'2026-10-24T18:30:00',reflection:'Four miles and forty-two active minutes. You made room for the run, then brought it home.'},
  {...exampleRun('Low'),id:'example-3',distance:2.2,activeSeconds:1287,averagePace:'9:45',postEnergy:'Moderate',effort:4,completedAt:'2026-10-22T07:15:00',reflection:'You started low and finished moderate. Twenty-one active minutes made their own mark on the morning.'},
];
