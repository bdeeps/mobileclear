// Chapter 4: 1G to 5G. Five pillars whose heights follow the log of typical download speed, each topped
// by a phone of its era, and a board with India's collapsing price of mobile data (TRAI figures).
import { THREE, M, box, rod, approach } from '../kit.js';
import { GENS, PRICE_GB, miniPhone, slab, board, boardBg, TAU } from '../mobile.js';

const FILM_GB = 1.5;                 // a two-hour film at ordinary (SD/HD) streaming quality
const fmtSpeed = (m) => (m <= 0 ? 'voice only' : m < 1 ? Math.round(m * 1000) + ' kbit/s' : m >= 1000 ? m / 1000 + ' Gbit/s' : m + ' Mbit/s');
const fmtTime = (s) => (s < 60 ? Math.round(s) + ' s' : s < 3600 ? Math.round(s / 60) + ' min' : s < 86400 ? (s / 3600).toFixed(1) + ' hours' : (s / 86400).toFixed(1) + ' days');

export default {
  id: 'generations',
  short: '1G to 5G',
  title: 'From 1G to 5G',
  subtitle: 'Each generation is a new rulebook for the radio. Speeds rose about four thousand times in thirty years.',
  view: { pos: [1.4, 5.0, 17.5], target: [0.6, 3.0, 0] },
  learn: `<p>Every ten years or so, engineers agree a new rulebook for how phones and towers talk. Each is called a <b>generation</b>.</p>
    <p><b>1G</b> (from 1979) sent your voice as a plain <b>analogue</b> wave, like FM radio. Anyone with a scanner could listen in. <b>2G</b> (GSM, 1991) turned voice into <b>digital</b> numbers, encrypted it, and added <b>SMS</b> text messages. India began here: the first call was on <b>31 July 1995</b> in Kolkata. Early on, you even paid to receive a call.</p>
    <p><b>3G</b> brought the mobile web. <b>4G LTE</b> (2009) switched to all-internet data using <b>OFDM</b>, splitting a channel into hundreds of narrow subcarriers, plus <b>MIMO</b>, several antennas sending at once. <b>5G</b> (2019) uses wider channels, antennas with dozens of elements that aim beams, and new bands.</p>
    <p>In India, the big change came in <b>September 2016</b>, when Reliance <b>Jio</b> launched 4G with free calls and very cheap data. Everyone else cut prices. According to TRAI, 1 GB of mobile data cost about <b>₹269 in 2014</b>, <b>₹12 in 2018</b> and under <b>₹10</b> by 2023. Hundreds of millions of people came online for the first time, on their phones.</p>
    <p class="tip"><b>Try it:</b> step through the generations and compare how long each takes to download a film. Watch the price bars on the board.</p>`,
  terms: [
    { t: 'Analogue', d: 'A signal that copies the sound wave smoothly, rather than as numbers.' },
    { t: 'Digital', d: 'Information sent as numbers (bits), which can be checked, compressed and encrypted.' },
    { t: 'GSM', d: 'The 2G standard born in Europe and used by most of the world, including India.' },
    { t: 'LTE', d: 'Long Term Evolution: the 4G standard.' },
    { t: 'OFDM', d: 'Splitting a channel into many narrow subcarriers that each carry a little data at once.' },
    { t: 'MIMO', d: 'Multiple antennas on both ends sending several streams at the same time.' },
  ],
  defaults: { gen: 'g4' },
  controls: [
    { key: 'gen', type: 'seg', label: 'Generation', options: GENS.map((g) => ({ v: g.id, label: g.name })), fmt: (v) => GENS.find((g) => g.id === v).years },
  ],
  quiz: [
    { q: 'What was the big change from 1G to 2G?', options: ['Colour screens', 'Voice became digital, and texts arrived', 'Phones got cameras', 'Calls became free'], answer: 1, why: '2G turned voice into encrypted digital data and added SMS.' },
    { q: 'About how much did 1 GB of mobile data cost in India in 2014, according to TRAI?', options: ['₹2', '₹27', '₹269', '₹2,690'], answer: 2, why: 'About ₹269 per GB in 2014, falling to about ₹12 by 2018 after Jio\'s launch.' },
    { q: 'When was India\'s first mobile phone call?', options: ['1985', '1995', '2005', '2016'], answer: 1, why: '31 July 1995: West Bengal\'s Chief Minister Jyoti Basu, in Kolkata, called Union Telecom Minister Sukh Ram in Delhi.' },
  ],
  reel: [
    { ms: 5200, caption: 'In India, 1 GB of mobile data fell from about ₹269 in 2014 to under ₹10 by 2023.', set: { gen: 'g4' }, view: { pos: [4.6, 4.0, 10.5], target: [5.4, 3.2, -1.2] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // Height ∝ log10(typical speed / 10 kbit/s); 1G (no data) gets a short stub.
    const H = (m) => (m <= 0 ? 0.25 : 0.4 + 0.75 * Math.log10(m / 0.01));
    const pillars = GENS.map((g, i) => {
      const x = -5.4 + i * 1.9, z = 0.8;
      const mat = M.plastic(g.col, { roughness: 0.4, transparent: true, opacity: 0.85 });
      const col = box(1.1, 1, 1.1, mat); root.add(col);
      const top = new THREE.Group(); root.add(top);
      // A phone of the era: a brick with an aerial, a candybar, a slider-ish, then two smartphones.
      if (i === 0) { const b = box(0.35, 1.0, 0.18, M.plastic(0x3a3d44)); b.position.y = 0.5; top.add(b); const ae = rod(0, 0.5, 0.03, 0.02, M.plastic(0x1a1c22)); ae.rotation.z = Math.PI / 2; ae.position.set(0.1, 1.0, 0); top.add(ae); }
      else if (i === 1) { const b = slab(0.4, 0.95, 0.18, 0.12, M.plastic(0x2f4a7a)); b.rotation.x = Math.PI / 2; b.position.y = 0.5; top.add(b); const sc = box(0.28, 0.24, 0.02, M.glow(0x9fd08a)); sc.position.set(0, 0.72, 0.1); top.add(sc); for (let k = 0; k < 9; k++) { const key = box(0.07, 0.05, 0.02, M.plastic(0xd9dde5)); key.position.set(-0.1 + (k % 3) * 0.1, 0.22 + Math.floor(k / 3) * 0.1, 0.1); top.add(key); } }
      else { const p = miniPhone(i === 2 ? 0.6 : 0.75, i === 2 ? 0x8ab0ff : 0x8ef0ff); p.rotation.x = Math.PI / 2; p.position.y = 0.62; top.add(p); }
      const lbl = stage.label(`<b>${g.name}</b>`, [x, 0, z + 0.7], root);
      const val = stage.label('', [x, 0, z], root, 'hot');
      return { g, x, z, mat, col, top, lbl, val, h: 0.1 };
    });
    // Ground strip: a timeline 1980 → 2025.
    const strip = box(11.4, 0.05, 0.25, M.plastic(0x2a2f3a)); strip.position.set(-1.6, 0.025, 2.1); root.add(strip);

    // ---- board: India's price of 1 GB of mobile data, and the generations' dates.
    const bd = board(6.4, 4.6, 900, 650, (g, W, Hh) => {
      boardBg(g, W, Hh);
      g.fillStyle = '#e8eef8'; g.font = 'bold 32px sans-serif'; g.fillText('India: average price of 1 GB of mobile data', 24, 48);
      g.font = '22px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('TRAI figures, rupees per GB', 24, 80);
      const x0 = 90, x1 = W - 30, y0 = Hh - 70, y1 = 120, max = 300;
      const n = PRICE_GB.length, bw = (x1 - x0) / n;
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
      for (let v = 0; v <= 300; v += 100) { const y = y0 - (v / max) * (y0 - y1); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('₹' + v, 20, y + 7); }
      PRICE_GB.forEach(([yr, p], i) => {
        const x = x0 + i * bw + bw * 0.15, h = (p / max) * (y0 - y1), jio = yr >= 2016;
        g.fillStyle = jio ? '#5ce1a9' : '#ff7a59'; g.fillRect(x, y0 - h, bw * 0.7, h);
        g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
        g.fillText('₹' + (p < 20 ? p.toFixed(p < 10 ? 2 : 1) : Math.round(p)), x + bw * 0.35, y0 - h - 10);
        g.font = '24px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(yr + (yr === 2023 ? '*' : ''), x + bw * 0.35, y0 + 30);
        g.textAlign = 'left';
      });
      const xj = x0 + 2 * bw; g.strokeStyle = '#ffb547'; g.setLineDash([8, 6]); g.lineWidth = 3; g.beginPath(); g.moveTo(xj, y1 - 10); g.lineTo(xj, y0); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffb547'; g.font = 'bold 22px sans-serif'; g.fillText('Sept 2016: Jio launches', xj + 8, y1 + 10);
      g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText('* April–June 2023, revenue per GB', 24, Hh - 16);
    });
    bd.mesh.position.set(6.9, 3.2, -1.2); bd.mesh.rotation.y = -0.4; root.add(bd.mesh);
    bd.redraw();

    let t = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        pillars.forEach((p) => {
          const on = p.g.id === s.gen, target = H(p.g.typ);
          p.h = approach(p.h, target, 4, dt);
          p.col.scale.set(1, p.h, 1); p.col.position.set(p.x, p.h / 2, p.z);
          p.mat.opacity = on ? 0.95 : 0.35; p.mat.emissive = p.mat.emissive || new THREE.Color(); p.mat.emissive.setHex(on ? p.g.col : 0); p.mat.emissiveIntensity = on ? 0.35 : 0;
          p.top.position.set(p.x, p.h, p.z); p.top.rotation.y = on ? t * 0.8 : 0;
          p.lbl.position.set(p.x, -0.35, p.z + 0.8);
          p.val.position.set(p.x, p.h + 1.6, p.z); p.val.visible = on; p.val.element.textContent = fmtSpeed(p.g.typ);
        });
      },
      readout: (s) => {
        const g = GENS.find((x) => x.id === s.gen), secs = g.typ > 0 ? (FILM_GB * 8000) / g.typ : 0;
        return `<div class="big">${g.name} · ${g.years}</div>
          <div class="row"><span>How it works</span><b>${g.tech}</b></div>
          <div class="row"><span>Typical download</span><b>${fmtSpeed(g.typ)}</b></div>
          ${g.peak ? `<div class="row"><span>Headline peak</span><b>${fmtSpeed(g.peak)}</b></div>` : ''}
          <div class="row"><span>A 1.5 GB film takes</span><b>${secs ? fmtTime(secs) : 'impossible'}</b></div>
          <small>${g.did} ${g.india}</small>`;
      },
    };
  },
};
