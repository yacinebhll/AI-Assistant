# Assistant IA Médical - PRD (Product Requirements Document)

## Version: 2.0.0
## Date de création: 4 Janvier 2026
## Dernière mise à jour: 4 Janvier 2026

---

## 1. Énoncé du problème original

Application "Assistant IA Médical" complète pour aider le personnel soignant et la direction à:
- Gérer des documents administratifs et médicaux
- Obtenir des suggestions IA basées sur ces documents
- Analyser des statistiques via un dashboard
- Authentification JWT avec rôles utilisateurs

---

## 2. Personas utilisateurs

| Persona | Rôle | Besoins principaux |
|---------|------|-------------------|
| **Admin** | Administrateur système | Gestion des utilisateurs, catégories, configuration globale, accès complet |
| **Direction** | Direction hospitalière | Accès aux documents stratégiques, statistiques, suggestions IA |
| **Personnel Soignant** | Personnel médical | Accès aux protocoles médicaux, formations, Q&A IA |

---

## 3. Exigences principales (Core Requirements)

### 3.1 Authentification & Autorisation
- [x] JWT (email/mot de passe)
- [x] Premier utilisateur inscrit devient Admin automatiquement
- [x] Rôles: Admin, Direction, Personnel Soignant
- [x] Contrôle d'accès basé sur les rôles

### 3.2 Navigation & Interface
- [x] Sidebar avec navigation complète
- [x] Mode clair/sombre avec toggle
- [x] Interface entièrement en français
- [x] Design médical professionnel (tons bleus/verts)
- [x] Responsive design

### 3.3 Dashboard
- [x] Statistiques: Documents, Utilisateurs, Catégories
- [x] Graphiques barres (documents par catégorie)
- [x] Graphique horizontal (utilisateurs par rôle - Admin)
- [x] Documents récents
- [x] Bouton "Données démo" (Admin)

### 3.4 Assistant IA (GPT-5.2 via Emergent LLM Key)
- [x] Suggestions Contextuelles (basées sur documents récents)
- [x] Suggestions Avancées (analyse approfondie avec points clés)
- [x] Q&A IA (questions-réponses basées sur les documents)
- [x] Historique des Q&A
- [x] Filtrage par rôle utilisateur

### 3.5 Documents
- [x] CRUD complet (Créer, Lire, Modifier, Supprimer)
- [x] Filtrage par catégorie
- [x] Visibilité par rôle
- [x] Recherche par titre

### 3.6 Catégories
- [x] CRUD (Admin uniquement)
- [x] Association documents-catégories

### 3.7 Gestion Utilisateurs (Admin)
- [x] Liste des utilisateurs
- [x] Modification des rôles
- [x] Suppression d'utilisateurs

---

## 4. Ce qui a été implémenté

### Backend v2.0 (FastAPI + MongoDB)
- `server.py` avec tous les endpoints enrichis
- Authentification JWT complète
- CRUD Documents, Catégories, Utilisateurs
- **Upload fichiers multi-formats** (PDF, Word, Excel, PNG, JPG)
- **Extraction texte automatique** pour recherche full-text
- **Système de favoris** (POST/DELETE /api/favorites)
- **Notifications** pour nouveaux documents (GET/PUT /api/notifications)
- **Export PDF** de documents sélectionnés (POST /api/documents/export-pdf)
- **Recherche full-text** dans les documents
- Endpoints IA: suggestions-context, suggestions-enhanced, qa
- Dashboard stats enrichi avec favoris et notifications
- Seed data pour données de démonstration

### Frontend v2.0 (React + Tailwind + Shadcn)
- Pages: Login, Register, Dashboard, AIAssistant, Documents, **Favorites**, **Notifications**, Categories, Users, Settings
- Composants: Layout, Sidebar avec **badge notifications**
- Contextes: AuthContext, ThemeContext, **NotificationContext**
- **Upload de fichiers** avec drag & drop
- **Sélection multiple** pour export PDF
- **Boutons favoris** sur chaque document
- Intégration API complète
- Mode clair/sombre fonctionnel

### Intégration IA
- GPT-5.2 via Emergent LLM Key (emergentintegrations)
- Suggestions contextuelles et avancées
- Q&A basé sur les documents avec historique
- **Contexte enrichi** avec contenu des fichiers uploadés

---

## 5. Backlog priorisé

### P0 - Critique (Fait)
- [x] Authentification JWT
- [x] Dashboard avec statistiques
- [x] Assistant IA (3 onglets)
- [x] CRUD Documents et Catégories
- [x] Gestion utilisateurs

### P1 - Important (Fait en v2.0)
- [x] Export des documents (PDF)
- [x] Notifications pour nouveaux documents
- [x] Recherche full-text dans les documents
- [x] Système de favoris

### P2 - Souhaitable (À faire)
- [ ] Pagination des listes
- [ ] Audit trail des actions
- [ ] Tableau de bord personnalisable
- [ ] Tags personnalisés
- [ ] Partage de documents

### P3 - Nice to have
- [ ] Mode offline
- [ ] Application mobile
- [ ] Intégration calendrier

---

## 6. Prochaines étapes

1. **Tests utilisateurs** - Valider l'UX avec le personnel médical
2. **Export PDF** - Permettre l'export des documents
3. **Recherche full-text** - Améliorer la recherche dans le contenu
4. **Notifications** - Alertes pour nouveaux documents
5. **Déploiement** - Configuration production

---

## 7. Architecture technique

```
/app
├── backend/
│   ├── server.py          # FastAPI avec tous les endpoints
│   ├── .env               # Variables d'environnement (MONGO_URL, JWT_SECRET, EMERGENT_LLM_KEY)
│   └── requirements.txt   # Dépendances Python
├── frontend/
│   ├── src/
│   │   ├── App.js         # Routes principales
│   │   ├── contexts/      # AuthContext, ThemeContext
│   │   ├── components/    # Layout, Sidebar, UI (Shadcn)
│   │   ├── pages/         # Login, Dashboard, AIAssistant, Documents, etc.
│   │   └── lib/           # API client, utils
│   └── .env               # REACT_APP_BACKEND_URL
└── memory/
    └── PRD.md             # Ce document
```

---

## 8. Identifiants de test

- **Admin**: admin@hopital.fr / admin123456
- Les données de démonstration peuvent être créées via le bouton "Données démo" sur le dashboard (Admin uniquement)
