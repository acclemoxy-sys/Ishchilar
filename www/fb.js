if (!FIREBASE_CONFIG.apiKey) {
  document.body.innerHTML = '<div style="padding:24px;font-family:sans-serif"><h3>Firebase sozlanmagan</h3><p>www/firebase-config.js faylini to\'ldiring.</p></div>';
  throw new Error('Firebase config yo\'q');
}
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const fs = firebase.firestore();
const FV = firebase.firestore.FieldValue;
const norm = s => s.toLowerCase().replace(/[ʻʼ’'`‘´\s]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
const wEmail = (h, wid, v) => `w.${h}.${wid}.${v}@sehhisob.app`;
const wPass = pin => `p${pin}seh`;
const saved = () => { try { return JSON.parse(localStorage.getItem('seh_cloud')); } catch (e) { return null; } };
const setSaved = o => localStorage.setItem('seh_cloud', JSON.stringify(o));
const setPersist = r => auth.setPersistence(r ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
function toLauncher() { localStorage.removeItem('seh_mode'); location.href = 'index.html'; }
function errTxt(e) {
  const c = e && e.code || '';
  if (c === 'auth/email-already-in-use') return 'Bu email bilan akkaunt bor';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(c)) return "Email, parol yoki PIN noto'g'ri";
  if (c === 'auth/invalid-email') return "Email noto'g'ri yozilgan";
  if (c === 'auth/weak-password') return "Parol kamida 6 belgi bo'lsin";
  if (c === 'auth/too-many-requests') return "Juda ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring";
  if (c === 'auth/network-request-failed' || c === 'unavailable') return 'Internet yo\'q';
  if (c === 'permission-denied') return "Ruxsat yo'q";
  return 'Xato: ' + (e && e.message || e);
}
