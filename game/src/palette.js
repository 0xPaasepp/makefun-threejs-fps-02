import * as THREE from 'three';
export const colors=Object.freeze({dusk:'#221c2e',salt:'#e6dfd0',iron:'#3a3f45',brine:'#3f7d7a',sand:'#d9c9a3',rust:'#c25e33',ink:'#f2ede1'});
export const palette=colors;
// Named materials keep the same physical response throughout the saltworks.
export function material(name,options={}){
  const rust=name==='rust';
  return new THREE.MeshStandardMaterial({color:colors[name]||name,roughness:rust?.35:name==='iron'?.85:name==='brine'?.8:.9,metalness:rust?.9:.03,...options});
}
export default colors;
