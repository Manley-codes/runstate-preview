/** Current native ShoeIllustration geometry. Original RunState artwork. */
export function ShoeArt() {
  const outline='M47 4.5C72 0 97 22 94 47C98 75 72 96 48 94C20 97 2.5 74 5 48C2 22 22 7 47 4.5Z';
  return <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d={outline} fill="white" transform="translate(50 50) scale(1.04) translate(-50 -50)"/>
    <path d={outline} fill="#789fab"/>
    <path d={outline} fill="#f7f7f7" transform="translate(50 50) scale(.74) translate(-50 -50)"/>
    <g transform="translate(50 50) scale(.9) translate(-50 -50)">
      <path fill="#a9a9a9" d="M18 56C20 52 28 52 35 49C43 46 49 39 53 33L59 34C62 38 63 44 69 44C74 45 77 40 80 39L82 58C65 63 38 63 21 61C18 61 16 59 18 56Z"/>
      <path fill="white" d="M17 58C34 62 63 63 82 58L82 64C65 69 35 68 21 65C18 64 17 61 17 58Z"/>
      <path fill="#d3d3d3" d="M18 62C35 66 64 67 82 62L82 65C64 70 35 69 21 66C19 65 18 64 18 62Z"/>
      {[0,1,2].map(n=><line key={n} x1={53-n*4.5} y1={39+n*4.5} x2={58.5-n*4.5} y2={41.5+n*4.5} stroke="#f2f2f2" strokeWidth="1.6" strokeLinecap="round"/>)}
    </g>
  </svg>;
}
