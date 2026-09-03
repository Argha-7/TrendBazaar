// admin_wallet.js - Admin Wallet Management Engine
// Locked to Master Admin: biswajitsingh7899@gmail.com

const MASTER_ADMIN_EMAIL = 'biswajitsingh7899@gmail.com';
const SUPABASE_URL = 'https://qixszgjbbxdfzjouuwfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHN6Z2piYnhkZnpqb3V1d2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTA2MzYsImV4cCI6MjEwMzk4NjYzNn0.pzXkXmWx29JHA4V2l5IJHA11hu2NJTEisNMsJa-pCbQ';

const firebaseConfig = {
  apiKey: "AIzaSyDNB1HsmtVqjOyLRcxlh-BtfGUPUtG7XqY",
  authDomain: "trendbazaar-8d597.firebaseapp.com",
  projectId: "trendbazaar-8d597",
  storageBucket: "trendbazaar-8d597.firebasestorage.app",
  messagingSenderId: "1013915314979",
  appId: "1:1013915314979:web:7cb1d8988e301fb748fa96"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

let sb = null;
if (typeof supabase !== 'undefined') {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let selectedUid = null;

// ---- Auth Guard ----
if (typeof firebase !== 'undefined') {
  firebase.auth().onAuthStateChanged((user) => {
    const guard = document.getElementById('adminAuthGuard');
    const content = document.getElementById('adminWalletContent');
    if (!user || (user.email || '').toLowerCase().trim() !== MASTER_ADMIN_EMAIL.toLowerCase()) {
      if (guard) guard.style.display = 'block';
      if (content) content.style.display = 'none';
    } else {
      if (guard) guard.style.display = 'none';
      if (content) content.style.display = 'block';
      loadWallets();
      loadTransactions();
    }
  });
} else {
  // Fallback - just load in dev mode
  loadWallets();
  loadTransactions();
}

// ---- Load All Wallets ----
async function loadWallets() {
  if (!sb) return;
  const tbody = document.getElementById('walletsTableBody');
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;"><i class="ri-loader-4-line"></i> Loading...</td></tr>`;

  try {
    const { data, error } = await sb.from('wallets').select('*').order('updated_at', { ascending: false });
    if (error) throw error;

    // Update stats
    document.getElementById('statTotalUsers').textContent = data.length;
    const totalBal = data.reduce((sum, w) => sum + (w.balance || 0), 0);
    document.getElementById('statTotalBalance').textContent = `₹${totalBal}`;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:#94a3b8;">No wallets found yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(w => {
      const updated = w.updated_at ? new Date(w.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      const shortUid = w.firebase_uid.substring(0, 16) + '...';
      return `
        <tr>
          <td><span class="badge-uid" title="${w.firebase_uid}">${shortUid}</span></td>
          <td><strong style="font-size:1.05rem;color:#059669;">₹${w.balance || 0}</strong></td>
          <td>${updated}</td>
          <td>
            <button onclick="openModal('${w.firebase_uid}')" style="background:#eff6ff;color:#2563eb;border:none;border-radius:8px;padding:7px 14px;font-weight:700;cursor:pointer;font-size:0.82rem;">
              <i class="ri-pencil-line"></i> Adjust
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#dc2626;padding:20px;">${e.message}</td></tr>`;
  }
}

window.loadWallets = loadWallets;

// ---- Load Recent Transactions ----
async function loadTransactions() {
  if (!sb) return;
  const tbody = document.getElementById('txTableBody');

  try {
    const { data, error } = await sb
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    document.getElementById('statTotalTx').textContent = data.length;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:#94a3b8;">No transactions yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(tx => {
      const isCredit = tx.type === 'CREDIT';
      const date = new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const shortUid = (tx.firebase_uid || '').substring(0, 14) + '...';
      return `
        <tr>
          <td><span class="badge-uid" title="${tx.firebase_uid}">${shortUid}</span></td>
          <td><span class="${isCredit ? 'badge-credit' : 'badge-debit'}">${tx.type}</span></td>
          <td><strong style="color:${isCredit ? '#059669' : '#dc2626'}">${isCredit ? '+' : '-'}₹${tx.amount}</strong></td>
          <td>${tx.description || '—'}</td>
          <td style="color:#94a3b8;font-size:0.8rem;">${date}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
  }
}

// ---- Modal Controls ----
function openModal(uid) {
  selectedUid = uid;
  document.getElementById('modalUserUid').textContent = uid;
  document.getElementById('modalAmount').value = '';
  document.getElementById('modalDescription').value = '';
  document.getElementById('modalStatus').textContent = '';
  document.getElementById('walletModal').classList.add('active');
}
window.openModal = openModal;

function closeModal() {
  document.getElementById('walletModal').classList.remove('active');
  selectedUid = null;
}
window.closeModal = closeModal;

// ---- Submit Wallet Adjustment ----
async function submitWalletAdjustment() {
  if (!selectedUid || !sb) return;
  const opType = document.getElementById('modalOpType').value;
  const amount = parseFloat(document.getElementById('modalAmount').value);
  const description = document.getElementById('modalDescription').value.trim();
  const statusEl = document.getElementById('modalStatus');

  if (!amount || amount <= 0) {
    statusEl.style.color = '#dc2626';
    statusEl.textContent = '⚠️ Enter a valid amount.';
    return;
  }

  statusEl.style.color = '#64748b';
  statusEl.textContent = 'Processing...';

  try {
    // 1. Get current wallet (upsert if not exists)
    const { data: existing } = await sb.from('wallets').select('balance').eq('firebase_uid', selectedUid).single();
    const currentBalance = existing ? (existing.balance || 0) : 0;
    const newBalance = opType === 'CREDIT' ? currentBalance + amount : Math.max(0, currentBalance - amount);

    // 2. Upsert wallet balance
    const { error: upsertErr } = await sb.from('wallets').upsert({
      firebase_uid: selectedUid,
      balance: newBalance,
      updated_at: new Date().toISOString()
    }, { onConflict: 'firebase_uid' });

    if (upsertErr) throw upsertErr;

    // 3. Insert transaction record
    const { error: txErr } = await sb.from('wallet_transactions').insert({
      firebase_uid: selectedUid,
      amount: amount,
      type: opType,
      description: description || (opType === 'CREDIT' ? 'Admin Credit' : 'Admin Debit')
    });

    if (txErr) throw txErr;

    statusEl.style.color = '#059669';
    statusEl.textContent = `✅ Success! New balance: ₹${newBalance}`;

    // Refresh tables
    setTimeout(() => {
      closeModal();
      loadWallets();
      loadTransactions();
    }, 1200);

  } catch (e) {
    statusEl.style.color = '#dc2626';
    statusEl.textContent = `❌ Error: ${e.message}`;
  }
}
window.submitWalletAdjustment = submitWalletAdjustment;

// Close modal on overlay click
document.getElementById('walletModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('walletModal')) closeModal();
});
