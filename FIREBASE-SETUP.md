# Firebase Leaderboard Setup για Duck Surfers

## Βήματα εγκατάστασης:

### 1. Δημιουργία Firebase Project

1. Πηγαίνετε στο [Firebase Console](https://console.firebase.google.com/)
2. Κάντε κλικ στο "Add project" ή "Create a project"
3. Δώστε ένα όνομα στο project σας (π.χ. "duck-surfers-leaderboard")
4. Ακολουθήστε τα βήματα για να ολοκληρώσετε τη δημιουργία

### 2. Ρύθμιση Firestore Database

1. Στο Firebase Console, πηγαίνετε στο "Firestore Database"
2. Κάντε κλικ στο "Create database"
3. Επιλέξτε "Start in test mode" (για ανάπτυξη) ή δημιουργήστε custom rules
4. Επιλέξτε location (προτείνεται: europe-west)

### 3. Παραμετροποίηση Web App

1. Στο Firebase Console, κάντε κλικ στο εικονίδιο `</>` (Add app)
2. Δώστε ένα nickname (π.χ. "Duck Surfers Web")
3. Αντιγράψτε το `firebaseConfig` object

### 4. Ενημέρωση κώδικα

Ανοίξτε το αρχείο `firebase-leaderboard.js` και αντικαταστήστε το:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID", 
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

με τις πραγματικές παραμέτρους από το Firebase Console.

### 5. Firestore Security Rules (Προαιρετικό)

Για παραγωγή, ενημερώστε τους κανόνες ασφάλειας στο Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{playerId} {
      allow read: if true;
      allow write: if request.auth == null 
        && resource == null 
        || (resource != null && request.data.score > resource.data.score);
    }
  }
}
```

## Χρήση

### Τεστ του συστήματος:

Ανοίξτε το Developer Console (F12) και τρέξτε:

```javascript
// Test Firebase connection
await testFirebaseConnection();

// Test manual score submission
await submitScore("TestPlayer", 1500);

// Show leaderboard
await showLeaderboard();
```

### Αυτόματη ενεργοποίηση:

Το σύστημα ενεργοποιείται αυτόματα:
- Όταν το σκορ είναι > 100, εμφανίζεται το πεδίο εισαγωγής ονόματος
- Το κουμπί "Κατάταξη" εμφανίζει τον πίνακα κατάταξης
- Αυτόματη ταξινόμηση με βάση το υψηλότερο σκορ

### Δομή δεδομένων Firestore:

```javascript
Collection: "leaderboard"
Document ID: {playerName}
Fields:
{
  playerName: string,
  score: number,
  gamesPlayed: number,
  firstPlayed: timestamp,
  lastUpdated: timestamp
}
```

## Troubleshooting

### Κοινά προβλήματα:

1. **"Firebase not initialized"**
   - Ελέγξτε ότι το firebaseConfig είναι σωστό
   - Βεβαιωθείτε ότι τα Firebase scripts φορτώνονται

2. **"Permission denied"**
   - Ελέγξτε τους Firestore security rules
   - Βεβαιωθείτε ότι το database είναι σε test mode για development

3. **"Network error"**
   - Ελέγξτε τη σύνδεση internet
   - Βεβαιωθείτε ότι το Firebase project είναι ενεργό

### Debug console commands:

```javascript
// Ελέγχετε αν το Firebase είναι διαθέσιμο
console.log(typeof firebase);

// Ελέγχετε αν το Firestore είναι συνδεδεμένο
console.log(firebase.firestore);

// Τεστ συνδεσιμότητας
testFirebaseConnection();
```

## Features

✅ Αυτόματη δημιουργία νέων παικτών  
✅ Ενημέρωση μόνο αν το νέο σκορ είναι υψηλότερο  
✅ Πίνακας κατάταξης με emoji για top 3  
✅ Responsive design για mobile  
✅ Ενσωματωμένο στο παιχνίδι χωρίς διακοπή gameplay  
✅ Error handling και user feedback  

Καλή επιτυχία! 🚀🎮
