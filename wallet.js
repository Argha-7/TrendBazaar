// wallet.js - Full Wallet Page Logic (User)

const SUPABASE_URL = 'https://qixszgjbbxdfzjouuwfx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHN6Z2piYnhkZnpqb3V1d2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTA2MzYsImV4cCI6MjEwMzk4NjYzNn0.pzXkXmWx29JHA4V2l5IJHA11hu2NJTEisNMsJa-pCbQ';

let sb = null;

function initSupabase() {
  if (sb) return sb;
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabase = sb;
  }
  return sb;
}

document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await loadWallet();
  window.refreshWallet = loadWallet;
});

async function loadWallet() {
  initSupabase();

  // Try to get user UID from Firebase or localStorage
  let uid = localStorage.getItem('tb_customer_uid');

  if (!uid && typeof firebase !== 'undefined') {
    const user = firebase.auth ? firebase.auth().currentUser : null;
    if (user) uid = user.uid;
  }

  if (!uid) {
    document.getElementById('txList').innerHTML = `
      <div class="empty-state">
        <i class="ri-login-circle-line"></i>
        <p>Please login to view your wallet</p>
        <button onclick="window.location.href='profile.html'" style="margin-top:10px; background:#2563eb; color:#fff; border:none; border-radius:10px; padding:10px 20px; font-weight:700; cursor:pointer;">Go to Login</button>
      </div>`;
    return;
  }

  if (!sb) {
    document.getElementById('txList').innerHTML = `<div class="empty-state"><i class="ri-error-warning-line"></i><p>Database connection failed.</p></div>`;
    return;
  }

  try {
    // 1. Fetch Balance
    const { data: walletData } = await sb
      .from('wallets')
      .select('balance')
      .eq('firebase_uid', uid)
      .single();

    document.getElementById('walletBalanceAmt').textContent = walletData ? walletData.balance : '0';

    // 2. Fetch Transactions
    const { data: txData, error: txError } = await sb
      .from('wallet_transactions')
      .select('*')
      .eq('firebase_uid', uid)
      .order('created_at', { ascending: false });

    if (txError) {
      console.error(txError);
      return;
    }

    const txList = document.getElementById('txList');
    if (!txData || txData.length === 0) {
      txList.innerHTML = `
        <div class="empty-state">
          <i class="ri-wallet-3-line"></i>
          <p>No transactions yet. Shop now to earn cashback!</p>
        </div>`;
      return;
    }

    txList.innerHTML = txData.map(tx => {
      const isCredit = tx.type === 'CREDIT';
      const icon = isCredit ? 'ri-arrow-right-down-line' : 'ri-arrow-right-up-line';
      const sign = isCredit ? '+' : '-';
      const date = new Date(tx.created_at).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="tx-item">
          <div class="tx-icon ${isCredit ? 'credit' : 'debit'}">
            <i class="${icon}"></i>
          </div>
          <div class="tx-info">
            <div class="tx-title">${tx.description || (isCredit ? 'Refund / Cashback' : 'Payment')}</div>
            <div class="tx-date">${date}</div>
          </div>
          <div class="tx-amount ${isCredit ? 'credit' : 'debit'}">
            ${sign}₹${tx.amount}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Wallet load error:', error);
    document.getElementById('txList').innerHTML = `<div class="empty-state"><i class="ri-error-warning-line"></i><p>Error loading wallet data.</p></div>`;
  }
}
