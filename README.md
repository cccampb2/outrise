# Outrise

Outrise is a fitness app built around personal progress and friendly faction competition. Members create workouts, track performance, earn achievements, and contribute to their faction while connecting with friends.

Developed by Outrise Studio. The project is currently being prepared for beta testing.

## Features

### Training and progress

- Exercise library and custom workout management.
- Active workout tracking for reps, weight, time, and distance, depending on the exercise.
- Workout completion summaries with earned XP, personal records, and achievements.
- Safe completion retries that return the saved result when a workout was already completed.
- Levels, Echelons, and Zenith standings.
- Unlockable and secret achievements, with profile previews and a full achievement collection.
- Video submissions for staff-reviewed performance verification.

### Factions and competition

- Assessment-based faction recommendations, with a choice before confirming membership.
- Faction colors loaded from the database.
- Individual, friend, and faction rankings.
- Seasonal faction competition and past season winners.
- Workout of the Week (WOTW), including templates, scheduled occurrences, and completion tracking.

### Community

- Public profiles with achievements, approved performances, and recent activity.
- Friend requests and friend management.
- Direct messaging between friends, with Socket.IO updates and unread conversation indicators.
- Activity feeds with dismissal controls.
- In-app notifications with read and dismissal controls.
- Owner-published system announcements.
- User blocking and a blocked-users list.

### Accounts and administration

- Sign-up, sign-in, email verification, and password reset.
- An 18+ eligibility gate based on user declaration, rather than independently verified age.
- Existing-account age rejections persist until owner review. Before registration, a device stores a 24-hour retry delay; age and birth date are not saved.
- Profile editing and profile pictures.
- User, moderator, admin, and owner roles, with role indicators.
- Active, flagged, suspended, and banned account states.
- Owner controls for promoting and demoting administrators.
- Support reports from the login screen and inside the app, with an admin inbox and email replies.
- A suggestion box with an owner-only inbox.
- Admin tools for exercises, achievements, WOTW, and verification review.
- Account deletion with retryable database and media cleanup.

## Project structure

```text
outrise-api/
  src/
    config/          Database, media, and application configuration
    controllers/     HTTP request and response handling
    jobs/            Scheduled background work
    middleware/      Authentication, permissions, validation, and rate limits
    models/          Mongoose schemas
    routes/          API endpoints
    seeds/           Exercise, achievement, and faction seed scripts
    services/        Application logic
    utils/           Shared backend helpers
  tests/             Backend tests

outrise-mobile/
  src/
    api/             API requests and response types
    app/             Expo Router screens and layouts
    components/      Shared interface components
    constants/       Theme and shared constants
```

## Technology

| Area                           | Tools                                       |
| ------------------------------ | ------------------------------------------- |
| Mobile app                     | Expo, React Native, TypeScript, Expo Router |
| Client state                   | Redux Toolkit and TanStack Query            |
| Backend                        | Node.js, Express, JavaScript ES modules     |
| Database                       | MongoDB Atlas and Mongoose                  |
| Real-time messaging            | Socket.IO                                   |
| Images and verification videos | Cloudinary                                  |
| Transactional email            | Resend                                      |
| Scheduled work                 | node-cron                                   |
| Backend tests                  | Node.js test runner                         |
| Formatting                     | Prettier                                    |

## Local setup

Use a Node.js version compatible with the installed Expo and backend dependencies, along with npm. You will also need a MongoDB database that supports transactions, such as MongoDB Atlas, and credentials for Cloudinary and Resend to use uploads and email flows.

Install dependencies from each directory:

```bash
# Project root: formatting tools
npm install

# Backend
cd outrise-api
npm install

# Mobile app, from the project root
cd outrise-mobile
npm install
```

### Backend environment

Create `outrise-api/.env` with your own values:

```dotenv
PORT=3000
MONGO_URI=mongodb+srv://YOUR_DATABASE_CONNECTION
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET

RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM="Outrise Support <support@outrisefitness.com>"
RESEND_SUPPORT_TEMPLATE=support-update
RESEND_PASSWORD_RESET_TEMPLATE=password-reset
RESEND_EMAIL_VERIFICATION_TEMPLATE=email-verification
```

The email sender must be configured in Resend. Publish the corresponding Resend templates before testing email delivery. Environment files and real credentials should remain outside source control.

Start the backend from `outrise-api`:

```bash
npm run dev
```

For a regular start without the development watcher:

```bash
npm start
```

### Mobile app

The backend address currently lives in `outrise-mobile/src/api/client.ts` as `API_URL`. Set it to an address reachable from your simulator or phone. A physical phone needs your computer's reachable network address rather than `localhost`.

Start the app from `outrise-mobile`:

```bash
npm start
```

The package also provides `npm run ios`, `npm run android`, and `npm run web`. Test device-specific behavior on the intended mobile platforms.

## Background jobs

Jobs start with the backend. They run inside the API process, so scheduled work pauses when that process stops. Startup reconciliation or cleanup catches up for the jobs described below.

Daily and hourly schedules explicitly use `America/New_York`. The every-minute jobs run once each minute.

| Job                              | Schedule                     | Purpose                                                                                                    |
| -------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Seasons                          | Startup and hourly           | Reconcile season boundaries and season results.                                                            |
| WOTW                             | Startup and hourly           | Reconcile weekly workout occurrences.                                                                      |
| Suspensions                      | Startup and every minute     | Restore accounts whose temporary suspension has ended.                                                     |
| Account deletion                 | Startup and every minute     | Process queued deletion requests and retry incomplete cleanup.                                             |
| Reviewed verification videos     | Startup and daily at 3:00 AM | Remove reviewed videos after 30 days; expire unreviewed submissions after 30 days and remove their videos. |
| Activity retention               | Startup and daily at 3:30 AM | Remove activity events older than 90 days and their associated notification and dismissal state.           |
| Support and moderation retention | Startup and daily at 3:45 AM | Clean up eligible support reports, closed suggestions, and resolved moderation history.                    |

### Retention behavior

- Resolved support reports are eligible for deletion after 12 calendar months. Reports with pending email replies are preserved.
- Closed suggestions are eligible for deletion after 12 calendar months. Reopening a suggestion clears its cleanup timer; saving it as closed starts a fresh timer.
- Moderation history stays while an account is flagged, suspended, or banned. For active accounts, cleanup assigns unresolved records a resolution date when first observed, then removes resolved history after 12 calendar months.
- Older closed or resolved records without a saved date receive a fresh retention timer rather than being deleted immediately.
- Pending verifications expire 30 days after submission without a review decision. The daily verification job removes their videos and retries failed deletions. Submission records remain; users can submit again. The submission screen shows the rule and pending details show the deadline. No advance reminder notification is sent.
- Failed media cleanup keeps the saved reference so a later run can try again.
- Account deletion removes associated personal data and uploads while keeping shared conversations usable for the remaining participant. Cleanup removes the deleted member's identity and message content.
- Historical season winners remain recorded. Current standings use the remaining contribution records.

These rules describe application cleanup. Hosting logs and database backup retention require separate provider configuration.

## Tests and formatting

Run backend tests from `outrise-api`:

```bash
node --test tests/*.test.js
```

The backend's `npm test` script is currently a placeholder; use the command above. Tests use mocked dependencies to cover application behavior without requiring live email or media requests. Review individual tests before running them against any configured environment.

Run mobile checks from `outrise-mobile`:

```bash
npx tsc --noEmit
npm run lint
```

Run formatting checks from the project root:

```bash
npm run format:check
```

To format eligible project files:

```bash
npm run format
```

## Seed data

The backend includes seed scripts for exercises, achievements, and factions. Exercise and achievement seeds support validation without connecting to the database:

```bash
# From outrise-api
node src/seeds/seedExercises.js --dry-run
node src/seeds/seedAchievements.js --dry-run
```

Without `--dry-run`, these scripts use `MONGO_URI` to insert missing entries while preserving existing entries. Check the target database before running them. They are not a replacement for a migration when existing records need renaming or correction.

Faction seeding is available through `npm run seed:factions`; inspect the script before running it against an existing database.

## Beta and deployment notes

- Notifications currently work inside the app. Phone push notifications are deferred to v2.
- Progress graphs and additional telemetry are planned for a later version.
- Render is the planned backend host; deployment configuration is still pending.
- Replace the local API address with the deployed HTTPS address before distributing the app outside local testing.
- The current background-job setup is intended for a single API instance. Review job coordination and Socket.IO configuration before running multiple instances.
- Configure Render log retention and Atlas backup retention during deployment.
- Complete the Privacy Policy, Terms, and receiving support inbox before public release.

## Outrise Studio

Outrise is developed by Outrise Studio. Contact support@outrisefitness.com for questions and support.

## Legal documents and acceptance

Current beta Terms and Privacy Policy are served publicly by `GET /auth/legal` from `outrise-api/src/config/legal.js`. Reviewable copies are in [Terms of Use](docs/TERMS_OF_USE.md) and [Privacy Policy](docs/PRIVACY_POLICY.md). Review these documents before public release and finalize provider logs/backups and production hosting details.

Registration requires an explicit unchecked-by-default acknowledgment. The backend validates document versions and stores `legalAcceptance.acceptedAt`, `termsVersion`, and `privacyVersion` on the User. Existing accounts accept through `/accept-terms`; API and Socket.IO access require current acceptance. Recovery, legal document access, support, and account deletion remain available.

When changing wording, update the corresponding document version and review copy. A version change requires renewed acceptance. The latest acceptance remains on the user record; this is not a separate immutable acceptance-history system. Safety notices appear on exercise details, active workouts, and WOTW. These notices do not guarantee legal immunity.
