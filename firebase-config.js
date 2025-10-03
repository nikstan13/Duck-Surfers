// Firebase Configuration - Replace with your actual config
// Go to Firebase Console → Project Settings → General → Your apps → Web app → Config

// PASTE YOUR FIREBASE CONFIG HERE:
const firebaseConfig = {
  apiKey: "AIzaSyDw2uJNpS_XJlFOFL6Pp6vKYoipCLPmTDA",
  authDomain: "duck-surfers.firebaseapp.com",
  projectId: "duck-surfers",
  storageBucket: "duck-surfers.firebasestorage.app",
  messagingSenderId: "209490981991",
  appId: "1:209490981991:web:3b41aacd2c4c720aff90c2",
  measurementId: "G-822D2GP2LQ"
};

// Export the config so firebase-leaderboard.js can use it
window.firebaseConfig = firebaseConfig;

console.log('Firebase config loaded:', firebaseConfig.projectId);
