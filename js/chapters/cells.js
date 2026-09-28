// Chapter 2: a city covered in hexagonal cells. Each site has three sector antennas. A phone travels
// across the city; its received power from every sector comes from a real path-loss model (free space
// or Okumura–Hata / COST-231 urban), and it hands over when a neighbour beats its cell by 3 dB.
import { THREE, M, box, tube, clamp } from '../kit.js';
import {
  hexCenter, hexRing, reuseGroup, sirDb, REUSE_COLOURS, pathLoss, EIRP_RE, sectorLoss, wallLoss, bars, A3_DB, A3_TTT,
  makeTower, miniPhone, azimuth, angDiff, board, boardBg, rng, TAU,
} from '../mobile.js';

const R = 3;              // hex radius in scene units
const KM = 1 / R;         // 1 km per hex radius: a typical urban macro cell (inter-site distance √3 ≈ 1.7 km)
const SITES = hexRing(2); // 19 sites
const SPEEDS = { walk: { name: 'Walking', kmh: 5 }, bike: { name: 'Scooter', kmh: 30 }, train: { name: 'Metro train', kmh: 80 } };
const BANDS = { 700: '700 MHz', 1800: '1800 MHz', 3500: '3.5 GHz' };
const LAPSE = 40;         // time-lapse: the scene runs 40× faster than real life

export default {
  id: 'cells',
  short: 'Cells and towers',
  title: 'A city cut into cells',
  subtitle: 'Why it\'s called a "cell" phone, and how your call jumps from tower to tower without dropping.',
  view: { pos: [-1.5, 17, 17], target: [-2.4, 2.2, 0.5] },
  learn: `<p>A phone's radio is weak: at most about <b>0.2 watts</b>. It can't reach a tower 50 km away. So the network covers a city with lots of towers, each serving a small patch called a <b>cell</b>. Draw the patches and they tile the map like a honeycomb. That's why it's called a <b>cellular</b> phone.</p>
    <p>A tower usually has <b>three sector antennas</b>, flat panels each facing a different way and covering a third of the circle around it.</p>
    <p>The signal fades fast with distance. In empty space its power falls as <b>1/d²</b>: twice as far, a quarter of the power. In a city, buildings and trees eat even more, closer to <b>1/d³·⁵</b>. Your phone measures every tower it can hear. When a neighbour gets clearly stronger than the one you're using, the network moves you over in a few milliseconds. That's a <b>handover</b>, and on a call you never notice it.</p>
    <p>Cells next to each other must use different channels, or they'd drown each other out. In 2G, groups of <b>7 cells</b> shared out the channels and the pattern repeated (<b>frequency reuse</b>). 4G and 5G can reuse the same channel in every cell, using clever coding and scheduling to cope with the interference.</p>
    <p class="tip"><b>Try it:</b> watch the bars as the phone crosses a cell edge, then go indoors, or switch to free space and see how much further the signal would reach without a city in the way.</p>`,
  terms: [
    { t: 'Cell', d: 'The patch of ground served by one tower\'s antenna.' },
    { t: 'Sector antenna', d: 'A flat panel that sends its signal into a wedge about 120° wide.' },
    { t: 'Handover', d: 'Moving a phone\'s connection from one cell to a better one without dropping the call.' },
    { t: 'Path loss', d: 'How much weaker the signal gets between the tower and the phone, in decibels.' },
    { t: 'Frequency reuse', d: 'Using the same radio channels again in cells far enough apart not to disturb each other.' },
    { t: 'dBm', d: 'Power on a log scale: 0 dBm is 1 milliwatt, −100 dBm is 0.1 picowatts... ten billion times less.' },
  ],
  defaults: { band: 1800, env: 'urban', speed: 'bike', reuse: 7, indoor: false },
  controls: [
    { key: 'speed', type: 'seg', label: 'Travelling by', options: Object.entries(SPEEDS).map(([v, o]) => ({ v, label: o.name })), fmt: (v) => `${SPEEDS[v].kmh} km/h, shown ${LAPSE}× faster` },
    { key: 'band', type: 'seg', label: 'Band', options: Object.entries(BANDS).map(([v, l]) => ({ v: +v, label: l })) },
    { key: 'env', type: 'seg', label: 'How the signal fades', options: [{ v: 'urban', label: 'City (Hata)' }, { v: 'free', label: 'Free space 1/d²' }] },
    { key: 'indoor', type: 'toggle', label: 'Phone indoors', hint: 'Adds the loss through a brick wall (ITU-R P.2109).' },
    { key: 'reuse', type: 'seg', label: 'Frequency reuse', options: [{ v: 1, label: '1 (4G)' }, { v: 3, label: '3' }, { v: 4, label: '4' }, { v: 7, label: '7 (2G)' }] },
  ],
  quiz: [
    { q: 'Why does a city have so many towers?', options: ['Towers are cheap', 'A phone\'s weak radio can only reach a nearby tower, and each cell can serve only so many people', 'To make the signal louder', 'Law requires one per street'], answer: 1, why: 'Small cells keep phones close to a tower, and let the same channels be reused across the city.' },
    { q: 'In free space, what happens to the signal power when you go twice as far?', options: ['Halves', 'Falls to a quarter', 'Stays the same', 'Doubles'], answer: 1, why: 'Power spreads over a sphere whose area grows as d², so twice as far means a quarter of the power.' },
    { q: 'What is a handover?', options: ['Giving your phone to a friend', 'Moving your connection to a stronger cell without dropping', 'Switching the phone off', 'Charging from a tower'], answer: 1, why: 'When a neighbour is clearly stronger (here by 3 dB), the network moves you to it in milliseconds.' },
  ],
  reel: [
    { ms: 5600, caption: 'A city is tiled into cells, each served by a tower with three sector antennas.', set: { speed: 'train', env: 'urban', band: 1800, indoor: false, reuse: 7 }, view: { pos: [-1.5, 17, 17], target: [-2.4, 2.2, 0.5] }, spin: 0.15 },
    { ms: 5200, caption: 'As you move, your phone hands over to the strongest tower without dropping the call.', set: { speed: 'train', reuse: 1 }, view: { pos: [-2, 13, 14], target: [0, 0, 1] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---- cell tiles, one per site, split into three sector wedges.
    const tiles = [], sites = [];
    const hexShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * TAU) / 6, x = R * Math.cos(a) * 0.985, z = R * Math.sin(a) * 0.985; i ? hexShape.lineTo(x, z) : hexShape.moveTo(x, z); }
    const hexGeo = new THREE.ShapeGeometry(hexShape); hexGeo.rotateX(Math.PI / 2);
    const edgePts = []; for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + (i * TAU) / 6; edgePts.push(new THREE.Vector3(R * Math.cos(a), 0.03, R * Math.sin(a))); }
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePts);
    for (const [q, r] of SITES) {
      const [x, z] = hexCenter(q, r, R);
      const mat = M.ghost(0x5ce1a9, 0.22);
      const tile = new THREE.Mesh(hexGeo, mat); tile.position.set(x, 0.02, z); root.add(tile);
      const edge = new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); edge.position.set(x, 0, z); root.add(edge);
      const tw = makeTower(1.6); tw.position.set(x, 0, z); root.add(tw);
      tiles.push({ q, r, mat, tile });
      sites.push({ q, r, x, z, tower: tw });
    }
    // Sector borders drawn from each tower at the midpoints between boresights.
    for (const st of sites) for (let i = 0; i < 3; i++) {
      const az = (i / 3) * TAU + Math.PI / 2 + Math.PI / 3;
      const l = tube([[st.x, 0.04, st.z], [st.x + Math.cos(az) * R * 0.95, 0.04, st.z - Math.sin(az) * R * 0.95]], 0.015, M.ghost(0xffffff, 0.25), false, 2); l.castShadow = false; root.add(l);
    }
    // ---- a low city: seeded blocks of buildings between the towers.
    const rand = rng(7), bmat = M.matte(0x3a4050);
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const blocks = new THREE.InstancedMesh(bGeo, bmat, 190); blocks.castShadow = true; blocks.receiveShadow = true;
    const o = new THREE.Object3D(); let nb = 0;
    for (let i = 0; i < 700 && nb < 190; i++) {
      const x = (rand() - 0.5) * 30, z = (rand() - 0.5) * 26;
      if (sites.some((st) => Math.hypot(st.x - x, st.z - z) < 0.7) || Math.hypot(x, z * 1.15) > 13) continue;
      if (Math.abs(z - 1.2 - 2.2 * Math.sin(x * 0.28)) < 0.6) continue;    // keep the road clear
      const h = 0.15 + rand() * rand() * 0.9;
      o.position.set(x, h / 2, z); o.scale.set(0.3 + rand() * 0.4, h, 0.3 + rand() * 0.4); o.updateMatrix(); blocks.setMatrixAt(nb++, o.matrix);
    }
    blocks.count = nb; root.add(blocks);
    // ---- the route: a road winding across the city, and the phone on it.
    const road = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => { const x = -14 + (i * 28) / 12; return new THREE.Vector3(x, 0.05, 1.2 + 2.2 * Math.sin(x * 0.28)); }));
    const roadMesh = tube(road.getPoints(200), 0.08, M.matte(0x8a93a6), false, 200); roadMesh.castShadow = false; root.add(roadMesh);
    const roadKm = road.getLength() * KM;
    const ph = miniPhone(1.5); ph.rotation.x = -0.9; root.add(ph);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 32), M.glow(0x8ef0ff, { transparent: true, opacity: 0.7, side: THREE.DoubleSide })); halo.rotation.x = -Math.PI / 2; root.add(halo);
    // Link beams: to the serving sector (solid) and the best neighbour (faint).
    const beamMat = M.glow(0x5ce1a9, { transparent: true, opacity: 0.9 }), nbMat = M.glow(0xffb547, { transparent: true, opacity: 0.5 });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), beamMat), nbeam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), nbMat);
    root.add(beam, nbeam);
    const place = (m, a, b) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); m.position.copy(A).add(B).multiplyScalar(0.5); m.scale.set(1, A.distanceTo(B), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); };
    const barLbl = stage.label('', [0, 1.4, 0], root, 'hot');
    const hoLbl = stage.label('Handover!', [0, 2.1, 0], root); hoLbl.visible = false;

    // ---- signal history board: serving cell (green) vs best neighbour (amber), last 30 s of scene time.
    const hist = [];
    const chart = board(12, 4.25, 1100, 390, (g, W, H) => {
      boardBg(g, W, H);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('Signal your phone hears (RSRP)', 24, 44);
      const x0 = 110, x1 = W - 24, y0 = H - 40, y1 = 70, lo = -130, hi = -50;
      const Y = (v) => y0 - ((clamp(v, lo, hi) - lo) / (hi - lo)) * (y0 - y1);
      g.font = '22px sans-serif'; g.lineWidth = 1;
      for (let v = -120; v <= -60; v += 20) { g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(v + ' dBm', 14, Y(v) + 7); }
      if (hist.length < 2) return;
      const n = hist.length, X = (i) => x0 + (i / 299) * (x1 - x0);
      for (const [key, col, w] of [['nb', '#ffb547', 3], ['sv', '#5ce1a9', 5]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); hist.forEach((h, i) => (i ? g.lineTo(X(i), Y(h[key])) : g.moveTo(X(i), Y(h[key])))); g.stroke(); }
      hist.forEach((h, i) => { if (h.ho) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(X(i), y1); g.lineTo(X(i), y0); g.stroke(); g.setLineDash([]); } });
      g.font = 'bold 22px sans-serif'; g.fillStyle = '#5ce1a9'; g.fillText('your cell', X(n - 1) - 110 > x0 ? Math.min(x1 - 110, X(n - 1) - 110) : x0, Y(hist[n - 1].sv) - 12);
    });
    chart.mesh.position.set(1.5, 6.4, -12.5); chart.mesh.rotation.x = -0.75; root.add(chart.mesh);

    // ---- radio model: RSRP from every sector of every site.
    const S = { u: 0.3, serving: null, pend: null, pendT: 0, hoCount: 0, hoFlash: 0, sv: -140, nb: -140, nbId: null, d: 0, tick: 0 };
    const measure = (px, pz, s) => {
      const all = [];
      for (const st of sites) {
        const dx = px - st.x, dz = pz - st.z, dKm = Math.max(0.02, Math.hypot(dx, dz) * KM), az = azimuth(dx, dz);
        const pl = pathLoss(dKm, s.band, s.env) + (s.indoor ? wallLoss(s.band / 1000) : 0);
        st.tower.sectors.forEach((sec, k) => all.push({ id: `${st.q},${st.r},${k}`, st, k, dKm, rsrp: EIRP_RE - pl - sectorLoss(angDiff(az, sec.az)) }));
      }
      return all.sort((a, b) => b.rsrp - a.rsrp);
    };
    let lastKey = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const v = (SPEEDS[s.speed].kmh / 3600) * LAPSE;           // km per scene-second
        S.u = (S.u + (dt * v) / roadKm) % 1;
        const p = road.getPointAt(S.u), tg = road.getTangentAt(S.u);
        ph.position.set(p.x, 0.5, p.z); ph.rotation.set(-0.9, Math.atan2(-tg.z, tg.x) - Math.PI / 2, 0, 'YXZ');
        halo.position.set(p.x, 0.06, p.z);
        const key = `${s.band}|${s.env}|${s.indoor}`;
        const all = measure(p.x, p.z, s);
        if (key !== lastKey) { lastKey = key; S.serving = null; }
        let cur = S.serving && all.find((a) => a.id === S.serving);
        if (!cur) { cur = all[0]; S.serving = cur.id; }
        const best = all.find((a) => a.id !== S.serving);
        // Event A3 with time-to-trigger (in real seconds, so scaled by the time-lapse).
        if (best.rsrp > cur.rsrp + A3_DB) { if (S.pend !== best.id) { S.pend = best.id; S.pendT = 0; } S.pendT += dt * LAPSE; if (S.pendT >= A3_TTT) { S.serving = best.id; S.hoCount++; S.hoFlash = 1.2; S.pend = null; cur = best; } }
        else S.pend = null;
        const nb = all.find((a) => a.id !== S.serving);
        S.sv = cur.rsrp; S.nb = nb.rsrp; S.d = cur.dKm; S.cur = cur; S.nbId = nb;
        // Beams from the sector panels.
        const top = (a) => { const sec = a.st.tower.sectors[a.k]; return [a.st.x + Math.cos(sec.az) * 0.15, 1.5, a.st.z - Math.sin(sec.az) * 0.15]; };
        place(beam, top(cur), [p.x, 0.6, p.z]); place(nbeam, top(nb), [p.x, 0.6, p.z]);
        beamMat.color.set(bars(cur.rsrp) >= 3 ? 0x5ce1a9 : bars(cur.rsrp) >= 2 ? 0xffb547 : 0xff5a3d);
        // Tiles: reuse colours, and brighten the serving site.
        for (const t of tiles) {
          const g = reuseGroup(t.q, t.r, s.reuse), serv = cur.st.q === t.q && cur.st.r === t.r;
          t.mat.color.setHex(REUSE_COLOURS[g]); t.mat.opacity = serv ? 0.5 : 0.2;
        }
        for (const st of sites) st.tower.sectors.forEach((sec, k) => sec.mesh.material.color.setHex(st === cur.st && k === cur.k ? 0x5ce1a9 : 0xe9ecf2));
        const b = bars(cur.rsrp);
        barLbl.position.set(p.x, 1.4, p.z); barLbl.element.textContent = `${'▮'.repeat(b)}${'▯'.repeat(4 - b)}  ${Math.round(cur.rsrp)} dBm`;
        S.hoFlash = Math.max(0, S.hoFlash - dt); hoLbl.visible = S.hoFlash > 0; hoLbl.position.set(p.x, 2.1, p.z);
        // Chart history, sampled 10 times a scene-second.
        S.tick += dt;
        if (S.tick > 0.1) { S.tick = 0; hist.push({ sv: S.sv, nb: S.nb, ho: S.hoFlash > 1.1 }); if (hist.length > 300) hist.shift(); chart.redraw(); }
      },
      readout: (s) => {
        const b = bars(S.sv);
        const sir = s.reuse > 1 ? `${sirDb(s.reuse).toFixed(1)} dB` : 'coped with by coding';
        return `<div class="big">${'▮'.repeat(b)}${'▯'.repeat(4 - b)} ${['No service', 'Poor', 'Fair', 'Good', 'Excellent'][b]}</div>
          <div class="row"><span>Signal from your cell (RSRP)</span><b>${Math.round(S.sv)} dBm</b></div>
          <div class="row"><span>Distance to its tower</span><b>${(S.d * 1000 < 1000 ? Math.round(S.d * 1000) + ' m' : S.d.toFixed(2) + ' km')}</b></div>
          <div class="row"><span>Best neighbour</span><b>${Math.round(S.nb)} dBm</b></div>
          <div class="row"><span>Handovers so far</span><b>${S.hoCount}</b></div>
          <div class="row"><span>Reuse ${s.reuse}: worst-case signal to interference</span><b>${sir}</b></div>
          <small>${s.env === 'free' ? 'Free space: power falls as 1/d², so towers would reach much further.' : `City model: Okumura–Hata${s.band > 1500 ? ' / COST-231' : ''}, ${BANDS[s.band]}.`}${s.indoor ? ` Indoors: −${wallLoss(s.band / 1000).toFixed(0)} dB through the walls.` : ''} Hand over when a neighbour is ${A3_DB} dB stronger.</small>`;
      },
    };
  },
};
