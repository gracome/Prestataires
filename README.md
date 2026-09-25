# Prestataire

Site professionnel et réservation en ligne pour les prestataires qui travaillent
sur rendez-vous : coiffeuses, prothésistes ongulaires, nail artists, lash
artists, esthéticiennes, barbiers, tatoueurs, praticiens bien-être.

Une seule application sert tous les prestataires. Chacun a sa configuration
(identité, couleurs, prestations, horaires, acompte, calendrier) et son site
public à `/{slug}` ou sur son propre domaine. Aucun code n'est dupliqué par
client.

---

## Ce que fait la plateforme

**Pour la cliente** — consulter les prestations, les prix et les durées, voir
les vraies disponibilités, réserver un créneau, envoyer l'acompte au prestataire
et téléverser la preuve, recevoir la confirmation par email.

**Pour la prestataire** — présenter son activité, gérer prestations, tarifs,
horaires et absences, recevoir les demandes, vérifier les preuves de paiement,
confirmer ou refuser, synchroniser avec Google Calendar, et ne plus répondre dix
fois aux mêmes questions sur WhatsApp.

---

## Démarrage

Prérequis : Node.js 20 ou plus, et PostgreSQL 14 ou plus.

```bash
npm install
cp .env.example .env          # puis renseigner DATABASE_URL et ENCRYPTION_KEY
npx prisma migrate deploy     # crée le schéma et les contraintes
npm run db:seed               # jeu de démonstration (facultatif)
npm run dev
```

Générer la clé de chiffrement et le secret des tâches planifiées :

```bash
openssl rand -hex 32          # ENCRYPTION_KEY
openssl rand -base64 32       # CRON_SECRET
```

Après le seed :

| | |
|---|---|
| Site public de démonstration | http://localhost:3000/belle-mains |
| Espace prestataire | http://localhost:3000/login |
| Identifiant | `demo@prestataire.test` |
| Mot de passe | `Demo2025Pass` |

### Créer un vrai prestataire

```bash
npx tsx scripts/create-provider.ts \
  --business "Studio Lina" \
  --owner "Lina Traoré" \
  --email lina@example.com \
  --slug studio-lina \
  --timezone Africa/Abidjan \
  --currency XOF
```

Le mot de passe est généré et affiché une seule fois. Le prestataire démarre en
brouillon : il publie son site depuis **Paramètres** quand son contenu est prêt.

### Tâches planifiées

L'expiration des réservations, la libération des créneaux, les emails
d'expiration, les rappels et la synchronisation Google tournent dans une tâche
périodique. Toutes les 5 minutes :

```bash
curl -X POST https://votre-domaine/api/jobs/run \
     -H "authorization: Bearer $CRON_SECRET"
```

Ou, sur une machine avec cron :

```
*/5 * * * * cd /srv/prestataire && npx tsx scripts/run-expiration.ts
```

La tâche est sûre à relancer : chaque étape est idempotente.

---

## Architecture

```
src/
  app/
    [slug]/                    site public d'un prestataire
      prestations/             catalogue visuel
        [service]/             fiche détaillée, déroulé étape par étape
      realisations/            vitrine des réalisations
      reservation/             parcours de réservation
      devis/                   demande de devis
    reservation/[token]/       page de suivi de la cliente
    dashboard/                 espace prestataire
      actions/                 server actions (mutations)
    api/
      public/[slug]/           disponibilités, création de réservation
      reservation/[token]/     upload de preuve, annulation
      proofs/[id]              preuves de paiement (accès contrôlé)
      media/[...key]           images publiques
      google/                  OAuth 2.0 Google Calendar
      jobs/run                 tâches planifiées
  lib/
    booking/                   moteur de créneaux, machine à états, réservation
    auth/                      sessions, mots de passe, contrôle d'accès
    email/                     rendu et envoi des notifications
    google/                    OAuth et synchronisation calendrier
    storage/                   fichiers (local ou S3)
    notifications/             dispatch et déduplication
    jobs/                      maintenance planifiée
  components/
    booking/                   parcours cliente
    dashboard/                 écrans prestataire
    public/                    site public
prisma/                        schéma et migrations
tests/                         tests unitaires du cœur métier
```

Stack : Next.js 15 (App Router), React 19, TypeScript, PostgreSQL via Prisma.
Pas de bibliothèque de composants : les écrans sont écrits directement, avec des
variables CSS par prestataire.

---

## La vitrine

Une cliente ne connaît pas forcément le vocabulaire du métier. « Remplissage
gel » ou « semi-permanent » ne veulent rien dire pour quelqu'un qui n'a jamais
pris rendez-vous. Le site répond à ça sur trois niveaux.

**Le catalogue** montre une photo par prestation, avec une phrase en langage
courant sous le nom, la durée réelle et le tarif. On choisit à l'œil, pas au
vocabulaire.

**La fiche de chaque prestation** explique ce que c'est, pour qui, le déroulé
numéroté étape par étape avec la durée de chacune, ce qui est compris dans le
prix, comment se préparer et comment entretenir le résultat. Elle porte ses
propres données structurées `Service` et `HowToStep`, donc elle peut ressortir
seule dans une recherche.

**La page Réalisations** rassemble les photos, filtrables par catégorie, avec
une visionneuse accessible au clavier. Une photo rattachée à une prestation
renvoie vers sa fiche, ce qui transforme la galerie en argument de vente.

Tout se remplit depuis le tableau de bord : chaque prestation a son éditeur avec
un gestionnaire d'étapes, et la galerie permet de rattacher une photo à une
prestation au moment de l'envoi.

**Le devis n'est pas un formulaire vide.** La prestataire définit un prix de
départ et quelques questions dont les réponses ajoutent un montant. La cliente
répond, voit une fourchette bouger en direct, puis envoie sa demande. La
prestataire reçoit l'estimation affichée et les choix exacts, donc elle répond
en connaissance de cause.

Le calcul vit dans [estimate.ts](src/lib/quotes/estimate.ts), une fonction pure
utilisée des deux côtés. Le navigateur s'en sert pour l'affichage instantané, et
le serveur le recalcule avant d'enregistrer quoi que ce soit : un formulaire
trafiqué ne peut pas figer un prix.

---

## Les trois points délicats

### 1. Aucune double réservation, même simultanée

Deux clientes qui cliquent sur 15h00 à la même milliseconde passent toutes les
deux la vérification applicative. C'est donc la base de données qui tranche :

```sql
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    "providerId" WITH =,
    (tstzrange("startsAt", "endsAt", '[)')) WITH &&
  )
  WHERE (status IN ('TEMPORARILY_RESERVED', 'AWAITING_PAYMENT',
                    'PAYMENT_PROOF_SUBMITTED', 'CONFIRMED',
                    'COMPLETED', 'NO_SHOW'));
```

PostgreSQL refuse la seconde insertion, l'API traduit l'erreur `23P01` en
« ce créneau vient d'être réservé », et le parcours recharge les disponibilités.
La vérification applicative reste utile : elle donne une réponse propre dans le
cas courant, sans faire échouer une transaction.

L'intervalle est semi-ouvert `[)`, donc un rendez-vous qui finit à 15h00 et un
autre qui commence à 15h00 ne se chevauchent pas.

### 2. Les créneaux se libèrent tout seuls

Une réservation en attente porte une échéance. Trois situations la font expirer
(section 12 du cahier des charges) : aucune preuve envoyée, preuve non vérifiée
à temps, ou heure du rendez-vous atteinte alors que rien n'est confirmé.

L'expiration tourne à deux endroits. La tâche planifiée balaie tous les
prestataires et envoie les emails. La lecture des disponibilités appelle la même
fonction sans notification, ce qui fait réapparaître immédiatement un créneau
abandonné, sans attendre le prochain passage du cron.

### 3. AVAILABLE n'est pas un statut de ligne

Le cahier des charges liste `AVAILABLE` parmi les statuts. Dans le code, c'est
une propriété du **créneau**, pas de la réservation : un créneau est disponible
quand aucune réservation en statut bloquant ni aucune indisponibilité ne le
couvre. Libérer un créneau revient donc à faire passer sa réservation dans un
statut non bloquant, ce que font `EXPIRED`, `CANCELLED` et `PAYMENT_REJECTED`.

```
TEMPORARILY_RESERVED → AWAITING_PAYMENT → PAYMENT_PROOF_SUBMITTED → CONFIRMED
                                                    ↓
                                            PAYMENT_REJECTED  →  créneau libre
         AWAITING_PAYMENT → EXPIRED                            →  créneau libre
```

Les transitions sont déclarées une seule fois dans
`src/lib/booking/state-machine.ts` et vérifiées à chaque écriture. Chaque
changement d'état est consigné dans `appointment_events`.

---

## Paiement

En V1, la plateforme ne touche jamais l'argent. La cliente paie directement la
prestataire par Mobile Money, téléverse sa capture, la prestataire vérifie sur
son propre compte puis confirme ou refuse.

L'architecture ne dépend pas de ce choix. Une réservation porte une
`validationMethod` parmi `NO_DEPOSIT`, `MANUAL_PAYMENT` et `ONLINE_PAYMENT`.
Brancher un agrégateur revient à implémenter la troisième branche : la machine à
états, le moteur de créneaux et les notifications ne changent pas.

---

## Sécurité

| Point | Mise en œuvre |
|---|---|
| Mots de passe | bcrypt, facteur 12 |
| Sessions | jeton aléatoire de 256 bits en cookie `HttpOnly`; seule son empreinte SHA-256 est stockée, donc révocable immédiatement |
| Tentatives de connexion | limitation par adresse, compteur persistant et blocage du compte 15 minutes après 5 échecs, message d'erreur unique |
| Cloisonnement | chaque requête du tableau de bord est filtrée sur le prestataire de la session; un identifiant d'un autre compte n'existe pas |
| Preuves de paiement | stockées hors de la racine web sous un nom aléatoire, servies uniquement par une route qui vérifie le propriétaire, jamais mises en cache |
| Uploads | type déterminé par les octets du fichier, pas par l'en-tête envoyé par le navigateur |
| Jetons Google | chiffrés en AES-256-GCM avant écriture; le mot de passe Google n'est jamais demandé |
| Lien de suivi cliente | jeton non devinable, page exclue de l'indexation |
| Validation | tout ce qui entre passe par un schéma Zod côté serveur |
| Injections | requêtes paramétrées via Prisma, aucune concaténation SQL |

---

## Tests

```bash
npm test
```

95 tests couvrent le cœur métier sans base de données : moteur de créneaux
(pauses, tampons, délai minimum, horizon, chevauchements, bornes semi-ouvertes),
machine à états (transitions légales et interdites, échéances, libération du
créneau), calcul des acomptes, conversions de fuseau et de devise, chiffrement,
limitation de débit et détection du type réel des fichiers.

Ce qui demande une base de données (concurrence réelle sur la contrainte
d'exclusion, migrations) n'est pas couvert ici et doit être vérifié sur un
PostgreSQL de test.

---

## Personnalisation d'un prestataire

Tout se règle depuis le tableau de bord, sans toucher au code :

- **Informations et apparence** — nom, logo, couverture, description, contacts,
  adresse, fuseau, devise, couleurs, polices, style des boutons, sections
  affichées, textes de la page d'accueil, SEO, FAQ.
- **Prestations et tarifs** — nom, description, catégorie, prix, durée, tampon,
  acompte fixe ou en pourcentage, visibilité, ordre.
- **Horaires et absences** — horaires hebdomadaires avec pause, congés, jours
  fériés, créneaux bloqués.
- **Paiement et acompte** — moyens de paiement, numéros, bénéficiaire,
  instructions.
- **Paramètres** — pas des créneaux, délai minimum, horizon, durées de blocage
  et de vérification, politique d'annulation, Google Calendar, mot de passe.

### Domaine personnalisé

Renseigner `customDomain` sur le prestataire, puis faire pointer le domaine vers
l'application. Le middleware résout l'hôte vers le bon prestataire et réécrit
l'URL en interne : la visiteuse ne voit jamais le slug.

---

## Hors périmètre V1

Paiement en ligne intégré, application mobile, SMS, WhatsApp automatisé,
fidélité, stock, comptabilité, marketplace, gestion de plusieurs employés,
analytics avancés, abonnements, IA. L'architecture laisse la place au paiement
en ligne (voir plus haut) et aux notifications WhatsApp (le dispatcher a déjà un
canal `WHATSAPP`).
