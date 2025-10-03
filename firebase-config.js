// Firebase Configuration - Replace with your actual config
// Go to Firebase Console → Project Settings → General → Your apps → Web app → Config

// PASTE YOUR FIREBASE CONFIG HERE:
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id-here"
};

// Export the config so firebase-leaderboard.js can use it
window.firebaseConfig = firebaseConfig;

console.log('Firebase config loaded:', firebaseConfig.projectId);
