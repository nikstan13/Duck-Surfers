# Firebase Setup για GitHub Pages

## ⚠️ Σημαντικές Διαφορές για GitHub Pages

GitHub Pages έχει ειδικές απαιτήσεις για Firebase που διαφέρουν από τοπική ανάπτυξη:

### 🌐 **Domain Authorization**

1. **Firebase Console → Authentication → Settings → Authorized domains**
2. **Προσθήκη domains:**
   ```
   nikstan13.github.io
   localhost (για local development)
   ```

### 🔒 **Firestore Rules για GitHub Pages**

Χρησιμοποίησε αυτούς τους κανόνες στο **Firestore Database → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{document=**} {
      // Allow read access to anyone (required for GitHub Pages)
      allow read: if true;
      
      // Allow write access for score submission
      allow write: if true;
    }
  }
}
```

**⚠️ Προσοχή:** Αυτοί οι κανόνες είναι για development. Για production χρησιμοποίησε το `firestore.rules` αρχείο.

### 🚀 **Deployment Steps**

#### **1. Firebase Project Setup:**
```bash
# 1. Create Firebase project: "duck-surfers-game"
# 2. Enable Firestore (Start in test mode)
# 3. Add Web App
```

#### **2. Domain Configuration:**
```bash
# Firebase Console → Authentication → Settings
# Add authorized domain: nikstan13.github.io
```

#### **3. Update Config:**
```javascript
// In firebase-config.js, replace with your real config:
const firebaseConfig = {
  apiKey: "your-real-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  // ... rest of config
};
```

#### **4. Test on GitHub Pages:**
```javascript
// Open browser console on: https://nikstan13.github.io/Duck-Surfers/
// Run: testFirebase()
```

### 🔧 **Troubleshooting GitHub Pages Issues**

#### **Problem: "Permission Denied"**
```bash
Solution:
1. Check Firestore Rules (see above)
2. Verify authorized domains includes nikstan13.github.io
3. Ensure HTTPS is working (GitHub Pages auto-enables this)
```

#### **Problem: "CORS Error"**
```bash
Solution:
1. Add domain to Firebase Console → Project Settings → Authorized domains
2. Wait 5-10 minutes for changes to propagate
3. Clear browser cache and try again
```

#### **Problem: "Firebase not initialized"**
```bash
Solution:
1. Check firebase-config.js has real config (not placeholders)
2. Verify all Firebase scripts are loading (check Network tab)
3. Check console for JavaScript errors
```

### ✅ **Verification Steps**

1. **Local Test:** `http://localhost` should work
2. **GitHub Pages Test:** `https://nikstan13.github.io/Duck-Surfers/` should work
3. **Console Test:** `testFirebase()` should return `true`
4. **Game Test:** Play game, score > 100, check leaderboard

### 📱 **Mobile Considerations**

GitHub Pages + Firebase works on mobile browsers, but:
- Ensure HTTPS certificate is valid
- Test on actual devices (iOS Safari, Android Chrome)
- Check for popup blockers affecting Firebase auth

### 🎯 **Production Checklist**

Before going live:
- [ ] Real Firebase config (not placeholders)
- [ ] Authorized domains configured
- [ ] Firestore rules updated
- [ ] HTTPS working on GitHub Pages
- [ ] Tested on multiple browsers/devices
- [ ] Console shows no errors

### 🆘 **Emergency Fallback**

If Firebase doesn't work on GitHub Pages:
```javascript
// Add this to firebase-leaderboard.js for offline mode
const OFFLINE_MODE = !firebase || !window.firebaseConfig;
if (OFFLINE_MODE) {
  console.log('Running in offline mode - scores not saved');
  // Implement localStorage backup
}
```

## 🚀 **Ready to Deploy!**

Μετά από αυτές τις ρυθμίσεις, το Firebase θα λειτουργεί perfectly στο GitHub Pages!
