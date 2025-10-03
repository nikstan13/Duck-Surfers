// Firebase Leaderboard System for Duck Surfers
// Configuration is loaded from firebase-config.js

// Wait for firebaseConfig to be loaded
function waitForConfig() {
  return new Promise((resolve) => {
    if (window.firebaseConfig) {
      resolve(window.firebaseConfig);
    } else {
      setTimeout(() => waitForConfig().then(resolve), 100);
    }
  });
}

// Initialize Firebase
let db;
let firebaseReady = false;

// Initialize Firebase when config is ready
async function initializeFirebase() {
  try {
    const config = await waitForConfig();
    
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
      console.log('Firebase app initialized with project:', config.projectId);
    }
    
    db = firebase.firestore();
    firebaseReady = true;
    console.log('Firebase Firestore initialized successfully');
    
    // Test connection
    await testConnection();
    
  } catch (error) {
    console.error('Firebase initialization error:', error);
    firebaseReady = false;
  }
}

// Test Firebase connection with GitHub Pages specific error handling
async function testConnection() {
  try {
    // Try to read from Firestore (will create the collection if it doesn't exist)
    const testRef = db.collection('leaderboard').limit(1);
    await testRef.get();
    console.log('✅ Firebase connection test successful on', window.location.hostname);
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    
    // Provide GitHub Pages specific troubleshooting
    if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
      console.log('🔧 GitHub Pages Troubleshooting:');
      console.log('1. Check Firestore Rules - make sure they allow unauthenticated read/write');
      console.log('2. Add domain to Firebase Console → Authentication → Authorized domains');
      console.log('3. Ensure your domain:', window.location.hostname);
    }
    
    if (error.code === 'failed-precondition' || error.message.includes('CORS')) {
      console.log('🌐 CORS Issue - Firebase may be blocking cross-origin requests');
      console.log('Check Firebase Console → Project Settings → Authorized domains');
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  initializeFirebase();
}

/**
 * Καταχωρεί ή ενημερώνει το σκορ ενός παίκτη
 * @param {string} playerName - Το όνομα του παίκτη
 * @param {number} score - Το σκορ του παίκτη
 * @returns {Promise<boolean>} - true αν η καταχώρηση ήταν επιτυχής
 */
async function submitScore(playerName, score) {
  if (!firebaseReady || !db) {
    console.warn('Firebase not ready - using localStorage fallback');
    return submitScoreOffline(playerName, score);
  }

  if (!playerName || !playerName.trim()) {
    console.error('Player name is required');
    return false;
  }

  if (typeof score !== 'number' || score < 0) {
    console.error('Valid score is required');
    return false;
  }

  try {
    const playerRef = db.collection('leaderboard').doc(playerName.trim());
    const playerDoc = await playerRef.get();
    
    if (playerDoc.exists) {
      // Ο παίκτης υπάρχει - ενημέρωση μόνο αν το νέο σκορ είναι καλύτερο
      const existingData = playerDoc.data();
      if (score > existingData.score) {
        await playerRef.update({
          score: score,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          gamesPlayed: firebase.firestore.FieldValue.increment(1)
        });
        console.log(`Updated high score for ${playerName}: ${score}`);
        return true;
      } else {
        // Ενημέρωση μόνο των παιχνιδιών που παίχτηκαν
        await playerRef.update({
          gamesPlayed: firebase.firestore.FieldValue.increment(1),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Score ${score} not higher than existing ${existingData.score} for ${playerName}`);
        return false;
      }
    } else {
      // Νέος παίκτης - δημιουργία νέου document
      await playerRef.set({
        playerName: playerName.trim(),
        score: score,
        gamesPlayed: 1,
        firstPlayed: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`New player ${playerName} added with score: ${score}`);
      return true;
    }
  } catch (error) {
    console.error('Error submitting score:', error);
    return false;
  }
}

/**
 * Εμφανίζει τον πίνακα κατάταξης
 * @param {number} limit - Αριθμός παικτών προς εμφάνιση (default: 10)
 */
async function showLeaderboard(limit = 10) {
  const leaderboardElement = document.getElementById('leaderboard');
  const loadingElement = document.getElementById('leaderboard-loading');
  
  if (!firebaseReady || !db) {
    console.error('Firebase not ready yet');
    if (leaderboardElement) {
      leaderboardElement.innerHTML = '<li class="error">Firebase δεν είναι συνδεδεμένο</li>';
      leaderboardElement.classList.remove('hidden');
    }
    if (loadingElement) loadingElement.classList.add('hidden');
    return;
  }

  // Εμφάνιση loading
  if (loadingElement) loadingElement.classList.remove('hidden');
  if (leaderboardElement) leaderboardElement.classList.add('hidden');

  try {
    const snapshot = await db.collection('leaderboard')
      .orderBy('score', 'desc')
      .limit(limit)
      .get();

    if (leaderboardElement) {
      leaderboardElement.innerHTML = '';
      
      if (snapshot.empty) {
        leaderboardElement.innerHTML = '<li class="no-scores">Δεν υπάρχουν σκορ ακόμη!</li>';
      } else {
        let rank = 1;
        snapshot.forEach((doc) => {
          const data = doc.data();
          const listItem = document.createElement('li');
          listItem.className = 'leaderboard-item';
          
          // Emoji για top 3
          let rankDisplay = `#${rank}`;
          if (rank === 1) rankDisplay = '🥇 #1';
          else if (rank === 2) rankDisplay = '🥈 #2'; 
          else if (rank === 3) rankDisplay = '🥉 #3';
          
          listItem.innerHTML = `
            <span class="rank">${rankDisplay}</span>
            <span class="player-name">${data.playerName}</span>
            <span class="score">${data.score.toLocaleString()}</span>
          `;
          
          leaderboardElement.appendChild(listItem);
          rank++;
        });
      }
      
      // Απόκρυψη loading και εμφάνιση leaderboard
      if (loadingElement) loadingElement.classList.add('hidden');
      leaderboardElement.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    if (leaderboardElement) {
      leaderboardElement.innerHTML = '<li class="error">Σφάλμα φόρτωσης κατάταξης</li>';
      leaderboardElement.classList.remove('hidden');
    }
    if (loadingElement) loadingElement.classList.add('hidden');
  }
}

/**
 * Test function για να βεβαιωθείτε ότι όλα λειτουργούν
 */
async function testFirebaseConnection() {
  console.log('Testing Firebase connection...');
  
  try {
    // Test με dummy data
    const testResult = await submitScore('TestPlayer', 100);
    console.log('Test score submission:', testResult);
    
    // Test leaderboard
    await showLeaderboard();
    console.log('Firebase connection test completed successfully');
    
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}

// Offline fallback system for GitHub Pages compatibility
function submitScoreOffline(playerName, score) {
  try {
    const scores = JSON.parse(localStorage.getItem('duck-surfers-scores') || '[]');
    const existingPlayer = scores.find(p => p.playerName === playerName);
    
    if (existingPlayer) {
      if (score > existingPlayer.score) {
        existingPlayer.score = score;
        existingPlayer.gamesPlayed++;
        localStorage.setItem('duck-surfers-scores', JSON.stringify(scores));
        console.log('💾 Offline: Updated high score for', playerName);
        return true;
      } else {
        existingPlayer.gamesPlayed++;
        localStorage.setItem('duck-surfers-scores', JSON.stringify(scores));
        return false;
      }
    } else {
      scores.push({
        playerName,
        score,
        gamesPlayed: 1,
        timestamp: Date.now()
      });
      localStorage.setItem('duck-surfers-scores', JSON.stringify(scores));
      console.log('💾 Offline: New player added', playerName);
      return true;
    }
  } catch (error) {
    console.error('Offline storage error:', error);
    return false;
  }
}

function showLeaderboardOffline() {
  const leaderboardElement = document.getElementById('leaderboard');
  const loadingElement = document.getElementById('leaderboard-loading');
  
  if (loadingElement) loadingElement.classList.add('hidden');
  
  try {
    const scores = JSON.parse(localStorage.getItem('duck-surfers-scores') || '[]');
    scores.sort((a, b) => b.score - a.score);
    
    if (leaderboardElement) {
      leaderboardElement.innerHTML = '';
      
      if (scores.length === 0) {
        leaderboardElement.innerHTML = '<li class="no-scores">💾 Offline mode - Δεν υπάρχουν σκορ ακόμη!</li>';
      } else {
        scores.slice(0, 10).forEach((data, index) => {
          const rank = index + 1;
          let rankDisplay = `#${rank}`;
          if (rank === 1) rankDisplay = '🥇 #1';
          else if (rank === 2) rankDisplay = '🥈 #2'; 
          else if (rank === 3) rankDisplay = '🥉 #3';
          
          const listItem = document.createElement('li');
          listItem.className = 'leaderboard-item';
          listItem.innerHTML = `
            <span class="rank">${rankDisplay}</span>
            <span class="player-name">${data.playerName}</span>
            <span class="score">${data.score.toLocaleString()}</span>
          `;
          leaderboardElement.appendChild(listItem);
        });
        
        // Add offline indicator
        const offlineIndicator = document.createElement('li');
        offlineIndicator.innerHTML = '<small style="opacity:0.6; text-align:center; font-style:italic;">💾 Offline mode - Σκορ αποθηκευμένα τοπικά</small>';
        leaderboardElement.appendChild(offlineIndicator);
      }
      
      leaderboardElement.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Offline leaderboard error:', error);
    if (leaderboardElement) {
      leaderboardElement.innerHTML = '<li class="error">Σφάλμα φόρτωσης offline σκορ</li>';
      leaderboardElement.classList.remove('hidden');
    }
  }
}

// Enhanced show leaderboard with fallback
const originalShowLeaderboard = showLeaderboard;
showLeaderboard = async function(limit = 10) {
  if (!firebaseReady || !db) {
    console.log('Using offline leaderboard');
    showLeaderboardOffline();
    return;
  }
  
  try {
    await originalShowLeaderboard(limit);
  } catch (error) {
    console.warn('Firebase leaderboard failed, using offline fallback');
    showLeaderboardOffline();
  }
};

// Export functions για χρήση στο game
window.submitScore = submitScore;
window.showLeaderboard = showLeaderboard;
window.testFirebaseConnection = testFirebaseConnection;
