# Déploiement d'une démo sur Vercel

Cette procédure met l'application en ligne sur une URL `*.vercel.app`, avec une
base PostgreSQL managée et un stockage objet. Compter une heure la première
fois. Tout tient dans les offres gratuites.

| Besoin | Service retenu | Pourquoi |
| --- | --- | --- |
| Hébergement | Vercel | Next.js 15 natif, déploiement sur `git push` |
| Base de données | Neon | Autorise `CREATE EXTENSION btree_gist`, obligatoire ici |
| Fichiers | Neon Object Storage | Compatible S3, sur le compte Neon déjà ouvert |
| E-mails | Resend | Envoi sans domaine vérifié en démo |
| Tâches planifiées | cron-job.org | Vercel Hobby ne descend pas sous un cron par jour |

---

## 1. La base de données

Créer un projet sur [neon.tech](https://neon.tech). Neon expose deux chaînes de
connexion, et les deux servent :

- la chaîne **pooled** (son hôte contient `-pooler`) devient `DATABASE_URL`.
  C'est celle qu'utilise l'application : le pooler encaisse les connexions
  nombreuses et brèves des fonctions serverless ;
- la chaîne **directe**, sans `-pooler`, devient `DIRECT_URL`. Prisma Migrate
  pose un verrou consultatif qu'un pooler en mode transaction ne sait pas
  tenir, donc les migrations doivent passer à côté (voir `prisma/schema.prisma`).

L'application pose une contrainte d'exclusion GiST pour rendre la double
réservation impossible au niveau de la base, ce qui exige l'extension
`btree_gist` (`prisma/migrations/20250101000100_no_double_booking/`). Neon
l'autorise ; beaucoup d'hébergeurs mutualisés non. C'est le critère qui écarte
la plupart des alternatives.

Depuis le poste de développement, en pointant sur cette base :

```bash
npm run db:deploy   # applique les migrations et crée les contraintes
npm run db:seed     # jeu de données de démonstration
```

## 2. Le stockage des fichiers

Le système de fichiers de Vercel est éphémère : un logo envoyé par un
prestataire disparaîtrait au premier recyclage de l'instance. Le pilote `local`
n'est donc pas utilisable en ligne, il faut passer en `s3`.

Dans le tableau de bord Neon, section **Object storage** : créer un bucket, puis
générer une paire de clés. Neon affiche un endpoint propre à la branche, de la
forme `https://<branche>.storage.<région>.aws.neon.tech`, ainsi que la région.

Garder le stockage chez Neon évite un fournisseur et une carte bancaire de plus :
Cloudflare R2 demande un moyen de paiement même en offre gratuite. R2 et
Supabase Storage restent des solutions de repli si besoin — seul le contenu du
`.env` changerait, pas une ligne de code.

Le pilote S3 signe ses requêtes lui-même (`src/lib/storage/s3-signature.ts`)
plutôt que d'embarquer un SDK. Avant de déployer, vérifier la configuration
pour de vrai :

```bash
npm run storage:check
```

Le script envoie un fichier, le relit, compare les octets et le supprime. S'il
passe, les envois fonctionneront en ligne.

## 3. Les secrets

```bash
openssl rand -hex 32      # ENCRYPTION_KEY
openssl rand -base64 32   # CRON_SECRET
```

`ENCRYPTION_KEY` chiffre les jetons Google Calendar au repos. Laisser la valeur
d'exemple reviendrait à les stocker en clair.

## 4. Les e-mails

Créer une clé sur [resend.com](https://resend.com). En plan gratuit, l'envoi
depuis `onboarding@resend.dev` fonctionne sans vérifier de domaine, ce qui
suffit pour une démo.

Sans cette étape, `MAIL_DRIVER` reste sur `console` : les messages sont écrits
dans les journaux du serveur et personne ne reçoit rien. Or les confirmations
de réservation et les rappels reposent entièrement dessus.

## 5. Le déploiement

Le dépôt n'est pas encore sous Git :

```bash
git init && git add -A && git commit -m "Initial commit"
git remote add origin <url-du-dépôt>
git push -u origin main
```

Vérifier que `.gitignore` couvre bien `.env`, `node_modules`, `.next` et
`storage/`.

Sur [vercel.com](https://vercel.com), importer le dépôt. Le framework est
détecté automatiquement ; il n'y a rien à changer aux réglages de build, la
commande est déjà définie dans `vercel.json`.

Renseigner les variables d'environnement, pour les trois environnements
(Production, Preview, Development) :

```
DATABASE_URL          postgresql://...-pooler...  (Neon, pooled)
DIRECT_URL            postgresql://...            (Neon, directe)
APP_URL               https://<projet>.vercel.app
ENCRYPTION_KEY        <openssl rand -hex 32>
CRON_SECRET           <openssl rand -base64 32>

STORAGE_DRIVER        s3
S3_BUCKET             <nom du bucket>
S3_REGION             eu-central-1
S3_ENDPOINT           https://<branche>.storage.c-5.eu-central-1.aws.neon.tech
S3_ACCESS_KEY_ID      nak_live_...
S3_SECRET_ACCESS_KEY  nsk_live_...

MAIL_DRIVER           resend
MAIL_FROM             Prestataire <onboarding@resend.dev>
RESEND_API_KEY        <clé Resend>
```

`APP_URL` doit correspondre exactement à l'URL du projet. Le middleware compare
l'hôte de chaque requête à cette valeur pour décider s'il s'agit du domaine de
la plateforme ou du domaine personnalisé d'un prestataire ; une URL erronée
ferait traiter le site lui-même comme un domaine client.

Déployer.

## 6. Les tâches planifiées

`POST /api/jobs/run` libère les créneaux dont le délai de paiement a expiré,
clôt les rendez-vous passés et envoie les rappels. Sans appel régulier, un
créneau réservé mais non payé reste bloqué indéfiniment.

Vercel Hobby plafonne les tâches planifiées à une par jour, ce qui est trop
espacé. Créer plutôt une tâche sur [cron-job.org](https://cron-job.org) :

- URL : `https://<projet>.vercel.app/api/jobs/run`
- Méthode : POST, toutes les 5 minutes
- En-tête : `Authorization: Bearer <CRON_SECRET>`

Un appel réussi renvoie un rapport JSON des actions effectuées. Une réponse 503
signale un `CRON_SECRET` absent côté Vercel, une 401 un secret qui ne
correspond pas.

## 7. Vérification

- `https://<projet>.vercel.app/belle-mains` affiche le site de démonstration
- une réservation complète jusqu'au dépôt de justificatif, puis rechargement de
  la page : le fichier est toujours là (c'est ce qui valide le stockage objet)
- l'e-mail de confirmation arrive
- l'appel manuel de `/api/jobs/run` renvoie un rapport

## Google Calendar

Optionnel, et laissé de côté pour une démo. La synchronisation exige des
identifiants OAuth dans Google Cloud Console, avec
`https://<projet>.vercel.app/api/google/callback` déclaré en URI de redirection,
puis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `GOOGLE_REDIRECT_URI` côté
Vercel. Sans ces variables, le reste de l'application fonctionne normalement.

## Au-delà de la démo

Deux limites de cette configuration en production réelle :

**Les domaines personnalisés.** Chaque prestataire peut pointer son propre
domaine vers l'application (`src/middleware.ts`). Sur Vercel, enregistrer ces
domaines demande un appel à l'API Domains à chaque inscription, sur un plan
payant. Un VPS avec Caddy en TLS à la demande obtient le certificat tout seul,
sans code.

**Le plan Hobby** interdit l'usage commercial. Une mise en production suppose
de toute façon un passage en Pro, ou un VPS.
