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

// Test Firebase connection
async function testConnection() {
  try {
    // Try to read from Firestore (will create the collection if it doesn't exist)
    const testRef = db.collection('leaderboard').limit(1);
    await testRef.get();
    console.log('✅ Firebase connection test successful');
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
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
    console.error('Firebase not ready yet');
    return false;
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
 * Εμφανίζει τον πίνακα κατάταξης με podium για top 3
 * @param {number} limit - Αριθμός παικτών προς εμφάνιση (default: 10)
 */
async function showLeaderboard(limit = 10) {
  const leaderboardElement = document.getElementById('leaderboard');
  const podiumElement = document.getElementById('leaderboard-podium');
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
  if (podiumElement) podiumElement.classList.add('hidden');

  try {
    const snapshot = await db.collection('leaderboard')
      .orderBy('score', 'desc')
      .limit(limit)
      .get();

    if (snapshot.empty) {
      if (leaderboardElement) {
        leaderboardElement.innerHTML = '<li class="no-scores">Δεν υπάρχουν σκορ ακόμη!</li>';
        leaderboardElement.classList.remove('hidden');
      }
    } else {
      const players = [];
      snapshot.forEach((doc) => {
        players.push(doc.data());
      });
      
      // Top 3 στο podium
      if (podiumElement && players.length > 0) {
        podiumElement.innerHTML = '';
        const podiumContainer = document.createElement('div');
        podiumContainer.className = 'podium-container';
        
        // Φτιάξε τα podium places (2ος, 1ος, 3ος για καλύτερη οπτική)
        const positions = [
          { index: 1, place: 2, medal: '🥈', height: 'medium' },
          { index: 0, place: 1, medal: '🥇', height: 'tall' },
          { index: 2, place: 3, medal: '🥉', height: 'short' }
        ];
        
        positions.forEach(pos => {
          if (players[pos.index]) {
            const player = players[pos.index];
            const podiumPlace = document.createElement('div');
            podiumPlace.className = `podium-place ${pos.height}`;
            podiumPlace.innerHTML = `
              <div class="podium-medal">${pos.medal}</div>
              <div class="podium-player">${player.playerName}</div>
              <div class="podium-score">${player.score.toLocaleString()}</div>
              <div class="podium-rank">#${pos.place}</div>
            `;
            podiumContainer.appendChild(podiumPlace);
          }
        });
        
        podiumElement.appendChild(podiumContainer);
        podiumElement.classList.remove('hidden');
      }
      
      // Υπόλοιποι παίκτες (από 4ο και μετά) στη λίστα
      if (leaderboardElement && players.length > 3) {
        leaderboardElement.innerHTML = '';
        
        for (let i = 3; i < players.length; i++) {
          const data = players[i];
          const listItem = document.createElement('li');
          listItem.className = 'leaderboard-item';
          
          listItem.innerHTML = `
            <span class="rank">#${i + 1}</span>
            <span class="player-name">${data.playerName}</span>
            <span class="score">${data.score.toLocaleString()}</span>
          `;
          
          leaderboardElement.appendChild(listItem);
        }
        
        leaderboardElement.classList.remove('hidden');
      } else if (leaderboardElement && players.length <= 3) {
        // Αν έχουμε μόνο 1-3 παίκτες, κρύψε τη λίστα
        leaderboardElement.innerHTML = '';
        leaderboardElement.classList.add('hidden');
      }
    }
    
    // Απόκρυψη loading
    if (loadingElement) loadingElement.classList.add('hidden');
    
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

// Export functions για χρήση στο game
window.submitScore = submitScore;
window.showLeaderboard = showLeaderboard;
window.testFirebaseConnection = testFirebaseConnection;
