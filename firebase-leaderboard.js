// Firebase Leaderboard System for Duck Surfers
// Προσθέστε το δικό σας firebaseConfig εδώ

const firebaseConfig = {
  // Αντικαταστήστε με τα δικά σας στοιχεία από το Firebase Console
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID", 
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db;
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  console.log('Firebase Firestore initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

/**
 * Καταχωρεί ή ενημερώνει το σκορ ενός παίκτη
 * @param {string} playerName - Το όνομα του παίκτη
 * @param {number} score - Το σκορ του παίκτη
 * @returns {Promise<boolean>} - true αν η καταχώρηση ήταν επιτυχής
 */
async function submitScore(playerName, score) {
  if (!db) {
    console.error('Firebase not initialized');
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
 * Εμφανίζει τον πίνακα κατάταξης
 * @param {number} limit - Αριθμός παικτών προς εμφάνιση (default: 10)
 */
async function showLeaderboard(limit = 10) {
  const leaderboardElement = document.getElementById('leaderboard');
  const loadingElement = document.getElementById('leaderboard-loading');
  
  if (!db) {
    console.error('Firebase not initialized');
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

// Export functions για χρήση στο game
window.submitScore = submitScore;
window.showLeaderboard = showLeaderboard;
window.testFirebaseConnection = testFirebaseConnection;
