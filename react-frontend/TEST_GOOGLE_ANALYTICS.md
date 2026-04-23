# 🎯 TEST GOOGLE ANALYTICS - CODE GOOGLE OFFICIEL

## ✅ MAINTENANT UTILISÉ : Code Google Officiel

J'ai supprimé mes scripts complexes et utilisé **exactement** ton code Google :

```javascript
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-CYH5VGVLTS"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-CYH5VGVLTS');
</script>
```

**📍 Placé dans :** `/react-frontend/index.html` + chargement conditionnel selon consentement

---

## 🧪 COMMENT TESTER

### 1. Ouvrir la console navigateur (F12)

### 2. Accepter les cookies
- Cliquer "J'accepte" sur la bannière cookies
- **Console doit afficher :**
```
✅ Consentement détecté - Chargement Google Analytics
📊 Google Analytics initialisé avec G-CYH5VGVLTS
```

### 3. Vérifier que gtag fonctionne
**Dans la console navigateur, taper :**
```javascript
// Vérifier que gtag existe
console.log(typeof window.gtag); // doit afficher "function"

// Vérifier dataLayer
console.log(window.dataLayer.length); // doit être > 0

// Test manuel
window.gtag('event', 'test_manuel', {
  event_category: 'debug',
  event_label: 'test_console'
});

// Vérifier que l'événement a été ajouté
console.log(window.dataLayer);
```

### 4. Naviguer entre pages
- Aller sur `/dashboard`, `/features`, etc.
- **Console doit afficher :**
```
📊 Tracking page vue: /dashboard
📊 Tracking page vue: /features
```

---

## 🌐 VÉRIFICATION GOOGLE ANALYTICS TEMPS RÉEL

### 1. Aller sur https://analytics.google.com
### 2. Sélectionner la propriété G-CYH5VGVLTS
### 3. Aller dans "Rapports" > "Temps réel"

**Tu dois voir :**
- **1 utilisateur actif** (toi)
- **Pages vues** qui s'incrémentent quand tu navigues
- **Événements** comme `consent_accepted`, `test_manuel`

---

## 🚨 SI ÇA NE MARCHE PAS

### Vérifications rapides :
```javascript
// Dans console navigateur
console.log('gtag exists:', typeof window.gtag);
console.log('dataLayer size:', window.dataLayer?.length);
console.log('Consent stored:', localStorage.getItem('cookie_consent'));

// Test réseau vers Google
fetch('https://www.google-analytics.com/ping').then(() => {
  console.log('✅ Réseau Google OK');
}).catch(() => {
  console.log('❌ Réseau Google bloqué');
});
```

### Causes possibles :
1. **Bloqueur pub** (uBlock Origin, AdBlock) - Les désactiver
2. **Mode strict** - Essayer en mode incognito
3. **Extensions privacy** - Les désactiver temporairement
4. **Cookies bloqués** - Autoriser les cookies tiers

---

## 🎉 RÉSULTAT ATTENDU

✅ **Dans la console :**
```
✅ Consentement détecté - Chargement Google Analytics
📊 Google Analytics initialisé avec G-CYH5VGVLTS
📊 Tracking page vue: /
📊 Tracking page vue: /dashboard
```

✅ **Dans Google Analytics temps réel :**
- 1 utilisateur actif
- Pages vues qui s'incrémentent
- Événements de navigation

**🎯 C'est maintenant ton code Google officiel qui gère tout !**