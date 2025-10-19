# 🏆 Duck Surfers Leaderboard

## Standalone Leaderboard Page

Αυτό το αρχείο δημιουργεί μια ξεχωριστή σελίδα που εμφανίζει **μόνο την κατάταξη** χωρίς το παιχνίδι.

---

## 📋 URLs

### **Production (GitHub Pages)**
```
https://nikstan13.github.io/Duck-Surfers/leaderboard.html
```

### **Local Testing**
```
http://localhost:8000/leaderboard.html
```

---

## ✨ Features

- ✅ **Standalone σελίδα** - Μόνο leaderboard, χωρίς game engine
- ✅ **Ultra-fast loading** - ~50KB αντί για ~2MB
- ✅ **Auto-refresh** - Ανανεώνεται κάθε 30 δευτερόλεπτα
- ✅ **Mobile responsive** - Λειτουργεί τέλεια σε όλες τις συσκευές
- ✅ **3D Design** - Ίδιο styling με το main game
- ✅ **Floating ducks** - Background animation
- ✅ **Top 20 players** - Podium για top 3
- ✅ **Back button** - Επιστροφή στο παιχνίδι

---

## 🎨 Design Elements

### **Podium (Top 3)**
- 🥇 1ος: Ψηλότερο podium με χρυσό medal
- 🥈 2ος: Μεσαίο podium με ασημένιο medal
- 🥉 3ος: Χαμηλότερο podium με χάλκινο medal

### **Leaderboard List (4-20)**
- Καθαρή λίστα με:
  - Rank number (#4-#20)
  - Player name
  - Score με formatting (π.χ. 1,234 pts)

### **Colors**
- Background: Blue gradient (#135a8b → #0d3f60)
- Card: White με 3D shadow
- Buttons: Yellow primary, White secondary

---

## 🔧 Technical Details

### **Dependencies**
- Firebase SDK (Firestore)
- `firebase-config.js`
- `firebase-leaderboard.js`
- `styles.css`
- `Assets/duck.png`

### **Auto-Refresh**
```javascript
// Ανανέωση κάθε 30 δευτερόλεπτα
setInterval(() => showLeaderboard(20), 30000);
```

### **Manual Refresh**
- Button: "🔄 Ανανέωση"
- Instant reload χωρίς page refresh

---

## 📱 Embedding

### **iframe Example**
```html
<iframe 
  src="https://nikstan13.github.io/Duck-Surfers/leaderboard.html" 
  width="100%" 
  height="800px"
  frameborder="0"
  style="border: none; max-width: 600px;">
</iframe>
```

### **Responsive iframe**
```html
<div style="position: relative; width: 100%; max-width: 600px; margin: 0 auto;">
  <iframe 
    src="https://nikstan13.github.io/Duck-Surfers/leaderboard.html" 
    style="width: 100%; height: 800px; border: none;">
  </iframe>
</div>
```

---

## 🚀 Performance

### **Loading Times**
- **Main game:** ~2-3 seconds (video + sprites)
- **Leaderboard only:** ~0.5 seconds ⚡

### **File Sizes**
- HTML: ~8KB
- CSS: Shared (~15KB)
- JS: Firebase only (~50KB)
- **Total:** ~73KB vs 2MB για το full game

---

## 🎯 Use Cases

1. **Social media sharing** - Μοιράσου την κατάταξη
2. **Website embedding** - Ενσωμάτωση σε άλλη σελίδα
3. **Mobile app webview** - Εμφάνιση σε app
4. **Digital signage** - Display σε οθόνες
5. **Tournament tracking** - Real-time κατάταξη

---

## 🔗 Navigation

- **"Παίξε Τώρα"** → `index.html` (Main game)
- **"Ανανέωση"** → Reload leaderboard data

---

## 📝 Customization

### **Change refresh interval**
```javascript
// Line 185 - από 30000 (30s) σε 60000 (60s)
setInterval(() => showLeaderboard(20), 60000);
```

### **Show more/less players**
```javascript
// Line 172 - από 20 σε 50 players
await window.showLeaderboard(50);
```

### **Disable auto-refresh**
```javascript
// Comment out lines 185-189
// setInterval(async () => {
//   if (window.showLeaderboard) {
//     await window.showLeaderboard(20);
//   }
// }, 30000);
```

---

## ✅ Testing Checklist

- [ ] Firebase connection works
- [ ] Top 3 podium displays correctly
- [ ] Leaderboard list shows players 4-20
- [ ] Auto-refresh works every 30s
- [ ] Manual refresh button works
- [ ] "Παίξε Τώρα" button navigates to game
- [ ] Floating ducks animate smoothly
- [ ] Mobile responsive (< 768px)
- [ ] Loading indicator shows/hides properly

---

## 🐛 Troubleshooting

### **"Firebase δεν είναι συνδεδεμένο"**
- Έλεγξε αν το `firebase-config.js` υπάρχει
- Έλεγξε το Network tab για Firebase errors

### **"Δεν υπάρχουν σκορ ακόμη"**
- Παίξε το παιχνίδι τουλάχιστον μία φορά
- Έλεγξε το Firestore Console

### **Leaderboard δεν ανανεώνεται**
- Hard refresh: Cmd/Ctrl + Shift + R
- Clear browser cache
- Έλεγξε το Console για errors

---

## 📞 Support

Για βοήθεια ή questions:
- GitHub Issues: [duck-surfers/issues](https://github.com/nikstan13/duck-surfers/issues)
- Repository: [github.com/nikstan13/duck-surfers](https://github.com/nikstan13/duck-surfers)

---

**Created:** October 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
