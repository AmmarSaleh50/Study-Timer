// src/firestoreQuotaGuard.js
// Prevents exceeding Firestore free daily quota by tracking reads/writes in localStorage.

const READ_LIMIT = 20000;   // Set below the free daily quota (Spark: 50,000)
const WRITE_LIMIT = 5000;    // Set below the free daily quota (Spark: 20,000)

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

function resetIfNeeded() {
  const lastReset = localStorage.getItem('firestoreQuotaLastReset');
  const today = getTodayKey();
  if (lastReset !== today) {
    localStorage.setItem('firestoreQuotaReads', '0');
    localStorage.setItem('firestoreQuotaWrites', '0');
    localStorage.setItem('firestoreQuotaLastReset', today);
  }
}

export function canRead() {
  resetIfNeeded();
  const reads = parseInt(localStorage.getItem('firestoreQuotaReads') || '0', 10);
  return reads < READ_LIMIT;
}

export function canWrite() {
  resetIfNeeded();
  const writes = parseInt(localStorage.getItem('firestoreQuotaWrites') || '0', 10);
  return writes < WRITE_LIMIT;
}

export function recordRead() {
  resetIfNeeded();
  let reads = parseInt(localStorage.getItem('firestoreQuotaReads') || '0', 10);
  reads++;
  localStorage.setItem('firestoreQuotaReads', reads.toString());
}

export function recordWrite() {
  resetIfNeeded();
  let writes = parseInt(localStorage.getItem('firestoreQuotaWrites') || '0', 10);
  writes++;
  localStorage.setItem('firestoreQuotaWrites', writes.toString());
}
