Duck Surfers — Runner (Canvas)

Περιγραφή
- Ένα απλό παιχνίδι τύπου Subway Surfers: μια παπιά σε ποτάμι αποφεύγει νούφαρα.
- Game Over: σε σύγκρουση με νούφαρο τελειώνει το run και εμφανίζεται οθόνη Game Over.
- Η δυσκολία αυξάνει γρήγορα (speed up + συχνότερα εμπόδια).
- Offers: κάθε δωράκι = +1% bonus. Στο Game Over εμφανίζεται κωδικός `flower{ποσοστό}` (π.χ. `flower3`) και στέλνεται postMessage στο parent.

Αρχεία
- `index.html`: Canvas + overlay UIs (start/pause/game over)
- `styles.css`: Στυλ για καμβά και modals
- `game.js`: Λογική παιχνιδιού (κινήσεις, εμπόδια, offers, κ.λπ.)

Έλεγχοι
- Desktop: ← → ή A/D για μετακινήσεις, P για παύση
- Mobile: swipe αριστερά/δεξιά

Παράμετροι ρυθμίσεων (Query params)
- `lanes` (2–5, default 3)
- `baseSpeed` (px/s, default 220)
- `maxSpeed` (px/s, default 800)
- `accel` (speed increase per second, default 60)
- `spawnMs` (ms ανά spawn, default 800)
- `minSpawnMs` (ελάχιστο ms spawn, default 280)
- `spawnFactor` (επίδραση ταχύτητας στο spawn, default 1.8)
- `offerChance` (0.02–0.8, default 0.12)
- `lilyR` (ακτίνα νούφαρου, default 28)
- `playerR` (ακτίνα παπιάς, default 24)
- `duckY` (απόσταση από κάτω, default 110)
- `codeBase` (βάση κωδικού, default `flower`)
- `brand` (π.χ. MyBrand)
- `drop` (π.χ. Spring Drop)
- `maxPercent` (μέγιστο %, default 30). Μετά το όριο δεν εμφανίζονται νέα δώρα. Οι “διασώσεις” ανοίγουν διάδρομο αφαιρώντας νούφαρα χωρίς δώρα.

Παράδειγμα:
`index.html?brand=Duck%20Wear&drop=FW25&codeBase=flower`

WordPress Ενσωμάτωση
1) Ανεβάστε τα αρχεία
- Μέσω FTP/SFTP ή File Manager plugin, ανεβάστε όλον τον φάκελο του παιχνιδιού σε:
  `wp-content/uploads/duck-surfers/`
- Θα πρέπει να έχετε: `wp-content/uploads/duck-surfers/index.html` κ.λπ.

2) Ενσωμάτωση σε σελίδα
- Σε Gutenberg προσθέστε ένα HTML block και βάλτε:

```html
<div style="max-width:560px;margin:0 auto">
  <div style="position:relative;padding-top:177.78%;/* 800/450~1.78 */">
    <iframe
      src="/wp-content/uploads/duck-surfers/index.html?brand=Duck%20Wear&drop=FW25&codeBase=flower"
      title="Duck Surfers"
      style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.25)"
      allow="clipboard-write"
    ></iframe>
  </div>
</div>
```

Σημειώσεις:
- To `allow="clipboard-write"` βοηθά στην αντιγραφή του code από το modal.
- Προσαρμόστε τα query params για brand/drop/codeBase.

3) Λήψη claim event στο WordPress
- Το παιχνίδι, όταν βγει Game Over και υπάρχει offer, στέλνει στο parent:

```js
window.addEventListener('message', function (e) {
  const msg = e.data;
  if (!msg || msg.type !== 'duck-surfers-offer-claimed') return;
  // msg = { type, code, percent, score, brand, drop }
  console.log('Offer claimed:', msg);
  // TODO: Στείλτε σε backend (AJAX), Google Sheet, Mailer, κ.λπ.
});
```

- Μπορείτε να τοποθετήσετε τον παραπάνω listener σε HTML block (ή μέσω theme/footer scripts), για να καταγράφετε claims σε WP (π.χ. με ένα custom AJAX endpoint).

4) Backend αποθήκευση (προαιρετικό)
- Δημιουργήστε ένα custom REST endpoint στο WordPress (μικρό plugin ή functions.php) που δέχεται `{ code, score }` και τον αποθηκεύει σε custom table ή ως post meta.
- Από το listener κάντε `fetch('/wp-json/your-namespace/v1/claim', { method:'POST', body: JSON.stringify(msg) })`.

Σχεδιαστικές αποφάσεις
- Game Over: άμεσο τέλος στο χτύπημα με νούφαρο.
- Scaling: Υποστήριξη HiDPI (devicePixelRatio), πιο γρήγορο difficulty ramp.
- UX: Παύση, Start overlay, Game Over με κωδικό και αντιγραφή.

Αλλαγή assets/branding
- Ο καμβάς ζωγραφίζει σχήματα (χωρίς εξωτερικά assets). Αν θέλετε sprites/logo, μπορείτε να προσθέσετε εικόνες και να τις κάνετε preload στο `game.js`.

Debug Tips
- `offerChance=0.6` για συχνότερες προσφορές.
- `baseSpeed=120&accel=60` για πιο έντονο difficulty ramp.
