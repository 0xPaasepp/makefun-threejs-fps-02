import * as T from "three";
export const palette = {
  dusk: "#221c2e",
  salt: "#e6dfd0",
  iron: "#3a3f45",
  brine: "#3f7d7a",
  sand: "#d9c9a3",
  rust: "#c25e33",
  ink: "#f2ede1",
};
export function material(name, extra = {}) {
  return new T.MeshStandardMaterial({
    color: palette[name],
    roughness: name === "salt" ? 0.9 : name === "rust" ? 0.35 : 0.85,
    metalness: name === "rust" ? 0.9 : name === "salt" ? 0.03 : 0,
    ...extra,
  });
}
