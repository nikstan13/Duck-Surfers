// Firebase Configuration for GitHub Pages
// Go to Firebase Console → Project Settings → General → Your apps → Web app → Config

// IMPORTANT for GitHub Pages:
// 1. Your Firebase project MUST allow your GitHub Pages domain
// 2. Add these authorized domains in Firebase Console → Authentication → Settings → Authorized domains:
//    - nikstan13.github.io (your GitHub Pages domain)
//    - localhost (for local development)

// PASTE YOUR FIREBASE CONFIG HERE:
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id-here",
  
  // GitHub Pages compatibility settings
  databaseURL: undefined, // We're using Firestore, not Realtime Database
  measurementId: undefined // Optional Analytics ID
};

// Validate domain compatibility for GitHub Pages
function validateDomain() {
  const currentDomain = window.location.hostname;
  const allowedDomains = [
    'localhost',
    '127.0.0.1',
    'nikstan13.github.io', // Your GitHub Pages domain
    // Add your custom domain here if you have one
  ];
  
  const isValidDomain = allowedDomains.some(domain => 
    currentDomain === domain || currentDomain.endsWith('.' + domain)
  );
  
  if (!isValidDomain) {
    console.warn(`⚠️ Current domain (${currentDomain}) may not be authorized in Firebase.`);
    console.log('Please add this domain to Firebase Console → Authentication → Settings → Authorized domains');
  }
  
  return isValidDomain;
}

// Check if we're on HTTPS (required for Firebase on production)
function validateHTTPS() {
  const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  
  if (!isHTTPS) {
    console.error('❌ Firebase requires HTTPS in production. GitHub Pages should automatically provide HTTPS.');
    return false;
  }
  
  return true;
}

// Validate configuration
validateDomain();
validateHTTPS();

// Export the config so firebase-leaderboard.js can use it
window.firebaseConfig = firebaseConfig;

console.log('Firebase config loaded for domain:', window.location.hostname);
console.log('Project ID:', firebaseConfig.projectId);
