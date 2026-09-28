// Chapter 3: bits as radio waves. A band slider sets the carrier frequency: the wave beside the phone is
// drawn at its true wavelength (λ = c/f) against the phone's 16 cm, the range ring comes from the same
// path-loss model as chapter 2, and the wall shows building entry loss (ITU-R P.2109). The board is a live
// constellation: QPSK to 256-QAM with Gaussian noise set by the SNR slider, and the speed that results.
import { THREE, M, box, canvasTexture } from '../kit.js';
import {
  lambdaM, rangeKm, wallLoss, EIRP_RE, MODS, constellation, ser, pickMod, lteMbps, makeTower, makePhone, paintHome,
  board, boardBg, rng, gauss, TAU, PHONE,
} from '../mobile.js';

const MAXPL = EIRP_RE + 115;            // path loss at which RSRP falls to −115 dBm: roughly the edge of useful 4G
const fmtF = (f) => (f >= 1000 ? (f / 1000).toFixed(2).replace(/\.?0+$/, '') + ' GHz' : Math.round(f) + ' MHz');
const MOD_KEYS = ['qpsk', 'q16', 'q64', 'q256'];

export default {
  id: 'radio',
  short: 'Riding radio waves',
  title: 'Voice and data on radio waves',
  subtitle: 'How a phone packs bits into a wave, and why low bands travel far while high bands carry more.',
  view: { pos: [0.2, 5.0, 15.5], target: [-0.4, 3.2, 0] },
  learn: `<p>Your voice, your videos and your messages all travel as <b>radio waves</b>: electric and magnetic ripples moving at the speed of light (see WaveClear). Their <b>frequency</b> is how many times they wiggle each second. Indian phone bands run from <b>700 MHz</b> to <b>3.5 GHz</b>, and 5G adds <b>26 GHz</b> millimetre waves.</p>
    <p>The wavelength is <b>λ = c / f</b>. At 700 MHz a wave is 43 cm long, longer than your phone. At 3.5 GHz it is under 9 cm. <b>Low bands</b> bend round obstacles, pass through walls better and reach further, so one tower covers a big area. <b>High bands</b> have much more room (wider channels), so they carry more data, but over shorter distances.</p>
    <p>How do bits ride on a wave? The phone nudges the wave's <b>size</b> and <b>timing (phase)</b>. Each allowed combination is a dot on a map called a <b>constellation</b>, and each dot stands for a group of bits. <b>QPSK</b> has 4 dots (2 bits each). <b>256-QAM</b> has 256 dots (8 bits each), so it is four times faster, but its dots sit so close that a little <b>noise</b> makes the receiver pick the wrong one. So your phone switches pattern every millisecond: dense when the signal is clean, simple when it's noisy.</p>
    <p class="tip"><b>Try it:</b> slide the noise up and watch the dots blur into each other. With "Auto" on, see the phone drop from 256-QAM to QPSK, and the speed fall.</p>`,
  terms: [
    { t: 'Frequency', d: 'How many times a wave wiggles each second, in hertz. 1 GHz is a billion times a second.' },
    { t: 'Wavelength', d: 'The length of one wiggle: λ = c / f.' },
    { t: 'Modulation', d: 'Changing a wave\'s size and phase so that it carries information.' },
    { t: 'QAM', d: 'Quadrature amplitude modulation: a grid of size-and-phase combinations, each standing for a group of bits.' },
    { t: 'SNR', d: 'Signal-to-noise ratio: how much stronger the signal is than the background hiss, in decibels.' },
    { t: 'mmWave', d: 'Radio above about 24 GHz, with wavelengths of a few millimetres: huge capacity, very short range.' },
  ],
  defaults: { f: 1800, snr: 30, mod: 'auto' },
  controls: [
    { key: 'f', type: 'log', label: 'Band (carrier frequency)', min: 700, max: 3500, ends: ['700 MHz', '3.5 GHz'], fmt: (v) => fmtF(v) },
    { key: 'snr', type: 'range', label: 'Signal-to-noise ratio', min: 0, max: 35, step: 0.5, ends: ['noisy', 'clean'], fmt: (v) => v.toFixed(1) + ' dB' },
    { key: 'mod', type: 'seg', label: 'Modulation', options: [{ v: 'auto', label: 'Auto' }, ...MOD_KEYS.map((k) => ({ v: k, label: MODS[k].name }))] },
  ],
  quiz: [
    { q: 'What is the wavelength of a 3 GHz radio wave? (c = 300,000 km/s)', options: ['10 cm', '1 m', '3 mm', '30 m'], answer: 0, why: 'λ = c / f = 300,000,000 ÷ 3,000,000,000 = 0.1 m.' },
    { q: 'Why can a 700 MHz tower cover a bigger area than a 3.5 GHz one?', options: ['It is more powerful by law', 'Lower frequencies lose less power in the city and through walls', 'It uses bigger phones', 'It sends fewer bits'], answer: 1, why: 'Longer waves are weakened less by distance, buildings and walls.' },
    { q: 'Your signal gets noisy. What does your phone do?', options: ['Switches to a denser pattern like 256-QAM', 'Switches to a simpler pattern like QPSK', 'Turns off', 'Nothing'], answer: 1, why: 'Simple patterns have dots far apart, so noise can\'t confuse them. Fewer bits per symbol, but they arrive intact.' },
  ],
  reel: [
    { ms: 5600, caption: 'Low bands have long waves that travel far; high bands carry more data but fade faster.', set: { snr: 30, mod: 'auto' }, anim: { f: [700, 3500, true] }, spin: 0 },
    { ms: 5600, caption: 'Each dot carries bits. When noise blurs the dots, your phone falls back to a simpler pattern.', set: { f: 1800, mod: 'auto' }, anim: { snr: [34, 6] }, view: { pos: [2.6, 4.8, 10.5], target: [2.2, 3.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---- a tower on the left, a wall, and a big phone standing on the right with a to-scale wave.
    const tw = makeTower(3.4); tw.position.set(-7.2, 0, -1.5); root.add(tw);
    const wall = box(0.35, 2.6, 4.2, M.matte(0xb86b4b)); wall.position.set(-3.2, 1.3, -0.6); root.add(wall);
    stage.label('Brick wall', [-3.2, 2.9, -0.6], root);
    // Big phone: 1 unit = 4 cm here (phone 16 cm = 4 units). Stands upright, screen to camera.
    const home = canvasTexture(360, 768, (g, w, h) => paintHome(g, w, h, { big: '5G' }));
    const P = makePhone({ screenTex: home.tex });
    const phone = P.group; phone.scale.setScalar(0.5); phone.rotation.x = Math.PI / 2; phone.rotation.z = 0;
    phone.position.set(-0.9, 2.2, 0); root.add(phone);
    const UNIT_M = 0.16 / (PHONE.l * 0.5);        // metres per scene unit near the phone (phone is 4 units = 16 cm)
    // Wave line along X beside the phone, starting at the wall.
    const N = 600, wpos = new Float32Array(N * 3);
    const wgeo = new THREE.BufferGeometry(); wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3));
    const wline = new THREE.Line(wgeo, new THREE.LineBasicMaterial({ color: 0x8ef0ff })); root.add(wline);
    const fadeWave = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)), new THREE.LineBasicMaterial({ color: 0x8ef0ff, transparent: true, opacity: 0.8 })); root.add(fadeWave);
    const lamLbl = stage.label('', [0, 0, 0], root, 'hot');
    const ruler = box(1, 0.03, 0.03, M.glow(0xffb547)); root.add(ruler);
    stage.label('Phone: 16 cm', [-0.9, 4.5, 0.2], root);
    // Range ring on the ground around the tower (scaled: 1 km = 1 unit).
    const rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), M.glow(0x5ce1a9, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    rangeRing.rotation.x = -Math.PI / 2; rangeRing.position.set(-7.2, 0.03, -1.5); root.add(rangeRing);
    const rangeLbl = stage.label('', [0, 0, 0], root);

    // ---- constellation board.
    const rand = rng(3), noise = Array.from({ length: 900 }, () => [gauss(rand), gauss(rand)]), pick = Array.from({ length: 900 }, () => rand());
    const cb = board(4.6, 4.6, 720, 720, (g, W, H, s, mk) => {
      boardBg(g, W, H);
      if (!s) return;
      const m = MODS[mk], { pts, half } = constellation(m.M);
      const snr = Math.pow(10, s.snr / 10), sigma = Math.sqrt(1 / (2 * snr));   // noise per axis for unit symbol energy
      const cx = W / 2, cy = H / 2 + 20, sc = (W * 0.36);
      g.fillStyle = '#e8eef8'; g.font = 'bold 32px sans-serif'; g.fillText(`${m.name}: ${m.bits} bits per dot`, 24, 46);
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx - sc * 1.25, cy); g.lineTo(cx + sc * 1.25, cy); g.moveTo(cx, cy - sc * 1.25); g.lineTo(cx, cy + sc * 1.25); g.stroke();
      g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('in phase →', cx + sc * 0.8, cy + 26); g.save(); g.translate(cx - 12, cy - sc * 0.8); g.rotate(-Math.PI / 2); g.fillText('quadrature →', 0, 0); g.restore();
      // Received symbols: an ideal point plus Gaussian noise. Red if it lands nearer a different point.
      const ndots = m.M >= 64 ? 900 : 600, r = m.M >= 256 ? 2.2 : 3, maxC = Math.max(...pts.map((q) => q[0]));
      let wrong = 0;
      for (let i = 0; i < ndots; i++) {
        const p = pts[Math.floor(pick[i] * pts.length)];
        const x = p[0] + noise[i][0] * sigma, y = p[1] + noise[i][1] * sigma;
        const bad2 = edgeWrong(x, p[0], half, maxC) || edgeWrong(y, p[1], half, maxC);
        if (bad2) wrong++;
        g.fillStyle = bad2 ? 'rgba(255,90,61,.9)' : 'rgba(142,240,255,.7)';
        g.fillRect(cx + x * sc - r / 2, cy - y * sc - r / 2, r, r);
      }
      g.fillStyle = '#ffb547'; for (const p of pts) { g.beginPath(); g.arc(cx + p[0] * sc, cy - p[1] * sc, m.M >= 256 ? 2.5 : 5, 0, TAU); g.fill(); }
      g.font = 'bold 24px sans-serif'; g.fillStyle = wrong ? '#ff5a3d' : '#5ce1a9';
      g.fillText(`${wrong} of ${ndots} symbols misread (red)`, 24, H - 22);
    });
    cb.mesh.position.set(4.6, 3.0, -0.6); cb.mesh.rotation.y = -0.18; root.add(cb.mesh);

    let t = 0, drawn = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const lam = lambdaM(s.f * 1e6), lamU = lam / UNIT_M;              // wavelength in scene units
        const x0 = -3.0, x1 = 3.1, amp0 = 0.55, y0 = 2.2, z0 = 0.9;
        // Wave from the wall to the phone and past it; weaker after the wall by the P.2109 loss (in amplitude).
        const loss = wallLoss(s.f / 1000), after = Math.pow(10, -loss / 20);
        for (let i = 0; i < N; i++) {
          const x = x0 + ((x1 - x0) * i) / (N - 1), ph = ((x - x0) / lamU) * TAU - t * 6;
          wpos.set([x, y0 + amp0 * Math.max(after, 0.12) * 1.8 * Math.sin(ph), z0], i * 3);
        }
        wgeo.attributes.position.needsUpdate = true;
        // Outside wave (before the wall): full strength, from the tower to the wall.
        const fp = fadeWave.geometry.attributes.position;
        for (let i = 0; i < N; i++) { const x = -7.0 + ((-3.4 + 7.0) * i) / (N - 1), ph = ((x - x0) / lamU) * TAU - t * 6; fp.setXYZ(i, x, y0 + amp0 * 1.8 * Math.sin(ph) * 0.5 + (3.3 - y0) * (1 - (x + 7) / 3.6), z0 * ((x + 7) / 3.6)); }
        fp.needsUpdate = true;
        // Ruler: one wavelength, to scale with the phone.
        ruler.scale.x = lamU; ruler.position.set(-2.8 + lamU / 2, 0.25, z0);
        lamLbl.position.set(-2.8 + Math.min(lamU, 6) / 2, 0.6, z0); lamLbl.element.textContent = `λ = ${(lam * 100).toFixed(1)} cm (to scale)`;
        const km = rangeKm(s.f, MAXPL);
        rangeRing.scale.setScalar(km); rangeLbl.position.set(-7.2 + km * 0.7, 0.3, -1.5 + km * 0.7); rangeLbl.element.textContent = `Range ≈ ${km.toFixed(1)} km`;
        const mk = s.mod === 'auto' ? pickMod(s.snr) : s.mod;
        const key = `${mk}|${s.snr.toFixed(1)}`;
        if (key !== drawn) { drawn = key; cb.redraw(s, mk); }
      },
      readout: (s) => {
        const lam = lambdaM(s.f * 1e6), mk = s.mod === 'auto' ? pickMod(s.snr) : s.mod, m = MODS[mk], e = ser(m.M, s.snr);
        const good = e < 0.1, mbps = lteMbps(m.bits) * (good ? 1 - Math.min(0.9, e * 2) : 0.05);
        return `<div class="big">${good ? Math.round(mbps) + ' Mbit/s' : 'Too many errors'}</div>
          <div class="row"><span>Wavelength λ = c / f</span><b>${(lam * 100).toFixed(1)} cm</b></div>
          <div class="row"><span>Urban range, same power</span><b>≈ ${rangeKm(s.f, MAXPL).toFixed(1)} km</b></div>
          <div class="row"><span>Lost through a brick wall</span><b>${wallLoss(s.f / 1000).toFixed(1)} dB (${Math.round(100 * (1 - Math.pow(10, -wallLoss(s.f / 1000) / 10)))}% of the power)</b></div>
          <div class="row"><span>${m.name}, symbol errors</span><b class="${e < 0.01 ? 'ok' : 'no'}">${e < 1e-4 ? '< 0.01%' : (e * 100).toFixed(e < 0.01 ? 2 : 1) + '%'}</b></div>
          <div class="row"><span>5G mmWave, 26 GHz</span><b>λ = 1.15 cm, a few hundred metres</b></div>
          <small>One 20 MHz 4G carrier, 2×2 MIMO: 16.8 million symbols a second per layer × ${m.bits} bits, less coding.</small>`;
      },
    };
  },
};

// A received value is misread if it lands past the halfway line to a neighbouring point
// (outer points have no neighbour beyond them, so overshooting outward is still read correctly).
function edgeWrong(v, ideal, half, maxC) {
  const d = v - ideal;
  if (Math.abs(d) <= half) return false;
  if (d > 0 && ideal >= maxC - 1e-9) return false;
  if (d < 0 && ideal <= -maxC + 1e-9) return false;
  return true;
}
