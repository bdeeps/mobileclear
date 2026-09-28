// MobileClear's shared models, physics and helpers.
// Every number here comes from a real standard, model or spec; sources sit next to each constant.
import { THREE, M, box, rod, sphere, torus, canvasTexture, clamp } from './kit.js';

export const TAU = Math.PI * 2;
export const C = 299792458;                        // speed of light, m/s
export const H_EV = 4.135667696e-15;               // Planck constant in eV·s (CODATA 2018)
export const lambdaM = (fHz) => C / fHz;           // λ = c / f
export const photonEv = (fHz) => H_EV * fHz;       // E = h f

// ------------------------------------------------------------------ path loss
// Free-space path loss (Friis): FSPL(dB) = 20 log10(d km) + 20 log10(f MHz) + 32.44. Power falls as 1/d².
export const fspl = (dKm, fMHz) => 20 * Math.log10(Math.max(1e-3, dKm)) + 20 * Math.log10(fMHz) + 32.44;
// Urban loss: the Okumura–Hata model (150–1500 MHz) and its COST-231 extension (1500–2000 MHz) for a
// medium city, base antenna 30 m, phone 1.5 m (Hata 1980, IEEE Trans. Veh. Tech. 29(3); COST 231 final
// report, ch. 4.4). Above 2 GHz and below 1 km we extrapolate, which is common for teaching but rough.
export function hata(dKm, fMHz, hb = 30, hm = 1.5) {
  const lf = Math.log10(fMHz), lh = Math.log10(hb);
  const a = (1.1 * lf - 0.7) * hm - (1.56 * lf - 0.8);
  const base = fMHz <= 1500 ? 69.55 + 26.16 * lf : 46.3 + 33.9 * lf;
  return base - 13.82 * lh - a + (44.9 - 6.55 * lh) * Math.log10(Math.max(0.02, dKm));
}
export const pathLoss = (dKm, fMHz, env = 'urban') => (env === 'free' ? fspl(dKm, fMHz) : Math.max(fspl(dKm, fMHz), hata(dKm, fMHz)));

// Link budget for an LTE macro cell, per reference-signal resource element (what phones report as RSRP):
// 43 dBm (20 W) per sector spread over 1,200 subcarriers of a 20 MHz carrier = 12.2 dBm, plus a 17 dBi
// sector panel, minus 2 dB of cable loss ≈ 27 dBm. (Typical values, e.g. 3GPP TR 36.814 Table A.2.1.1-2:
// 46 dBm, 14 dBi; Holma & Toskala, LTE for UMTS, link-budget chapter.)
export const EIRP_RE = 27;
// Sector antenna horizontal pattern, 3GPP TR 36.814: A(θ) = −min(12 (θ/65°)², 20) dB.
export const sectorLoss = (thetaRad) => Math.min(12 * Math.pow((thetaRad * 180 / Math.PI) / 65, 2), 20);
// Building entry loss, ITU-R P.2109-1 horizontal median term for a traditional building:
// L = 12.64 + 3.72 log10(f GHz) + 0.96 (log10 f)². About 12 dB at 700 MHz, 15 dB at 3.5 GHz, 20 dB at 26 GHz.
export const wallLoss = (fGHz) => { const l = Math.log10(fGHz); return 12.64 + 3.72 * l + 0.96 * l * l; };
// Signal bars from RSRP. Phone makers choose their own thresholds; these are typical
// (−80 dBm or more is excellent, −100 fair, below −110 poor, around −120 the phone gives up).
export function bars(rsrp) { return rsrp >= -90 ? 4 : rsrp >= -100 ? 3 : rsrp >= -110 ? 2 : rsrp >= -120 ? 1 : 0; }
// Handover rule: LTE "event A3" fires when a neighbour beats the serving cell by an offset (here 3 dB)
// for a time-to-trigger (here 320 ms). 3GPP TS 36.331 §5.5.4.4.
export const A3_DB = 3, A3_TTT = 0.32;
// Range for a given maximum path loss: solve pathLoss(d) = maxPL by bisection.
export function rangeKm(fMHz, maxPL, env = 'urban') {
  let lo = 0.001, hi = 200;
  for (let i = 0; i < 60; i++) { const mid = Math.sqrt(lo * hi); if (pathLoss(mid, fMHz, env) > maxPL) hi = mid; else lo = mid; }
  return lo;
}

// ------------------------------------------------------------------ hexagonal cells
// Pointy-top hexes in axial coordinates (q, r). A site at (q, r) sits at x = R√3 (q + r/2), z = 1.5 R r.
export const hexCenter = (q, r, R) => [R * Math.sqrt(3) * (q + r / 2), 1.5 * R * r];
export function hexRing(n) { const out = []; for (let q = -n; q <= n; q++) for (let r = Math.max(-n, -q - n); r <= Math.min(n, -q + n); r++) out.push([q, r]); return out; }
// Frequency reuse: a cluster of N cells shares out the channels, so neighbours never use the same ones.
// These linear colourings give every neighbour a different group for N = 3, 4 and 7.
export function reuseGroup(q, r, N) {
  if (N === 7) return (((q + 3 * r) % 7) + 7) % 7;
  if (N === 3) return (((q - r) % 3) + 3) % 3;
  if (N === 4) return (((q % 2) + 2) % 2) + 2 * ((((r % 2) + 2) % 2));
  return 0;
}
// Co-channel reuse distance D = R √(3N); with path-loss exponent n and six equal interferers,
// signal-to-interference S/I ≈ (√(3N))ⁿ / 6 (Rappaport, Wireless Communications, eq. 3.9).
export const sirDb = (N, n = 4) => (N <= 1 ? 0 : 10 * Math.log10(Math.pow(Math.sqrt(3 * N), n) / 6));
export const REUSE_COLOURS = [0x5ce1a9, 0xffb547, 0x8ef0ff, 0xff7a59, 0xc49bff, 0x7aa2ff, 0xf5d316];

// ------------------------------------------------------------------ modulation
export const MODS = {
  qpsk: { name: 'QPSK', M: 4, bits: 2 },
  q16: { name: '16-QAM', M: 16, bits: 4 },
  q64: { name: '64-QAM', M: 64, bits: 6 },
  q256: { name: '256-QAM', M: 256, bits: 8 },
};
// Square M-QAM points, scaled so the average symbol energy is 1.
export function constellation(Mn) {
  const k = Math.sqrt(Mn), pts = [], es = (2 * (Mn - 1)) / 3, s = 1 / Math.sqrt(es);
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) pts.push([(2 * i - k + 1) * s, (2 * j - k + 1) * s]);
  return { pts, half: s };      // half = half the spacing between neighbouring points (the decision boundary)
}
// Gaussian Q-function (Abramowitz & Stegun 7.1.26 erfc approximation).
export function Q(x) {
  const z = x / Math.SQRT2, t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erfc = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z);
  return 0.5 * (z >= 0 ? erfc : 2 - erfc);
}
// Symbol error rate of square M-QAM in noise (Proakis, Digital Communications): Ps ≈ 1 − (1 − P√M)²,
// P√M = 2 (1 − 1/√M) Q(√(3 SNR / (M − 1))). SNR here is per symbol, before error correction.
export function ser(Mn, snrDb) {
  const snr = Math.pow(10, snrDb / 10), p = 2 * (1 - 1 / Math.sqrt(Mn)) * Q(Math.sqrt((3 * snr) / (Mn - 1)));
  return 1 - (1 - p) * (1 - p);
}
// Adaptive modulation: use the densest pattern that keeps raw symbol errors under 1 in 100
// (real phones aim at about 10% block errors after coding, so they can go a few dB lower).
export function pickMod(snrDb) {
  let best = 'qpsk';
  for (const k of ['q16', 'q64', 'q256']) if (ser(MODS[k].M, snrDb) < 0.01) best = k;
  return best;
}
// LTE speed for one 20 MHz carrier: 100 resource blocks × 12 subcarriers × 14 symbols per ms = 16.8 million
// symbols a second on each antenna layer. With 2 layers (2×2 MIMO) and 64-QAM that is 201.6 Mbit/s raw; the
// standard's peak is 150 Mbit/s (Category 4, 3GPP TS 36.306), so about 74% survives coding and overhead.
export const SYMBOLS_PER_S = 16.8e6, LTE_EFF = 150 / 201.6;
export const lteMbps = (bits, layers = 2) => (SYMBOLS_PER_S * bits * layers * LTE_EFF) / 1e6;

// ------------------------------------------------------------------ generations
// Typical real-world speeds are rough mid-range figures from the sources in history.json; the ITU peak
// targets are the IMT-2000, IMT-Advanced and IMT-2020 requirements.
export const GENS = [
  { id: 'g1', name: '1G', years: '1979–1990s', tech: 'Analogue FM voice (AMPS, NMT, TACS)', typ: 0, peak: 0, india: 'India skipped 1G and started straight on digital GSM in 1995.', did: 'Voice only. Anyone with a scanner could listen in.', col: 0xc49bff },
  { id: 'g2', name: '2G', years: '1991 onward', tech: 'Digital GSM and CDMA, then GPRS and EDGE data', typ: 0.05, peak: 0.236, india: 'First call 31 July 1995, Kolkata. Most Indians got their first phone on 2G.', did: 'Digital, encrypted voice, text messages (SMS), slow data.', col: 0xff7a59 },
  { id: 'g3', name: '3G', years: '2001 onward', tech: 'WCDMA and HSPA', typ: 2, peak: 2, india: 'MTNL started 3G in Delhi in December 2008; the big auction came in 2010.', did: 'Mobile web, email and video calls.', col: 0xffb547 },
  { id: 'g4', name: '4G', years: '2009 onward', tech: 'LTE: OFDM with MIMO antennas', typ: 25, peak: 1000, india: 'Airtel began in Kolkata in April 2012; Jio made it mass-market in September 2016.', did: 'Video streaming, apps, maps and payments (UPI) for everyone.', col: 0x5ce1a9 },
  { id: 'g5', name: '5G', years: '2019 onward', tech: '5G NR: wider channels, massive MIMO, mmWave', typ: 200, peak: 20000, india: 'Launched 1 October 2022; India\'s median mobile speed rose from 13.9 to 50 Mbit/s in a year (Ookla).', did: 'Faster, lower-delay links; fixed wireless broadband; many more devices.', col: 0x8ef0ff },
];
// Average price of 1 GB of mobile data in India, ₹. TRAI via PTI (2014–2018: ₹268.97, ₹226, ₹75.57, ₹19.35,
// ₹11.78) and TRAI Performance Indicators for April–June 2023 (revenue per GB ₹9.44).
export const PRICE_GB = [[2014, 268.97], [2015, 226], [2016, 75.57], [2017, 19.35], [2018, 11.78], [2023, 9.44]];

// ------------------------------------------------------------------ calls and texts
// Voice mouth-to-ear delay budget (ms), typical VoLTE figures: 20 ms speech frames (AMR-WB, 3GPP TS 26.171),
// a few ms to encode and decode, ~10 ms scheduling on each radio hop, a jitter buffer of ~40 ms.
// Light in fibre travels at about c/1.47, about 4.9 µs per km; routes run ~1.3× the straight line.
// ITU-T G.114 recommends keeping one-way delay under 150 ms for easy conversation.
export const VOICE = { frame: 20, codec: 8, radioUp: 10, core: 6, radioDown: 10, jitter: 40 };
export const FIBRE_US_PER_KM = 4.9, ROUTE_FACTOR = 1.3;
export const PLACES = {
  city: { name: 'Across the city', km: 15 },
  delhi: { name: 'Delhi to Mumbai', km: 1150 },
  usa: { name: 'India to the USA', km: 13000 },
};
export function voiceDelay(km) {
  const fibre = (km * ROUTE_FACTOR * FIBRE_US_PER_KM) / 1000;
  const v = VOICE, parts = [['Fill a 20 ms speech frame', v.frame], ['Encode and decode', v.codec], ['Radio up to the tower', v.radioUp], ['Core network', v.core], ['Fibre on the way', fibre], ['Radio down to the other phone', v.radioDown], ['Jitter buffer', v.jitter]];
  return { parts, total: parts.reduce((a, p) => a + p[1], 0) };
}
// SMS: 140 bytes of user data (3GPP TS 23.040). In the GSM 7-bit alphabet that is 160 characters;
// Unicode (UCS-2, needed for Hindi) fits 70. Long texts are split into parts with a 6-byte header, leaving 153 or 67.
export function smsParts(chars, unicode) {
  const one = unicode ? 70 : 160, part = unicode ? 67 : 153;
  if (chars <= one) return { parts: 1, per: one };
  return { parts: Math.ceil(chars / part), per: part };
}

// ------------------------------------------------------------------ power
// Phone power model, watts. Screen: a 6.5-inch OLED uses roughly 0.1 W dim to about 1 W at full brightness
// on a bright page (Carroll & Heiser, USENIX ATC 2010; later OLED measurements such as Dong & Zhong, 2011).
// Chip: idle ~0.1 W, video ~0.6 W, a heavy game 2.5–3 W. Radio: LTE active ~1 W baseline (Huang et al.,
// MobiSys 2012) plus the power amplifier, whose output follows uplink power control
// P = min(23 dBm, P0 + α·PL) (3GPP TS 36.213 §5.1.1, here P0 = −95 dBm, α = 1). The amplifier is ~30% efficient.
export const ACTIVITY = {
  idle: { name: 'Pocket (screen off)', soc: 0.03, radio: 0.02, tx: 0.02, screen: false },
  video: { name: 'Streaming video', soc: 0.6, radio: 0.9, tx: 0.3, screen: true },
  game: { name: 'Online game', soc: 2.6, radio: 0.9, tx: 0.5, screen: true },
  call: { name: 'Voice call', soc: 0.25, radio: 0.7, tx: 0.9, screen: false },
};
export function txDbm(rsrp) { const pl = EIRP_RE - rsrp; return clamp(-95 + pl, -40, 23); }
export function power(s) {
  const a = ACTIVITY[s.activity];
  const screen = a.screen ? 0.1 + 0.9 * s.bright : 0;
  const pa = a.tx * (Math.pow(10, txDbm(s.rsrp) / 10) / 1000) / 0.3;
  // In a weak signal each bit needs simpler modulation and more retries, so the radio stays awake longer:
  // up to about twice the energy per bit near the cell edge (Huang et al. 2012 measured LTE energy per bit
  // rising steeply as signal strength falls).
  const weak = clamp((-90 - s.rsrp) / 30, 0, 1);
  const radio = a.radio * (1 + weak) + pa;
  const base = 0.12;                                    // memory, sensors, regulators
  return { screen, soc: a.soc, radio, base, total: screen + a.soc + radio + base };
}
// Battery energy: Wh = mAh × V / 1000; a lithium-ion cell's nominal voltage is about 3.85 V.
export const CELL_V = 3.85;
// SAR limits: India 1.6 W/kg averaged over 1 g of tissue (DoT, from 1 September 2012), the same as the US
// FCC; Europe and ICNIRP: 2.0 W/kg over 10 g.
export const SAR = { india: 1.6, eu: 2.0 };
// Global E-waste Monitor 2024 (ITU/UNITAR): 62 million tonnes of e-waste in 2022, 22.3% properly collected and recycled.
export const EWASTE = { mt: 62, recycled: 22.3 };

// ------------------------------------------------------------------ models
// A rounded-rectangle slab, t thick along Y, w along X and l along Z, centred on the origin.
export function slab(w, l, t, r, mat) {
  const s = new THREE.Shape(), x = -w / 2, z = -l / 2;
  s.moveTo(x + r, z); s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r);
  s.lineTo(x + w, z + l - r); s.quadraticCurveTo(x + w, z + l, x + w - r, z + l);
  s.lineTo(x + r, z + l); s.quadraticCurveTo(x, z + l, x, z + l - r);
  s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(Math.PI / 2); g.translate(0, t / 2, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// A rounded rectangular ring (the phone's metal frame).
export function ring(w, l, t, r, wall, mat) {
  const mk = (W, L, R) => { const s = new THREE.Path(), x = -W / 2, z = -L / 2; s.moveTo(x + R, z); s.lineTo(x + W - R, z); s.quadraticCurveTo(x + W, z, x + W, z + R); s.lineTo(x + W, z + L - R); s.quadraticCurveTo(x + W, z + L, x + W - R, z + L); s.lineTo(x + R, z + L); s.quadraticCurveTo(x, z + L, x, z + L - R); s.lineTo(x, z + R); s.quadraticCurveTo(x, z, x + R, z); return s; };
  const outer = new THREE.Shape(mk(w, l, r).getPoints(12));
  outer.holes.push(new THREE.Path(mk(w - 2 * wall, l - 2 * wall, Math.max(0.02, r - wall)).getPoints(12).reverse()));
  const g = new THREE.ExtrudeGeometry(outer, { depth: t, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(Math.PI / 2); g.translate(0, t / 2, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  return m;
}

// A generic home screen: clock, a grid of plain coloured app tiles, no logos.
export function paintHome(g, w, h, opts = {}) {
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#1b2a55'); bg.addColorStop(0.55, '#3a2a6a'); bg.addColorStop(1, '#0f5a63');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.font = `600 ${w * 0.05}px sans-serif`; g.fillText(opts.time || '10:30', w * 0.07, h * 0.04);
  // status bar: signal bars and battery
  const nb = opts.bars ?? 4;
  for (let i = 0; i < 4; i++) { g.fillStyle = i < nb ? '#fff' : 'rgba(255,255,255,.3)'; const bh = h * 0.008 * (i + 1); g.fillRect(w * 0.7 + i * w * 0.028, h * 0.04 - bh, w * 0.018, bh); }
  g.strokeStyle = '#fff'; g.lineWidth = w * 0.006; g.strokeRect(w * 0.84, h * 0.022, w * 0.09, h * 0.02); g.fillStyle = '#5ce1a9'; g.fillRect(w * 0.845, h * 0.025, w * 0.08 * (opts.batt ?? 0.8), h * 0.014);
  if (opts.big) { g.font = `300 ${w * 0.2}px sans-serif`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(opts.big, w / 2, h * 0.28); g.textAlign = 'left'; }
  const cols = ['#ff7a59', '#5ce1a9', '#ffb547', '#8ef0ff', '#c49bff', '#7aa2ff', '#f5d316', '#ff5a8a'];
  const s = w * 0.16, gap = (w - 4 * s) / 5;
  for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) {
    const x = gap + i * (s + gap), y = h * 0.36 + j * (s + gap * 1.4);
    g.fillStyle = cols[(i + j * 3) % cols.length]; roundRect(g, x, y, s, s, s * 0.25); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.18, 0, TAU); g.fill();
  }
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// A generic smartphone, 1 unit = 2 cm: 7.5 × 16 × 0.8 cm. Long axis along Z (top of the phone at −Z),
// screen facing +Y. Parts are grouped by layer so chapter 1 can pull them apart.
export const PHONE = { w: 3.75, l: 8.0, t: 0.4, r: 0.5 };
export function makePhone({ screenTex = null, detail = true } = {}) {
  const { w, l, r } = PHONE;
  const group = new THREE.Group();
  const parts = {};
  const L = (name, obj) => { parts[name] = obj; group.add(obj); return obj; };

  // Back glass with a camera bump.
  const back = L('back', new THREE.Group());
  const backMat = M.plastic(0x2c3444, { roughness: 0.25, metalness: 0.2, transparent: true, opacity: 1 });
  back.add(slab(w, l, 0.06, r, backMat));
  const bump = slab(1.55, 1.7, 0.08, 0.35, backMat); bump.position.set(-0.85, -0.07, -2.85); back.add(bump);
  // Frame, with plastic antenna breaks cut into the metal.
  const frameMat = M.metal(0xaab1bd, { transparent: true, opacity: 1 });
  const frame = L('frame', ring(w, l, 0.36, r, 0.08, frameMat)); frame.position.y = 0.2;
  const antennas = new THREE.Group(); frame.add(antennas);
  const antMat = M.plastic(0x5b6474, { emissive: new THREE.Color(0x8ef0ff), emissiveIntensity: 0 });
  // Four antenna sections of the frame: two at the top, two at the bottom (typical of metal-framed phones).
  const antSpots = [];
  for (const [x, z, sx, sz] of [[-1.05, -3.97, 1.4, 0.1], [1.05, -3.97, 1.4, 0.1], [-1.05, 3.97, 1.4, 0.1], [1.05, 3.97, 1.4, 0.1]]) {
    const a = box(sx, 0.3, sz + 0.03, antMat); a.position.set(x, 0, z); antennas.add(a); antSpots.push(a);
  }
  for (const [x, z] of [[-1.9, -3.2], [1.9, -3.2], [-1.9, 3.2], [1.9, 3.2]]) { const gap = box(0.1, 0.36, 0.08, M.plastic(0x1a1d24)); gap.position.set(x, 0, z); frame.add(gap); }

  // Inside: battery, mainboard with chips, cameras, speakers, vibration motor, SIM tray, port.
  const inner = L('inner', new THREE.Group()); inner.position.y = 0.2;
  const battery = box(3.1, 0.24, 4.3, M.plastic(0x3b3f4a, { roughness: 0.6 })); battery.position.set(0, 0, 1.25); inner.add(battery);
  const battLabel = box(2.4, 0.005, 1.4, M.matte(0x5ce1a9)); battLabel.position.set(0, 0.123, 1.25); battery.add(battLabel); battLabel.position.set(0, 0.123, 0);
  const board = box(3.2, 0.05, 2.6, M.plastic(0x1f5a3a, { roughness: 0.5 })); board.position.set(0.1, -0.06, -2.35); inner.add(board);
  const chip = (wd, dp, col, x, z, h = 0.06) => { const c = box(wd, h, dp, M.plastic(col, { roughness: 0.35, metalness: 0.3 })); c.position.set(x, -0.03 + h / 2, z); inner.add(c); return c; };
  const soc = chip(0.75, 0.75, 0x2a2d35, 0.55, -2.15, 0.09);
  const socTop = box(0.55, 0.01, 0.55, M.metal(0xd0d5dd)); socTop.position.y = 0.05; soc.add(socTop);
  const modem = chip(0.45, 0.45, 0x2a2d35, 1.25, -1.5);
  const rf = chip(0.5, 0.3, 0x5a6270, 1.3, -3.2);
  const pa = chip(0.3, 0.3, 0x6b7280, 0.55, -3.3);
  const mem = chip(0.5, 0.6, 0x23262e, -0.25, -1.55);
  const pmic = chip(0.35, 0.35, 0x23262e, -0.3, -2.3);
  const cams = new THREE.Group(); cams.position.set(-0.85, -0.02, -2.85); inner.add(cams);
  for (const [x, z, rr] of [[-0.35, -0.38, 0.3], [-0.35, 0.38, 0.3], [0.38, 0, 0.24]]) {
    const body = rod(-0.2, 0.2, rr, rr, M.plastic(0x191b21)); body.rotation.z = Math.PI / 2; body.position.set(x, 0, z); cams.add(body);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(rr * 0.7, 24), M.plastic(0x16335a, { roughness: 0.05, metalness: 0.6 })); glass.rotation.x = Math.PI / 2; glass.position.set(x, -0.215, z); cams.add(glass);
  }
  const front = rod(-0.08, 0.08, 0.12, 0.12, M.plastic(0x191b21)); front.rotation.z = Math.PI / 2; front.position.set(0, 0.1, -3.55); inner.add(front);
  const spk = box(1.1, 0.2, 0.45, M.plastic(0x30343e)); spk.position.set(0.8, 0, 3.6); inner.add(spk);
  const ear = box(0.9, 0.08, 0.12, M.plastic(0x30343e)); ear.position.set(0, 0.1, -3.78); inner.add(ear);
  const vib = box(0.7, 0.2, 0.3, M.metal(0x8b93a2)); vib.position.set(-0.9, 0, 3.6); inner.add(vib);
  const usb = box(0.5, 0.12, 0.3, M.metal(0xc5cad3)); usb.position.set(0, 0, 3.82); inner.add(usb);
  const mic = rod(-0.05, 0.05, 0.05, 0.05, M.metal(0x6b7280)); mic.rotation.z = Math.PI / 2; mic.position.set(-0.45, 0, 3.8); inner.add(mic);
  const coil = torus(0.8, 0.05, M.metal(0xc9803c), 48); coil.rotation.x = Math.PI / 2; coil.position.set(0, -0.15, 1.2); inner.add(coil);
  const sim = new THREE.Group(); sim.position.set(1.83, 0, -0.9); inner.add(sim);
  const tray = box(0.5, 0.05, 1.1, M.metal(0xb9bec8)); sim.add(tray);
  const card = box(0.4, 0.02, 0.5, M.plastic(0xe9ecf2)); card.position.set(0, 0.035, -0.15); sim.add(card);
  const contacts = box(0.28, 0.005, 0.3, M.metal(0xd8b34a)); contacts.position.set(0, 0.047, -0.15); sim.add(contacts);
  // Antenna feeds: thin lines from the RF front-end to the frame antennas.
  const feedMat = M.glow(0x8ef0ff, { transparent: true, opacity: 0 });
  const feeds = [[-1.05, -3.9], [1.05, -3.9], [-1.05, 3.9], [1.05, 3.9]].map(([x, z]) => {
    const pts = [new THREE.Vector3(1.3, 0.03, -3.2), new THREE.Vector3((x + 1.3) / 2, 0.05, (z - 3.2) / 2), new THREE.Vector3(x, 0.03, z)];
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.018, 6), feedMat); inner.add(m); return m;
  });

  // Display stack: OLED panel, touch layer, cover glass.
  const oled = L('oled', new THREE.Group()); oled.position.y = 0.4;
  const oledMat = screenTex ? new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }) : M.plastic(0x0b0d12, { roughness: 0.2 });
  const panel = slab(w - 0.16, l - 0.16, 0.04, r - 0.08, [M.plastic(0x0b0d12), oledMat]);
  // ExtrudeGeometry groups: 0 = caps (top/bottom faces), 1 = sides. Put the picture on the caps, dark sides.
  panel.material = [oledMat, M.plastic(0x0b0d12)];
  oled.add(panel);
  // UV the cap faces from the shape's x/z coordinates.
  { const g = panel.geometry, pos = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + (w - 0.16) / 2) / (w - 0.16), 1 - (pos.getZ(i) + (l - 0.16) / 2) / (l - 0.16)); uv.needsUpdate = true; }
  const touch = L('touch', new THREE.Group()); touch.position.y = 0.45;
  const grid = canvasTexture(128, 256, (g2, W, H) => {
    g2.clearRect(0, 0, W, H); g2.strokeStyle = 'rgba(142,240,255,.9)'; g2.lineWidth = 1.5;
    for (let i = 1; i < 9; i++) { g2.beginPath(); g2.moveTo((i * W) / 9, 0); g2.lineTo((i * W) / 9, H); g2.stroke(); }
    g2.strokeStyle = 'rgba(255,181,71,.9)';
    for (let j = 1; j < 18; j++) { g2.beginPath(); g2.moveTo(0, (j * H) / 18); g2.lineTo(W, (j * H) / 18); g2.stroke(); }
  });
  const touchMat = new THREE.MeshBasicMaterial({ map: grid.tex, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, l - 0.3), touchMat); tp.rotation.x = -Math.PI / 2; touch.add(tp);
  const glass = L('glass', new THREE.Group()); glass.position.y = 0.48;
  const glassMat = M.clear(0xdff2ff, 0.12, { roughness: 0.05 });
  glass.add(slab(w, l, 0.05, r, glassMat));

  return { group, parts, backMat, frameMat, antMat, antSpots, feedMat, feeds, battery, board, soc, modem, rf, pa, mem, pmic, cams, front, spk, ear, vib, usb, mic, coil, sim, panel, oledMat, touchMat, glassMat, inner };
}

// A small handset for the city and call scenes: a slab with a glowing screen. 1 unit ≈ size of the scene.
export function miniPhone(scale = 1, screenColor = 0x8ef0ff) {
  const g = new THREE.Group();
  const body = slab(0.75 * scale, 1.6 * scale, 0.1 * scale, 0.12 * scale, M.plastic(0x2c3444, { roughness: 0.3 })); g.add(body);
  const scr = slab(0.66 * scale, 1.48 * scale, 0.02 * scale, 0.09 * scale, M.glow(screenColor)); scr.position.y = 0.055 * scale; g.add(scr);
  g.screen = scr;
  return g;
}

// A lattice cell tower with three sector panels at the top. Height h (units).
export function makeTower(h = 2, panelColor = 0xe9ecf2) {
  const g = new THREE.Group();
  const mat = M.metal(0xc8cdd6);
  const legs = 3;
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * TAU;
    const pts = [new THREE.Vector3(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22), new THREE.Vector3(Math.cos(a) * 0.06, h, Math.sin(a) * 0.06)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(pts[0], pts[1]), 1, 0.025, 6), mat));
  }
  for (let k = 1; k < 5; k++) { const y = (k / 5) * h, rr = 0.22 - (0.16 * k) / 5; const t = torus(rr, 0.012, mat, 12); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  const sectors = [];
  for (let i = 0; i < 3; i++) {
    const az = (i / 3) * TAU + Math.PI / 2;                    // boresights at 90°, 210°, 330° (world, from +X toward −Z)
    const p = box(0.12, 0.5, 0.05, M.plastic(panelColor)); const d = 0.14;
    p.position.set(Math.cos(az) * d, h - 0.1, -Math.sin(az) * d); p.rotation.y = az + Math.PI / 2; g.add(p);
    sectors.push({ az, mesh: p });
  }
  const beacon = sphere(0.05, M.glow(0xff5a3d)); beacon.position.y = h + 0.2; g.add(beacon);
  g.sectors = sectors; g.beacon = beacon;
  return g;
}
// Angle from a site to a point, measured the same way as the sector boresights (from +X toward −Z).
export const azimuth = (dx, dz) => Math.atan2(-dz, dx);
export const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };

// A flat canvas board in the scene.
export function board(w, h, pxW, pxH, draw) {
  const ct = canvasTexture(pxW, pxH, draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false }));
  return { mesh, redraw: ct.redraw };
}
export function boardBg(g, W, H) { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(8,10,16,.9)'; roundRect(g, 0, 0, W, H, 18); g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; roundRect(g, 1, 1, W - 2, H - 2, 18); g.stroke(); }

// Seeded random numbers so the city looks the same every time.
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// Standard normal from a uniform source (Box–Muller).
export function gauss(rand) { const u = Math.max(1e-9, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

export { clamp };
