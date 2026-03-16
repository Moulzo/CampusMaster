# 🎯 MATRICE D'IMPACT - Problèmes identifiés

Analysez chaque issue selon **Impact × Effort** pour prioriser les fixes.

---

## 📊 Vue d'ensemble

```
        EFFORT (Vertical: faible → haut)
        
        │
Haute   │  6,11,12,13,14  │  20,21,23,24,25  │  19
Impact  │                 │                  │
        │  4,5,7,8,9,10   │  2,3,16,17,18    │
        │                 │                  │
Basse   │  1,15,26,27,28  │  29,30,31,32,33,34,35
        │                 │                  │
        └─────────────────┼──────────────────┴─────────
                         URGENT            NORMAL
```

---

## 🔴 URGENT - HIGH IMPACT, LOW EFFORT (FIX NOW!)

### Issue #1: GradeSubmissionDto validation
- **Sévérité:** CRITIQUE
- **Impact:** Données invalides peuvent être sauvegardées
- **Effort:** < 1h
- **Risque:** Notes incohérentes, scores > maxScore
- **Status:** ❌ À FAIRE

### Issue #2: File upload MIME validation
- **Sévérité:** CRITIQUE
- **Impact:** Exécution de scripts, malware upload
- **Effort:** 2h
- **Risque:** Sécurité système compromise
- **Status:** ❌ À FAIRE

### Issue #3: Path traversal en /uploads
- **Sévérité:** CRITIQUE
- **Impact:** Lecture/suppression de fichiers système
- **Effort:** 2h
- **Risque:** Accès non-autorisé à /etc/passwd, etc
- **Status:** ❌ À FAIRE

### Issue #4: Password reset token pas de TTL
- **Sévérité:** CRITIQUE
- **Impact:** Reset tokens valides indefiniment
- **Effort:** 1h
- **Risque:** Attaque brute force reset
- **Status:** ❌ À FAIRE

### Issue #5: Console.log en production
- **Sévérité:** HAUTE
- **Impact:** Logs verbeux, fuite d'infos sensibles
- **Effort:** 1h
- **Risque:** Information disclosure
- **Status:** ❌ À FAIRE
- **Files:** announcements.service.ts, notifications.controller.ts

### Issue #6: WebSocket CORS hardcoded
- **Sévérité:** HAUTE
- **Impact:** CORS bypass si IP change
- **Effort:** 1h
- **Risque:** Accès WebSocket non-autorisé
- **Status:** ❌ À FAIRE

---

## 🟠 HIGH PRIORITY - HIGH IMPACT, MEDIUM EFFORT (WEEK 1-2)

### Issue #7: Service imports/exports incohérents
- **Sévérité:** HAUTE
- **Impact:** Risque de dépendances circulaires
- **Effort:** 3-4h
- **Risque:** Crash à runtime
- **Modules affectés:** admin.module.ts
- **Status:** ⚠️ EN ATTENTE

**Fix:**
```typescript
// admin.module.ts: supprimer providers dupliquées
// Au lieu de ça:
providers: [SemestersService, CoursesService, ...]
// Faire ça:
imports: [SemestersModule, CoursesModule, ...]
```

### Issue #8: Pas de CurrentUser decorator
- **Sévérité:** HAUTE
- **Impact:** Inconsistance, extraction d'ID manquée
- **Effort:** 2h
- **Risque:** req.user.id ?? req.user.sub va échouer
- **Status:** ❌ À FAIRE

### Issue #9: Type safety - `as any` casting
- **Sévérité:** HAUTE
- **Impact:** Bugs non-détectés à compile-time
- **Effort:** 2-3h
- **Risque:** Erreurs runtime
- **Files:** courses.service.ts, auth.service.ts
- **Status:** ❌ À FAIRE

### Issue #10: Validation incohérente DTOs
- **Sévérité:** HAUTE
- **Impact:** Validation bypass sur certains endpoints
- **Effort:** 3h
- **Risque:** Données invalides en base
- **Status:** ⚠️ EN ATTENTE
- **DTOs affectés:**
  - CreateSubmissionDto: pas d'UUID validation
  - CreateThreadDto: pas de @MinLength
  - CreateMessageDto: pas de @MaxLength
  - CreateCourseResourceDto: pas de validation fichier

### Issue #11: Pas de pagination
- **Sévérité:** HAUTE
- **Impact:** OOM sur requêtes large dataset
- **Effort:** 4h
- **Risque:** DoS fatigue
- **Endpoints:** /academics/tree, /notifications, /courses
- **Status:** ❌ À FAIRE

### Issue #12: Gestion des transactions flottante
- **Sévérité:** HAUTE
- **Impact:** Data inconsistency si crash
- **Effort:** 2-3h
- **Risque:** Orphaned records
- **Critical paths:** assignment creation, grading
- **Status:** ❌ À FAIRE

---

## 🟡 MEDIUM PRIORITY - MEDIUM IMPACT, MEDIUM EFFORT (WEEK 2-3)

### Issue #13: Duplication de logique access control
- **Sévérité:** MOYENNE
- **Impact:** Divergence de vérification
- **Effort:** 3h (extraire AccessControlService)
- **Risque:** Bypass d'accès par une vérification
- **Files:** assignments.service, submissions.service
- **Status:** ❌ À FAIRE
- **Action:** Créer AccessControlService centralisé

### Issue #14: Logging mélangé (logger vs console)
- **Sévérité:** MOYENNE
- **Impact:** Logs inconsistentes
- **Effort:** 2h
- **Risque:** Debugging difficile
- **Status:** ❌ À FAIRE
- **Action:** Utiliser Logger NestJS partout

### Issue #15: Pas de Response DTOs
- **Sévérité:** MOYENNE
- **Impact:** passwordHash exposée dans JSON
- **Effort:** 4h
- **Risque:** Information disclosure
- **Status:** ❌ À FAIRE
- **Action:** Créer select() dans findMany/findOne

### Issue #16: Magic numbers partout
- **Sévérité:** MOYENNE
- **Impact:** Maintenance difficile
- **Effort:** 1h
- **Risque:** Inconsistences
- **Status:** ❌ À FAIRE
- **Action:** Créer constants file

### Issue #17: Submission.fileUrls est String JSON
- **Sévérité:** MOYENNE
- **Impact:** Parsing manual, bug-prone
- **Effort:** 2h (migration)
- **Risque:** JSON parse errors
- **Status:** ⚠️ EN ATTENTE
- **Action:** Utiliser Json type Prisma

### Issue #18: Indexes DB manquants
- **Sévérité:** MOYENNE
- **Impact:** Slow queries
- **Effort:** 1h
- **Risque:** Performance dégradée
- **Status:** ❌ À FAIRE
- **Indexes à ajouter:**
  - Submission(studentId)
  - Submission(assignmentId)
  - Submission(correctedAt)

---

## 🟢 LOW PRIORITY - LOW IMPACT, LOW EFFORT (WEEK 3-4)

### Issue #19: Softdeletes manquants
- **Sévérité:** BASSE
- **Impact:** Perte de data historique
- **Effort:** 3-4h
- **Risque:** Audit trail gap
- **Status:** ⚠️ BACKLOG
- **Action:** Ajouter deletedAt? sur User, Submission

### Issue #20: Pas de audit trail
- **Sévérité:** BASSE
- **Impact:** Impossible de tracker qui a fait quoi
- **Effort:** 4h
- **Risque:** Compliance issue
- **Status:** ⚠️ BACKLOG

### Issue #21: Float vs Decimal pour scores
- **Sévérité:** BASSE
- **Impact:** Arrondi floating-point
- **Effort:** 2h (migration)
- **Risque:** Nota: 18.4999999
- **Status:** ⚠️ BACKLOG
- **Action:** Utiliser Decimal(5,2)

### Issue #22: Nommage inconsistent
- **Sévérité:** BASSE
- **Impact:** Confusion dev
- **Effort:** 2h
- **Risque:** Bug from misunderstanding
- **Status:** ⚠️ BACKLOG

### Issue #23: Error messages mélangées (FR/EN)
- **Sévérité:** BASSE
- **Impact:** UX inconsistent
- **Effort:** 1h
- **Risque:** Confusion utilisateur
- **Status:** ⚠️ BACKLOG

---

## 🔵 OPTIMIZATION ONLY (LOW IMPACT, MEDIUM EFFORT)

### Issue #24: Performance N+1 queries
- **Sévérité:** BASSE
- **Impact:** Lenteur sur large datasets
- **Effort:** 2-3h
- **Risque:** Timeout API
- **Status:** ⚠️ BACKLOG
- **Action:** Use `include:` au lieu de boucles

### Issue #25: Pas de caching
- **Sévérité:** BASSE
- **Impact:** Requêtes répétées
- **Effort:** 4h
- **Risque:** Ralentissement
- **Status:** ⚠️ BACKLOG
- **Targets:** /academics/tree, /semesters

### Issue #26: Test coverage % << 5%
- **Sévérité:** MOYENNE (pour prod)
- **Impact:** Bugs non-détectés
- **Effort:** 16h minimum
- **Risque:** Regressions
- **Status:** ❌ À FAIRE

---

## 📋 Effort Breakdown par phase

### **PHASE 1: CRITICAL (5 issues, ~7 heures)**
```
Issue #1: GradeSubmissionDto        1h
Issue #2: MIME validation            2h
Issue #3: Path traversal             2h
Issue #4: Password token TTL         1h
Issue #5: Remove console.log         1h
─────────────────────────────────────
TOTAL:                                7h
```

### **PHASE 2: HIGH (7 issues, ~24 heures)**
```
Issue #6: WebSocket CORS             1h
Issue #7: Service imports            4h
Issue #8: CurrentUser decorator      2h
Issue #9: Type safety                3h
Issue #10: DTO validation            3h
Issue #11: Pagination                4h
Issue #12: Transactions              3h
Issue #16: Constants file            1h
Issue #26: Tests (50%)               8h
─────────────────────────────────────
TOTAL:                                29h
```

### **PHASE 3: MEDIUM (6 issues, ~14 heures)**
```
Issue #13: AccessControlService      3h
Issue #14: Logging                   2h
Issue #15: Response DTOs             4h
Issue #17: Submission schema         2h
Issue #18: DB indexes                1h
Issue #20: Audit trail               2h
─────────────────────────────────────
TOTAL:                                14h
```

### **PHASE 4: OPTIMIZATION (6 issues, ~12 heures)**
```
Issue #19: Soft deletes               3h
Issue #21: Decimal precision         2h
Issue #22: Naming cleanup             2h
Issue #24: N+1 queries               2h
Issue #25: Redis caching             4h
─────────────────────────────────────
TOTAL:                                13h
```

**GRAND TOTAL: ~62 heures (~2.5 semaines en full-time)**

---

## 🎯 Priorisation Recommandée

```
┌─────────────────────────────────────────┐
│ SEMAINE 1: PHASE 1 CRITICAL (7h)       │
├─────────────────────────────────────────┤
│ Jour 1-2: Issues #1, #2, #3 (Fix sec)  │
│ Jour 3: Issues #4, #5, #6 (Fix tokens) │
│ Jour 4: QA + Testing                   │
│ Jour 5: Reserve + Cleanup               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ SEMAINE 2: PHASE 2A (15h)               │
├─────────────────────────────────────────┤
│ Jour 1: Issues #7, #8 (Decorators)     │
│ Jour 2-3: Issue #9, #10 (Type/Validation)
│ Jour 4: Issue #11 (Pagination)          │
│ Jour 5: QA + Testing                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ SEMAINE 3: PHASE 2B (14h)               │
├─────────────────────────────────────────┤
│ Jour 1-2: Issue #12 (Transactions)     │
│ Jour 3: Issue #16 (Constants)          │
│ Jour 4-5: Issue #26 (Tests - 50%)       │
│ Jour 5: QA + Testing                    │
└─────────────────────────────────────────┘

TOTAL: 3 SEMAINES FULL-TIME
```

---

## ✅ Definition of Done (Phase par phase)

### Phase 1 - CRITICAL
- [ ] All 5 issues fixed and tested
- [ ] No console.log remaining
- [ ] GradeSubmissionDto validates
- [ ] File upload validates MIME
- [ ] Password tokens expire
- [ ] WebSocket uses env vars
- [ ] All critical tests pass
- [ ] PR reviewed by 2+ people

### Phase 2 - HIGH
- [ ] All 7 issues fixed
- [ ] 50%+ test coverage
- [ ] Type safety improved
- [ ] Pagination implemented
- [ ] No circular dependencies
- [ ] Transactions working
- [ ] Spotless sonarqube analysis
- [ ] Pre-prod ready

---

**Pour la priorisation:** 
1. Fix **Phase 1** ASAP (production blocker)
2. Planifier **Phase 2** maintenant, faire en 2 semaines
3. Planifier **Phase 3-4** pour post-production

