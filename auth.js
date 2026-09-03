// auth.js - Firebase & Supabase Client Initializer

const firebaseConfig = {
  apiKey: "AIzaSyDNB1HsmtVqjOyLRcxlh-BtfGUPUtG7XqY",
  authDomain: "trendbazaar-8d597.firebaseapp.com",
  projectId: "trendbazaar-8d597",
  storageBucket: "trendbazaar-8d597.firebasestorage.app",
  messagingSenderId: "1013915314979",
  appId: "1:1013915314979:web:7cb1d8988e301fb748fa96",
  measurementId: "G-FJXW25DYGL"
};

// Initialize Firebase safely
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
if (typeof firebase !== 'undefined') {
  window.auth = firebase.auth();
}

// Supabase Configuration
const SUPABASE_URL = 'https://qixszgjbbxdfzjouuwfx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHN6Z2piYnhkZnpqb3V1d2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTA2MzYsImV4cCI6MjEwMzk4NjYzNn0.pzXkXmWx29JHA4V2l5IJHA11hu2NJTEisNMsJa-pCbQ';

// Safe Supabase initialization
if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = window.supabaseClient;
}

// Global helper
window.getSupabase = function() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
  if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabase = window.supabaseClient;
    return window.supabaseClient;
  }
  return null;
};

// Auth State Observer
if (window.auth) {
  window.auth.onAuthStateChanged((user) => {
    if (user) {
      document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));
    } else {
      document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null } }));
    }
  });
}
