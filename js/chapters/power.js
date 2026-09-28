// Chapter 6: power and health. A battery (mAh → Wh) drains into 3D bars for the screen, the chip and the
// radio, where the radio's share comes from uplink power control (weak signal → the amplifier works harder).
// A board puts phone radio on the electromagnetic spectrum by photon energy (E = hf) against the ~10 eV
// needed to ionise, and shows the SAR limit. Plus the e-waste numbers.
import { THREE, M, box, approach, clamp } from '../kit.js';
import { ACTIVITY, power, txDbm, bars, CELL_V, SAR, EWASTE, photonEv, slab, board, boardBg, TAU } from '../mobile.js';

const KEYS = [['screen', 'Screen', 0xffb547], ['soc', 'Chip', 0xc49bff], ['radio', 'Radio', 0x8ef0ff], ['base', 'Other', 0x7a8394]];
// Photon energies on a log scale, eV. X-ray tube photons of ~60 keV (see XrayClear); ionising starts around
// 10 eV (hydrogen's ionisation energy is 13.6 eV; ICNIRP and WHO put the boundary near 10–12 eV).
const SPECTRUM = [
  ['700 MHz', photonEv(700e6), '#8ef0ff'], ['3.5 GHz', photonEv(3.5e9), '#8ef0ff'], ['26 GHz 5G', photonEv(26e9), '#8ef0ff'],
  ['Microwave oven 2.45 GHz', photonEv(2.45e9), '#7aa2ff'], ['Warmth you feel (infrared)', 0.1, '#ff7a59'], ['Visible light', 2.0, '#f5d316'],
  ['UV that tans', 4.0, '#c49bff'], ['Medical X-ray', 60000, '#ff5a3d'],
];

export default {
  id: 'power',
  short: 'Power and health',
  title: 'Battery, radiation and what\'s left',
  subtitle: 'Where the battery goes, why a weak signal drains it, and what phone radio can and can\'t do to your body.',
  view: { pos: [1.0, 5.0, 14.5], target: [0.6, 2.9, 0] },
  learn: `<p>A phone battery is rated in <b>mAh</b> (how much charge it holds). Multiply by its voltage, about <b>3.85 V</b>, to get energy: a 5,000 mAh battery holds about <b>19 watt-hours</b>, enough to run a 10 W LED bulb for two hours (see CurrentClear for how a lithium-ion cell works).</p>
    <p>The biggest drains are the <b>screen</b> (more when bright) and the <b>chip</b> (a game can burn 2 to 3 W). The <b>radio</b> is sneaky: when the tower is far or you're indoors, your phone turns up its transmitter, up to 0.2 W out, which takes about 0.7 W from the battery. That's why your battery dies fast in a basement or on a train.</p>
    <p><b>Is phone radiation dangerous?</b> Phone signals are <b>non-ionising</b>: each packet of radio energy (a photon) is about a <b>million times too weak</b> to knock an electron off an atom and damage DNA, unlike X-rays or strong UV (compare XrayClear). The one proven effect is gentle <b>heating</b>, like HeatClear's warm objects. So limits cap the <b>SAR</b>, the power soaked up per kilogram of body. In India it's <b>1.6 W/kg</b> averaged over 1 gram of tissue. Large studies, including a 2024 review for the WHO, found no link between phone use and brain cancer. Using earphones or speaker mode lowers your exposure further if you want to.</p>
    <p><b>E-waste.</b> In 2022 the world threw away <b>62 million tonnes</b> of electronics, and only about <b>22%</b> was properly recycled. Old phones hold gold, copper and cobalt. Give them to an authorised recycler, not the bin.</p>
    <p class="tip"><b>Try it:</b> set a streaming session, then drag the signal down to −120 dBm and see the radio bar grow and the hours fall.</p>`,
  terms: [
    { t: 'mAh', d: 'Milliamp-hours: how much electric charge a battery holds.' },
    { t: 'Watt-hour (Wh)', d: 'Energy: one watt for one hour. mAh × volts ÷ 1000.' },
    { t: 'Power control', d: 'The phone sends only as loudly as it needs to: quiet near the tower, loud far away.' },
    { t: 'Non-ionising radiation', d: 'Radiation too weak per photon to break chemical bonds or knock electrons off atoms.' },
    { t: 'SAR', d: 'Specific absorption rate: radio power absorbed by the body, in watts per kilogram.' },
    { t: 'E-waste', d: 'Thrown-away electronics, full of valuable metals and some toxic ones.' },
  ],
  defaults: { activity: 'video', bright: 0.6, rsrp: -85, mah: 5000 },
  controls: [
    { key: 'activity', type: 'seg', label: 'Doing', options: Object.entries(ACTIVITY).map(([v, a]) => ({ v, label: a.name.split(' (')[0] })) },
    { key: 'bright', type: 'range', label: 'Screen brightness', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'rsrp', type: 'range', label: 'Signal (RSRP)', min: -125, max: -65, step: 1, ends: ['weak', 'strong'], fmt: (v) => `${v} dBm, ${bars(v)} bars` },
    { key: 'mah', type: 'seg', label: 'Battery', options: [3000, 4000, 5000, 6000].map((v) => ({ v, label: v.toLocaleString('en-IN') + ' mAh' })) },
  ],
  quiz: [
    { q: 'Why does your battery drain faster when the signal is weak?', options: ['The screen gets brighter', 'The phone turns up its transmitter to reach the tower', 'The SIM heats up', 'It doesn\'t'], answer: 1, why: 'Uplink power control raises the transmit power as the path loss grows, up to 0.2 W.' },
    { q: 'Why can\'t phone radio waves break DNA like X-rays can?', options: ['They are too slow', 'Each photon carries about a million times too little energy to ionise', 'Phones use special shielding', 'They never reach the body'], answer: 1, why: 'A 3.5 GHz photon has about 0.000015 eV; knocking off an electron takes about 10 eV.' },
    { q: 'What is India\'s SAR limit for phones?', options: ['16 W/kg over 1 kg', '1.6 W/kg averaged over 1 g of tissue', '0.16 W/kg over the whole body', 'There is none'], answer: 1, why: 'India adopted the stricter 1-gram measure, the same as the US, from September 2012.' },
  ],
  reel: [
    { ms: 5400, caption: 'A weak signal makes your phone shout: the radio can drain the battery faster than the screen.', set: { activity: 'video', bright: 0.5, mah: 5000 }, anim: { rsrp: [-75, -122] }, spin: 0 },
    { ms: 5200, caption: 'Phone radio is non-ionising: each photon is a million times too weak to break a molecule.', set: { activity: 'call', rsrp: -95 }, view: { pos: [4.6, 4.2, 10.5], target: [4.8, 3.0, -1.2] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // ---- the battery: a big lithium-ion pouch standing up, with its charge level.
    const batt = new THREE.Group(); batt.position.set(-4.6, 0, 0.4); root.add(batt);
    const shell = slab(1.8, 3.4, 0.5, 0.15, M.clear(0xcfe8ff, 0.2)); shell.rotation.x = Math.PI / 2; shell.position.y = 1.8; batt.add(shell);
    const fill = box(1.6, 1, 0.4, M.glow(0x5ce1a9, { transparent: true, opacity: 0.8 })); batt.add(fill);
    const tab = box(0.5, 0.2, 0.1, M.metal(0xc5cad3)); tab.position.set(0, 3.6, 0); batt.add(tab);
    const battLbl = stage.label('', [-4.6, 4.2, 0.4], root, 'hot');
    // ---- bars for each drain, in watts (1 W = 1 unit tall).
    const bars3 = KEYS.map(([k, name, col], i) => {
      const x = -2.4 + i * 1.3, b = box(0.9, 1, 0.9, M.plastic(col, { roughness: 0.4 })); root.add(b);
      const base = box(1.0, 0.06, 1.0, M.plastic(0x2a2f3a)); base.position.set(x, 0.03, 0.4); root.add(base);
      const lbl = stage.label(name, [x, -0.3, 1.1], root), val = stage.label('', [x, 1, 0.9], root, 'hot');
      return { k, x, b, val, h: 0.05 };
    });
    // ---- spectrum board.
    const spec = board(7.4, 5.5, 900, 670, (g, W, H) => {
      boardBg(g, W, H);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('Energy of one photon (E = h × f)', 24, 46);
      const x0 = 60, x1 = W - 40, y = 360, lo = -6, hi = 5;         // log10(eV) from 10⁻⁶ to 10⁵
      const X = (ev) => x0 + ((Math.log10(ev) - lo) / (hi - lo)) * (x1 - x0);
      // ionising zone
      g.fillStyle = 'rgba(255,90,61,.18)'; g.fillRect(X(10), 90, x1 - X(10), 420);
      g.fillStyle = '#ff5a3d'; g.font = 'bold 24px sans-serif'; g.fillText('Ionising: can', X(10) + 10, 122); g.fillText('break DNA', X(10) + 10, 150);
      g.fillStyle = 'rgba(142,240,255,.8)'; g.fillText('Non-ionising: can only warm', x0 + 6, 122);
      g.strokeStyle = '#ff5a3d'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(10), 90); g.lineTo(X(10), 510); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)';
      for (let e = lo; e <= hi; e++) { const x = X(Math.pow(10, e)); g.fillRect(x - 1, y - 8, 2, 16); if (e % 2 === 0) g.fillText(`10${sup(e)} eV`, x - 26, y + 36); }
      SPECTRUM.forEach(([name, ev, col], i) => {
        const x = X(ev), up = i % 2 === 0, yy = up ? y - 50 - (i % 4) * 30 : y + 70 + (i % 4) * 26;
        g.fillStyle = col; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
        g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, yy + (up ? 6 : -20)); g.stroke();
        g.font = '23px sans-serif'; g.textAlign = x > W - 180 ? 'right' : x < 140 ? 'left' : 'center'; g.fillText(name, x, yy); g.textAlign = 'left';
      });
      g.font = '22px sans-serif'; g.fillStyle = '#e8eef8';
      g.fillText(`SAR limit, India: ${SAR.india} W/kg over 1 g of tissue (Europe ${SAR.eu} W/kg over 10 g)`, 24, H - 58);
      g.fillText(`E-waste 2022: ${EWASTE.mt} million tonnes, ${EWASTE.recycled}% properly recycled`, 24, H - 24);
    });
    spec.mesh.position.set(5.2, 3.4, -1.6); spec.mesh.rotation.y = -0.22; root.add(spec.mesh);
    spec.redraw();

    let charge = 1, t = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const p = power(s), wh = (s.mah * CELL_V) / 1000;
        // Drain shown as a time-lapse: one full battery in about 40 s of scene time at 1 W... scaled by the load.
        charge -= (dt * p.total) / (wh * 1.5); if (charge < 0.05) charge = 1;
        fill.scale.y = 3.2 * charge; fill.position.y = 0.1 + 1.6 * charge + 0.02;
        fill.material.color.setHex(charge > 0.4 ? 0x5ce1a9 : charge > 0.15 ? 0xffb547 : 0xff5a3d);
        battLbl.element.textContent = `${s.mah.toLocaleString('en-IN')} mAh · ${wh.toFixed(1)} Wh`;
        bars3.forEach((b) => {
          const w = p[b.k]; b.h = approach(b.h, Math.max(0.02, w * 1.6), 6, dt);
          b.b.scale.y = b.h; b.b.position.set(b.x, 0.06 + b.h / 2, 0.4);
          b.val.position.set(b.x, 0.4 + b.h, 0.9); b.val.element.textContent = w < 0.1 ? Math.round(w * 1000) + ' mW' : w.toFixed(2) + ' W';
        });
      },
      readout: (s) => {
        const p = power(s), wh = (s.mah * CELL_V) / 1000, hrs = wh / p.total, tx = txDbm(s.rsrp);
        return `<div class="big">≈ ${hrs < 48 ? hrs.toFixed(1) + ' hours' : Math.round(hrs / 24) + ' days'} of ${ACTIVITY[s.activity].name.toLowerCase()}</div>
          <div class="row"><span>Battery energy</span><b>${s.mah.toLocaleString('en-IN')} mAh × ${CELL_V} V = ${wh.toFixed(1)} Wh</b></div>
          <div class="row"><span>Total draw</span><b>${p.total.toFixed(2)} W</b></div>
          <div class="row"><span>Phone's transmit power</span><b>${tx.toFixed(0)} dBm (${tx > 0 ? Math.round(Math.pow(10, tx / 10)) + ' mW' : '< 1 mW'})</b></div>
          <div class="row"><span>Radio's share</span><b>${Math.round((100 * p.radio) / p.total)}%</b></div>
          <small>Rough model from published measurements. Transmit power capped at 23 dBm (0.2 W).</small>`;
      },
    };
  },
};

function sup(n) { const m = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(n).split('').map((c) => m[c]).join(''); }
