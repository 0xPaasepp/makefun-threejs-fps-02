import * as T from "three";
import { palette } from "./palette.js";
export function createEffects(scene) {
  const pool = [];
  for (let i = 0; i < 56; i++) {
    const line = new T.Line(
      new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
      new T.LineBasicMaterial({ color: palette.rust, transparent: true }),
    );
    const dust = new T.Mesh(
      new T.SphereGeometry(1, 7, 5),
      new T.MeshBasicMaterial({
        color: palette.sand,
        transparent: true,
        depthWrite: false,
      }),
    );
    const sparks = new T.Points(
      new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(new Float32Array(15), 3)),
      new T.PointsMaterial({ color: palette.ink, size: 0.045, transparent: true, depthWrite: false }),
    );
    sparks.frustumCulled = false;
    sparks.visible = false;
    scene.add(sparks);
    line.visible = dust.visible = false;
    scene.add(line, dust);
    pool.push({ line, dust, sparks, life: 0, total: 0, kind: 0 });
  }
  let cursor = 0;
  const ring = new T.Mesh(new T.TorusGeometry(0.5, 0.025, 6, 48), new T.MeshBasicMaterial({ color: palette.rust }));
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);
  return {
    pool,
    ring,
    trace(a, b) {
      const e = pool[cursor++ % pool.length],
        p = e.line.geometry.attributes.position;
      p.setXYZ(0, a.x, a.y, a.z);
      p.setXYZ(1, b.x, b.y, b.z);
      p.needsUpdate = true;
      e.line.geometry.computeBoundingSphere();
      e.kind = 0;
      e.dust.material.color.set(palette.sand);
      e.sparks.position.copy(b);
      e.sparks.visible = true;
      const sparks = e.sparks.geometry.attributes.position;
      for (let i = 0; i < 5; i++) sparks.setXYZ(i, 0, 0, 0);
      sparks.needsUpdate = true;
      e.line.visible = true;
      e.dust.visible = true;
      e.dust.position.copy(b);
      e.dust.scale.setScalar(0.025);
      e.dust.material.opacity = 0.28;
      e.life = e.total = 0.3;
    },
    burst(x, y, z) {
      for (let j = 0; j < 5; j++) {
        const e = pool[cursor++ % pool.length];
        e.line.visible = false;
        e.sparks.visible = false;
        e.kind = j === 0 ? 1 : 0;
        e.dust.material.color.set(j === 0 ? palette.ink : palette.sand);
        e.dust.position.set(x + (j - 2) * 0.2, y + j * 0.1, z);
        e.life = e.total = 0.5;
        e.dust.scale.setScalar(0.2);
        e.dust.material.opacity = 0.5;
        e.dust.visible = true;
      }
    },
    step(dt) {
      for (let i = 0; i < pool.length; i++) {
        const e = pool[i];
        if (e.life <= 0) continue;
        e.life -= dt;
        e.line.visible = e.life > e.total - 0.08;
        e.line.material.opacity = Math.max(0, (e.life - (e.total - 0.08)) / 0.08);
        const age = e.total - e.life;
        e.sparks.visible = e.life > 0 && age < 0.18;
        if (e.sparks.visible) {
          const sparks = e.sparks.geometry.attributes.position;
          for (let j = 0; j < 5; j++)
            sparks.setXYZ(
              j,
              Math.sin(j * 2.4) * age * 2,
              Math.cos(j * 1.8) * age * 2 - age * age * 4,
              Math.cos(j * 2.4) * age * 2,
            );
          sparks.needsUpdate = true;
          e.sparks.material.opacity = Math.max(0, 1 - age / 0.18);
        }
        e.dust.visible = e.life > 0;
        e.dust.scale.setScalar(e.kind === 1 ? 0.2 + age * 8 : 0.025 + age * 0.8);
        e.dust.material.opacity = e.kind === 1 ? Math.max(0, 0.7 - age * 4) : Math.max(0, (e.life / e.total) * 0.28);
      }
    },
  };
}
