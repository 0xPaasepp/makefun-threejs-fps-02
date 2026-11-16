export const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// A private 32-bit state makes shot presets and round assignments reproducible.
export function seeded(seed=1){
  let value=(Number(seed)||1)>>>0;
  return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}
export const rng=seeded;
export const teamIndex=team=>team==='brine'?1:team==='rust'?0:Number(team);
