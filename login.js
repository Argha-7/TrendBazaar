// login.js - Smart Customer & Master Admin Google Authentication Engine

const auth = window.auth;
const MASTER_ADMIN_EMAIL = 'biswajitsingh7899@gmail.com';

let isLoginMode = true;
let currentLoginTab = 'customer'; // 'customer' or 'admin'

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  const r = params.get('redirect');
  if (r) return decodeURIComponent(r);
  const stored = sessionStorage.getItem('auth_redirect');
  if (stored) return stored;
  return 'index.html';
}

function checkParamsOnLoad() {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  const banner = document.getElementById('authNoticeBanner');
  if (banner) {
    if (reason === 'buy' || reason === 'cart') {
      banner.style.display = 'block';
      banner.innerHTML = `<i class="ri-lock-2-fill"></i> <strong>Please Login or Create an Account</strong> to add items to cart and place orders.`;
    } else if (reason === 'admin_required') {
      banner.style.display = 'block';
      banner.innerHTML = `<i class="ri-shield-keyhole-fill"></i> <strong>Master Admin Login Required</strong> (biswajitsingh7899@gmail.com).`;
      switchLoginTab('admin');
    }
  }

  if (params.get('tab') === 'admin') {
    switchLoginTab('admin');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkParamsOnLoad();
});

function switchLoginTab(tab) {
  currentLoginTab = tab;
  
  // UI Tabs
  document.getElementById('tabCustomer').classList.toggle('active', tab === 'customer');
  document.getElementById('tabAdmin').classList.toggle('active', tab === 'admin');
  
  // Switch Sections
  document.getElementById('customerAuthSection').style.display = tab === 'customer' ? 'block' : 'none';
  document.getElementById('adminAuthSection').style.display = tab === 'admin' ? 'block' : 'none';
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  if (currentLoginTab === 'admin') return;
  
  isLoginMode = !isLoginMode;
  
  document.getElementById('authPageTitle').textContent = isLoginMode ? 'Welcome Back!' : 'Create an Account';
  document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Login securely' : 'Register securely';
  
  document.getElementById('authSwitchText').textContent = isLoginMode ? "Don't have an account? " : "Already have an account? ";
  document.getElementById('authSwitchLink').textContent = isLoginMode ? "Create one now" : "Login here";
}

// Customer Email/Password Submit
function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const btn = document.getElementById('authSubmitBtn');
  const originalText = btn.textContent;
  
  btn.textContent = 'Please wait...';
  btn.disabled = true;

  if (isLoginMode) {
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        showSkToast('🎉 Logged in successfully! Redirecting...');
        const dest = getRedirectUrl();
        sessionStorage.removeItem('auth_redirect');
        setTimeout(() => window.location.href = dest, 800);
      })
      .catch((error) => {
        alert(error.message);
        btn.textContent = originalText;
        btn.disabled = false;
      });
  } else {
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => {
        showSkToast('🎉 Account created successfully! Redirecting...');
        const dest = getRedirectUrl();
        sessionStorage.removeItem('auth_redirect');
        setTimeout(() => window.location.href = dest, 800);
      })
      .catch((error) => {
        alert(error.message);
        btn.textContent = originalText;
        btn.disabled = false;
      });
  }
}

// Customer Google Login
function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      showSkToast('🎉 Google Login successful! Redirecting...');
      const dest = getRedirectUrl();
      sessionStorage.removeItem('auth_redirect');
      setTimeout(() => {
        window.location.href = dest;
      }, 800);
    }).catch((error) => {
      alert(error.message);
    });
}

// MASTER ADMIN GOOGLE LOGIN (LOCKED TO biswajitsingh7899@gmail.com)
function handleAdminGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      const userEmail = (result.user.email || '').toLowerCase().trim();
      
      if (userEmail === MASTER_ADMIN_EMAIL.toLowerCase().trim()) {
        showSkToast('👑 Master Admin Verified! Opening Command Center...');
        localStorage.setItem('tb_admin_authorized', 'true');
        setTimeout(() => {
          window.location.href = 'admin_master.html';
        }, 900);
      } else {
        // Unauthorized user tried to login as Admin
        auth.signOut();
        localStorage.removeItem('tb_admin_authorized');
        alert(`❌ Access Denied!\n\n"${userEmail}" is not authorized as Master Admin.\nOnly ${MASTER_ADMIN_EMAIL} can access the Admin Dashboard.`);
      }
    })
    .catch((error) => {
      alert('Google Auth Error: ' + error.message);
    });
}
window.handleAdminGoogleLogin = handleAdminGoogleLogin;

function showSkToast(msg) {
  let container = document.getElementById('skToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'skToastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'sk-toast';
  toast.style.cssText = 'background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 8px; border: 1px solid #2874f0; font-weight: 700; font-size: 0.88rem;';
  toast.innerHTML = `<i class="ri-information-fill" style="color: #38bdf8;"></i> ${msg}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Redirect already logged-in users
if (auth) {
  auth.onAuthStateChanged((user) => {
    if (user && currentLoginTab !== 'admin') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('redirect')) {
        window.location.href = decodeURIComponent(params.get('redirect'));
      }
    }
  });
}
