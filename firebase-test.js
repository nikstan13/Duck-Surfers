// Firebase Test & Setup Helper
// Use this in the browser console to test Firebase connection

// Test if Firebase is working
async function testFirebase() {
  console.log('🔧 Testing Firebase connection...');
  
  // Check if Firebase scripts loaded
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase scripts not loaded');
    return false;
  }
  
  // Check if config is set
  if (!window.firebaseConfig || window.firebaseConfig.apiKey === 'your-api-key-here') {
    console.error('❌ Firebase config not set properly');
    console.log('Please update firebase-config.js with your real Firebase config');
    return false;
  }
  
  // Check if functions are available
  if (typeof window.submitScore !== 'function') {
    console.error('❌ submitScore function not available');
    return false;
  }
  
  if (typeof window.showLeaderboard !== 'function') {
    console.error('❌ showLeaderboard function not available');
    return false;
  }
  
  console.log('✅ All Firebase functions are available');
  
  // Test actual Firebase connection
  try {
    console.log('🔗 Testing Firebase connection...');
    const result = await window.testFirebaseConnection();
    if (result) {
      console.log('✅ Firebase is working perfectly!');
      return true;
    } else {
      console.log('⚠️ Firebase connection test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase test error:', error);
    return false;
  }
}

// Quick setup instructions
function showSetupInstructions() {
  console.log(`
🚀 FIREBASE SETUP INSTRUCTIONS:

1. Go to https://console.firebase.google.com/
2. Create a new project: "duck-surfers-game"
3. Enable Firestore Database (test mode)
4. Add Web App and copy the config
5. Replace the config in firebase-config.js
6. Test with: testFirebase()

Current config status:`, window.firebaseConfig);
}

// Make functions available globally for console testing
window.testFirebase = testFirebase;
window.showSetupInstructions = showSetupInstructions;

// Auto-show instructions if config is not set
if (window.firebaseConfig && window.firebaseConfig.apiKey === 'your-api-key-here') {
  setTimeout(() => {
    console.log('🔥 Firebase needs configuration!');
    console.log('Run: showSetupInstructions() for help');
  }, 1000);
}
