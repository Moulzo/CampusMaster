# 🐛 FIX : Blocage sur "Chargement..." après connexion

## 🔍 Diagnostic du problème

### Symptômes observés
- ✅ Le login fonctionne (200 OK sur /auth/me dans Network)
- ✅ Les tokens sont stockés dans localStorage
- ❌ L'interface reste bloquée sur "Chargement..."
- ✅ Un refresh manuel (F5) résout le problème

### Cause racine

Le problème vient de la combinaison de deux facteurs :

1. **`router.replace()` ne force pas toujours le re-render**
   ```typescript
   // Dans login/page.tsx
   setTokens(data.accessToken, data.refreshToken);
   router.replace(getDefaultRouteForRole(role)); // ⚠️ Navigation "soft"
   router.refresh(); // ⚠️ Refresh ne garantit pas le re-montage du layout
   ```

2. **Le useEffect du layout ne se re-déclenche pas**
   ```typescript
   // Dans layout.tsx
   useEffect(() => {
     if (hasInitialized.current && pathnameRef.current === pathname) return;
     // ⚠️ Cette condition empêche le rechargement si pathname n'a pas vraiment changé
     // Problème: après login, on va sur /teacher mais le layout était peut-être déjà monté
   }, [pathname]);
   ```

### Pourquoi ça marche après F5 ?
Le refresh manuel (F5) force un vrai rechargement de la page, ce qui :
- Re-monte complètement le layout
- Re-déclenche le useEffect sans conditions
- Charge l'utilisateur correctement

---

## 💡 Solutions proposées

### **Solution 1 : Navigation "hard" après login** ⭐ RECOMMANDÉE

**Principe :** Forcer un vrai rechargement de page après login au lieu d'une navigation Next.js

**Fichier à modifier :** `app/(public)/login/page.tsx`

```typescript
// ❌ AVANT (navigation soft)
setTokens(data.accessToken, data.refreshToken);
router.replace(destination);
router.refresh();

// ✅ APRÈS (navigation hard)
setTokens(data.accessToken, data.refreshToken);
window.location.href = destination; // Force rechargement complet
```

**Avantages :**
- ✅ Garantit le re-montage du layout
- ✅ Pas de conditions à gérer
- ✅ Comportement prévisible
- ✅ Simule le comportement d'un vrai refresh

**Inconvénients :**
- ⚠️ Perd l'état React (mais normal après login)
- ⚠️ Légèrement plus lent (rechargement complet)

---

### **Solution 2 : Simplifier le useEffect du layout**

**Principe :** Supprimer les conditions qui empêchent le rechargement

**Fichier à modifier :** `app/(protected)/layout.tsx`

```typescript
// ❌ AVANT (trop de conditions)
const hasInitialized = useRef(false);
const pathnameRef = useRef(pathname);

useEffect(() => {
  if (hasInitialized.current && pathnameRef.current === pathname) return;
  pathnameRef.current = pathname;
  hasInitialized.current = true;
  // ...
}, [pathname]);

// ✅ APRÈS (plus simple)
const loadUser = async () => {
  // toute la logique de chargement
};

useEffect(() => {
  loadUser(); // ✅ Charge au montage
}, []); // ✅ Seulement au montage

useEffect(() => {
  const onAuth = (e: Event) => {
    if (type === "tokens:set") {
      loadUser(); // ✅ Recharge quand nouveaux tokens
    }
  };
  // ...
}, [pathname]);
```

**Avantages :**
- ✅ Logique plus claire
- ✅ Charge seulement au montage + événements
- ✅ Garde la navigation Next.js

**Inconvénients :**
- ⚠️ Nécessite que `setTokens()` émette bien l'événement
- ⚠️ Dépend de la bonne propagation des événements

---

## 🎯 Recommandation finale

### **Utiliser les DEUX solutions combinées :**

1. **Solution 1 pour le login** → Garantit que ça marche toujours
2. **Solution 2 pour le layout** → Améliore la logique générale

Pourquoi ?
- Le `window.location.href` après login garantit le rechargement
- Le layout simplifié améliore la maintenance et évite d'autres bugs

---

## 📦 Fichiers à remplacer

### 1. `app/(public)/login/page.tsx`
Utilise : `login-page-fixed.tsx`

**Changements :**
```diff
- router.replace(destination);
- router.refresh();
+ window.location.href = destination;
```

### 2. `app/(protected)/layout.tsx`
Utilise : `layout-fixed.tsx`

**Changements :**
```diff
- const hasInitialized = useRef(false);
- const pathnameRef = useRef(pathname);
- 
- useEffect(() => {
-   if (hasInitialized.current && pathnameRef.current === pathname) return;
-   pathnameRef.current = pathname;
-   hasInitialized.current = true;
-   // logique complexe
- }, [pathname]);

+ const loadUser = async () => {
+   // logique extraite
+ };
+ 
+ useEffect(() => {
+   loadUser();
+ }, []);
+ 
+ useEffect(() => {
+   const onAuth = (e: Event) => {
+     if (type === "tokens:set") loadUser();
+   };
+   // ...
+ }, [pathname]);
```

---

## 🧪 Tests à effectuer après l'application du fix

### Test 1 : Login basique
```
1. Aller sur /login
2. Se connecter avec n'importe quel compte
3. ✅ Devrait charger immédiatement (pas de "Chargement..." infini)
```

### Test 2 : Login avec ?next=
```
1. Aller sur /teacher (sans être connecté)
2. Redirection vers /login?next=/teacher
3. Se connecter
4. ✅ Devrait aller sur /teacher et charger immédiatement
```

### Test 3 : Switch de compte
```
1. Se connecter en tant que TEACHER
2. Se déconnecter
3. Se reconnecter en tant que STUDENT
4. ✅ Devrait charger immédiatement
```

### Test 4 : Tabs multiples
```
1. Ouvrir 2 onglets
2. Se connecter dans l'onglet 1
3. Rafraîchir l'onglet 2
4. ✅ L'onglet 2 devrait détecter la session
```

---

## 🔍 Debug : Comment vérifier que ça marche

### Dans les DevTools (Console)

Ajoute des logs temporaires pour debug :

```typescript
// Dans layout.tsx
useEffect(() => {
  console.log('[LAYOUT] Montage, chargement utilisateur...');
  loadUser();
}, []);

useEffect(() => {
  const onAuth = (e: Event) => {
    console.log('[LAYOUT] Event AUTH reçu:', ce?.detail);
    if (type === "tokens:set") {
      console.log('[LAYOUT] Rechargement utilisateur...');
      loadUser();
    }
  };
  // ...
}, [pathname]);
```

### Dans auth.ts

```typescript
export function setTokens(accessToken: string, refreshToken?: string) {
  console.log('[AUTH] setTokens appelé');
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  emitAuthEvent({ type: "tokens:set" });
  console.log('[AUTH] Event tokens:set émis');
}
```

### Séquence attendue après login

```
1. [LOGIN] Connexion réussie
2. [AUTH] setTokens appelé
3. [AUTH] Event tokens:set émis
4. [NAVIGATION] Redirection vers /teacher
5. [LAYOUT] Montage, chargement utilisateur...
6. [LAYOUT] Utilisateur chargé: { id: ..., role: "TEACHER" }
7. ✅ Affichage de l'interface
```

---

## ⚠️ Si le problème persiste

### Vérifier que setTokens() est bien appelé
```javascript
// Dans la console DevTools après login
localStorage.getItem('accessToken')
localStorage.getItem('refreshToken')
// ✅ Devraient retourner des tokens
```

### Vérifier que l'événement est bien émis
```javascript
// Ajouter un listener global pour debug
window.addEventListener('campusmaster:auth', (e) => {
  console.log('EVENT AUTH:', e.detail);
});
```

### Vérifier le Network
```
1. Ouvrir DevTools > Network
2. Se connecter
3. Chercher la requête "me"
4. ✅ Devrait retourner 200 avec { user: {...} }
```

---

## 📝 Checklist de déploiement

- [ ] Remplacer `login/page.tsx` par `login-page-fixed.tsx`
- [ ] Remplacer `layout.tsx` par `layout-fixed.tsx`
- [ ] Tester le login avec les 3 rôles
- [ ] Tester le logout puis re-login
- [ ] Tester le ?next= après redirection
- [ ] Retirer les console.log de debug
- [ ] Vérifier qu'il n'y a pas de warnings React

---

## 💡 Note sur les performances

**Pourquoi `window.location.href` n'est PAS un problème :**

1. **C'est après login** → L'utilisateur s'attend à un chargement
2. **Ça arrive 1 fois** → Pas sur chaque navigation
3. **Garantit la cohérence** → Évite les bugs de state
4. **Next.js optimise** → Le cache statique est réutilisé

**Autres endroits où on utilise la navigation soft Next.js :**
- Navigation entre pages une fois connecté ✅
- Navigation dans le même layout ✅
- Back/Forward du navigateur ✅

---

**🎉 Avec ces fixes, ton auth sera 100% fiable !**
