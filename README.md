# Addis Football --- Technical README

## 1. Project Summary

**Addis Football** is a mobile-first pickup-football application for
Addis Ababa, Ethiopia. Players can authenticate, discover games, reserve
spots, join waitlists, manage bookings, and use Chapa/Telebirr for paid
games. Authorized organizers/admins can create, edit, manage, and cancel
games.

**Stack:** React Native, Expo SDK 57, Expo Router, TypeScript, Supabase
Auth/PostgreSQL/RLS/RPC, Chapa/Telebirr, SMSEthiopia, EAS Build, App
Store Connect, Google Play.

> Security: this document intentionally contains no service-role keys,
> Chapa secrets, SMS API keys, reviewer passwords, personal phone
> numbers, signing credentials, or other private credentials.

------------------------------------------------------------------------

## 2. Architecture

``` text
iOS / Android
     |
React Native + Expo Router
     |
Supabase client
     |
+----+-------------------------+
| Auth | PostgreSQL | RLS/RPC |
+------------------------------+
     |                 |
 SMS backend       Edge/backend logic
                       |
                    Chapa
                       |
                    Telebirr
                       |
                    Webhook
                       |
                 Supabase state
```

The mobile client handles presentation and user interaction. Supabase is
the trusted source for authentication, games, profiles, bookings, and
payment state. Sensitive payment/refund operations stay server-side.

------------------------------------------------------------------------

## 3. Core Project Structure

``` text
addis-football/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── verify.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── bookings.tsx
│   │   │   └── profile.tsx
│   │   └── admin/
│   │       ├── create-game.tsx
│   │       ├── edit-game.tsx
│   │       └── manage-games.tsx
│   ├── components/
│   │   ├── GameCard.tsx
│   │   └── ConfirmModal.tsx
│   ├── constants/colors.ts
│   └── lib/supabase.ts
├── assets/images/icon.png
├── docs/
├── app.json
├── eas.json
├── package.json
├── .env
└── README.md
```

This documents the core files developed for the application;
Expo-generated/supporting files may also exist.

------------------------------------------------------------------------

# 4. File-by-File Code Guide

## `src/app/_layout.tsx`

Root Expo Router layout. Wraps the app in the language provider,
configures the status bar, dark background, hidden native headers, and
registers: `index`, `(auth)`, `(tabs)`, `admin/create-game`,
`admin/edit-game`, and `admin/manage-games`.

## `src/app/index.tsx`

Entry/routing screen. Keeps initial session/navigation decisions
separate from feature screens.

## `src/app/(auth)/login.tsx`

Primary login screen.

Normal flow:

``` text
+251 phone -> request OTP -> Verify screen -> authenticated session
```

Also contains the dedicated **App Review Login** path so Apple reviewers
do not need access to an Ethiopian SMS number. Reviewer credentials must
remain outside source/public documentation.

Form behavior uses `SafeAreaView` from `react-native-safe-area-context`,
`KeyboardAvoidingView`, and a `ScrollView` with:

``` tsx
keyboardShouldPersistTaps="handled"
keyboardDismissMode="none"
```

## `src/app/(auth)/verify.tsx`

OTP verification screen. Accepts the numeric code, removes non-numeric
input, verifies the challenge, and continues into the authenticated app.
It is a small single-input screen and does not need a large scrolling
form.

## `src/app/(tabs)/_layout.tsx`

Bottom navigation for: - Discover - Bookings - Profile

Uses safe-area insets so the app tab bar stays above the iPhone home
indicator and Android/Samsung system navigation area.

## `src/app/(tabs)/index.tsx`

Main **Discover** screen. Loads and displays games and drives player
actions such as joining, paid reservation, waitlisting, and refresh. It
presents game title, organizer, area, time, format, skill, price,
availability, image, and status.

## `src/app/(tabs)/bookings.tsx`

Displays the current player's bookings and their states. Important
states include: `pending_payment`, `confirmed`, `waitlisted`,
`cancelled_by_player`, and `cancelled_by_organizer`.

## `src/app/(tabs)/profile.tsx`

Player profile screen. Displays/updates full name and skill level, shows
the authenticated phone, changes language, saves the profile, signs out,
and exposes authorized admin tools where appropriate.

Supported languages: - English - Amharic - Afaan Oromoo

## `src/app/admin/create-game.tsx`

Authorized game creation form.

Fields include title, organizer, area, distance/display location, date,
start time, end time, format, skill, price, spots, and image URL.

The form validates inputs and calls Supabase RPC `create_game`.

### Addis Ababa time

Admin-entered schedule values are interpreted in Addis Ababa time using
the `+03:00` offset before conversion to an ISO timestamp. This prevents
an organizer physically located in another timezone from shifting the
Ethiopian kickoff time.

Known `create_game` parameters:

``` text
p_title
p_organizer
p_area
p_distance
p_time
p_format
p_skill
p_price
p_spots_left
p_starts_at
p_ends_at
p_image_url
```

## `src/app/admin/edit-game.tsx`

Loads an existing game, populates the form, validates changes, preserves
Addis Ababa timezone handling, calls `update_game`, and supports
authorized cancellation/refund workflows.

## `src/app/admin/manage-games.tsx`

Organizer/admin dashboard used to retrieve and manage games and navigate
to Create/Edit Game.

## `src/components/GameCard.tsx`

Reusable game presentation component. Shows image, status, title,
organizer, area/distance, skill, spots, schedule, format, price, and the
relevant action.

## `src/components/ConfirmModal.tsx`

Reusable confirmation UI for consequential actions such as cancellation.

## `src/constants/colors.ts`

Central design tokens:

``` ts
export const COLORS = {
  background: "#07111F",
  surface: "#101D2E",
  surfaceAlt: "#16263A",
  primary: "#18C8FF",
  primaryPressed: "#08A9DC",
  text: "#F7FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  border: "#24364B",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  white: "#FFFFFF",
  black: "#000000",
} as const;
```

## `src/lib/supabase.ts`

Creates the shared Supabase client from:

``` text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in the mobile app.

## Language provider / translations

Maintains global English/Amharic/Afaan Oromoo state and persists the
selected language locally.

## `app.json`

Expo app configuration: app identity, version, portrait orientation,
icon, scheme, iOS/Android settings, router/splash plugins, and typed
routes.

## `eas.json`

EAS profiles:

``` text
development
preview
production
```

Production uses automatic version/build incrementing.

## `.env`

Client configuration only:

``` bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Never commit privileged keys.

------------------------------------------------------------------------

# 5. Database

## `games`

  Field          Purpose
  -------------- ------------------------------------
  `id`           Game identifier
  `title`        Game title
  `organizer`    Organizer display name
  `area`         Location
  `distance`     Display distance/location metadata
  `time`         Human-readable time
  `format`       e.g. 6v6
  `skill`        Skill level
  `price`        Price
  `spots_left`   Remaining capacity
  `status`       Game state
  `image_url`    Image
  `created_by`   Creator
  `starts_at`    Canonical start timestamp
  `ends_at`      Canonical end timestamp

## `profiles`

Fields: `id`, `full_name`, `phone`, `skill_level`, `avatar_url`, `role`.

Roles: `player`, `organizer`, `admin`. Role escalation is protected
server-side.

## `bookings`

Fields: `id`, `user_id`, `game_id`, `status`, `price_paid`,
`payment_status`, `payment_offer_expires_at`.

## `payments`

Audit records for payment state, provider transaction references, and
refund references/status.

## `notification_jobs`

Server-managed notification jobs. Normal clients do not get direct write
access.

## `otp_codes`

Server-controlled OTP-related data. It is not a normal
client-readable/writable table.

------------------------------------------------------------------------

# 6. Supabase RPC Functions

### Authenticated/user-facing

  Function              Purpose
  --------------------- -----------------------------------
  `create_game`         Create an authorized game
  `update_game`         Update an authorized game
  `join_game`           Join/free-booking flow
  `reserve_paid_game`   Temporarily reserve paid capacity
  `cancel_booking`      Cancel player's booking
  `cancel_game`         Authorized game cancellation

### Server/internal workflow

  Function                       Purpose
  ------------------------------ -------------------------------------
  `expire_paid_reservation`      Release expired unpaid reservation
  `expire_paid_waitlist_offer`   Expire unpaid waitlist offer
  `finalize_chapa_refund`        Finalize/record refund result
  `finalize_paid_booking`        Finalize verified payment booking
  `offer_paid_waitlist_spot`     Offer capacity to waitlisted player
  `release_paid_reservation`     Release payment reservation

### Supporting functions

`handle_new_user`, `protect_profile_role`, `set_updated_at`.

------------------------------------------------------------------------

# 7. Booking Logic

### Free game

``` text
Select game -> join_game -> capacity?
                         ├─ yes -> confirmed
                         └─ no  -> waitlisted
```

### Paid game

``` text
Select paid game
      ↓
reserve_paid_game
      ↓
temporary reservation
      ↓
Chapa / Telebirr
      ↓
trusted provider verification
      ↓
finalize_paid_booking
      ↓
confirmed
```

Temporary reservations prevent abandoned checkouts from holding capacity
forever.

### Paid waitlist

``` text
Game full
  ↓
waitlist
  ↓
spot becomes available
  ↓
offer_paid_waitlist_spot
  ↓
temporary payment offer
  ├─ paid -> confirmed
  └─ expires -> release/next eligible player
```

------------------------------------------------------------------------

# 8. Cancellation / Refund Logic

``` text
cancel_booking OR cancel_game
        ↓
booking/game state transition
        ↓
refund required?
        ↓
server contacts payment provider
        ↓
finalize_chapa_refund
        ↓
audit state recorded
```

Provider transaction references, not client claims, are used for refund
processing.

------------------------------------------------------------------------

# 9. Authentication

### Player

``` text
+251 phone -> OTP request -> SMS delivery -> OTP verification -> Supabase session
```

### Apple reviewer

A separate email/password review path exists. Credentials are configured
privately and are intentionally absent from this README.

------------------------------------------------------------------------

# 10. Security

RLS is enabled on core tables including: `bookings`, `games`,
`notification_jobs`, `otp_codes`, `payments`, `profiles`.

Rules: - Keep anonymous access minimal. - Require authentication for
player-facing mutations. - Restrict sensitive RPCs to
server/service-role execution. - Protect profile roles. - Verify payment
server-side. - Perform refunds server-side. - Never ship service-role,
Chapa, SMS, webhook, or reviewer secrets in the app. - Never commit
secrets to Git.

------------------------------------------------------------------------

# 11. Chapa / Telebirr

Architecture:

``` text
App -> backend payment initialization -> Chapa -> Telebirr
                                             ↓
                                          webhook
                                             ↓
                                    backend verification
                                             ↓
                                     booking finalized
```

A mobile success screen is **not** sufficient proof of payment. Backend
verification determines the final state.

Sandbox integration has been used during development. Real-money
production requires legitimate merchant/compliance approval and
production credentials.

------------------------------------------------------------------------

# 12. Swagger / OpenAPI 3.0

Supabase RPC is not a conventional custom REST-controller layer. This
Swagger section documents the **known logical API contract** without
exposing private URLs/secrets. Exact payloads for every internal Edge
Function/RPC should ultimately be generated from the deployed
SQL/function source.

Save this section as `docs/openapi.yaml` if a standalone Swagger file is
needed.

``` yaml
openapi: 3.0.3
info:
  title: Addis Football API
  version: 1.0.0
  description: Logical API contract for Addis Football.
servers:
  - url: https://YOUR_SUPABASE_PROJECT.supabase.co
tags:
  - name: Auth
  - name: Games
  - name: Bookings
  - name: Payments

paths:
  /auth/v1/otp:
    post:
      tags: [Auth]
      summary: Request authentication OTP
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [phone]
              properties:
                phone:
                  type: string
                  example: "+251911000000"
      responses:
        "200": { description: OTP request accepted }
        "400": { description: Invalid request }

  /rest/v1/rpc/create_game:
    post:
      tags: [Games]
      summary: Create a game
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateGameRequest"
      responses:
        "200": { description: Game created }
        "400": { description: Invalid game data }
        "401": { description: Authentication required }
        "403": { description: Not authorized }

  /rest/v1/rpc/update_game:
    post:
      tags: [Games]
      summary: Update a game
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Game updated }
        "401": { description: Authentication required }
        "403": { description: Not authorized }

  /rest/v1/rpc/join_game:
    post:
      tags: [Bookings]
      summary: Join a game
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Booking operation completed }
        "401": { description: Authentication required }
        "409": { description: Booking/capacity conflict }

  /rest/v1/rpc/reserve_paid_game:
    post:
      tags: [Bookings, Payments]
      summary: Reserve temporary paid-game capacity
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Reservation created }
        "401": { description: Authentication required }
        "409": { description: Capacity/reservation conflict }

  /rest/v1/rpc/cancel_booking:
    post:
      tags: [Bookings]
      summary: Cancel player's booking
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Booking cancelled }
        "401": { description: Authentication required }
        "403": { description: Not allowed }

  /rest/v1/rpc/cancel_game:
    post:
      tags: [Games]
      summary: Cancel a game
      description: Authorized operation; may initiate refund processing.
      security: [{ bearerAuth: [] }]
      responses:
        "200": { description: Game cancelled }
        "401": { description: Authentication required }
        "403": { description: Not authorized }

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateGameRequest:
      type: object
      required:
        - p_title
        - p_organizer
        - p_area
        - p_distance
        - p_time
        - p_format
        - p_skill
        - p_price
        - p_spots_left
        - p_starts_at
        - p_ends_at
      properties:
        p_title: { type: string }
        p_organizer: { type: string }
        p_area: { type: string }
        p_distance: { type: string }
        p_time: { type: string, example: "7:00 PM to 9:00 PM" }
        p_format: { type: string, example: "6v6" }
        p_skill: { type: string, example: "Intermediate" }
        p_price: { type: number, format: double, example: 300 }
        p_spots_left: { type: integer, minimum: 1, example: 12 }
        p_starts_at: { type: string, format: date-time }
        p_ends_at: { type: string, format: date-time }
        p_image_url: { type: string, nullable: true }

    Game:
      type: object
      properties:
        id: { type: string, format: uuid }
        title: { type: string }
        organizer: { type: string }
        area: { type: string }
        distance: { type: string }
        time: { type: string }
        format: { type: string }
        skill: { type: string }
        price: { type: number }
        spots_left: { type: integer }
        status: { type: string }
        image_url: { type: string, nullable: true }
        starts_at: { type: string, format: date-time }
        ends_at: { type: string, format: date-time }

    Booking:
      type: object
      properties:
        id: { type: string, format: uuid }
        user_id: { type: string, format: uuid }
        game_id: { type: string, format: uuid }
        status:
          type: string
          enum: [pending_payment, confirmed, waitlisted,
                 cancelled_by_player, cancelled_by_organizer]
        price_paid: { type: number }
        payment_status: { type: string }
        payment_offer_expires_at:
          type: string
          format: date-time
          nullable: true
```

**Swagger accuracy note:** `create_game` parameters above are based on
the known client call. Do not invent missing RPC parameter names. For a
byte-for-byte production OpenAPI specification, inspect/export the
current deployed Supabase SQL and Edge Function source.

------------------------------------------------------------------------

# 13. Safe-Area and Keyboard Standard

Use:

``` ts
import { SafeAreaView } from "react-native-safe-area-context";
```

For multi-field scrolling forms:

``` tsx
<ScrollView
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="none"
>
```

For larger forms:

``` tsx
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>
```

This keeps fields usable on both iOS and Android and avoids accidental
keyboard dismissal while moving between fields.

------------------------------------------------------------------------

# 14. Development

``` bash
git clone <repository-url>
cd addis-football
npm install
```

Create `.env`:

``` bash
EXPO_PUBLIC_SUPABASE_URL=YOUR_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Start:

``` bash
npx expo start
```

Clear cache:

``` bash
npx expo start -c
```

------------------------------------------------------------------------

# 15. Production Builds

iOS:

``` bash
eas build --platform ios --profile production
```

Android:

``` bash
eas build --platform android --profile production
```

A Git push does **not** update an already-submitted App Store binary. A
new binary requires a new EAS build and App Store submission/update.

------------------------------------------------------------------------

# 16. Testing Checklist

-   [ ] Ethiopian phone OTP works.
-   [ ] Reviewer login works.
-   [ ] Sign out works.
-   [ ] Discover loads games.
-   [ ] Free booking works.
-   [ ] Paid reservation works.
-   [ ] Full-game waitlist works.
-   [ ] Duplicate booking is prevented.
-   [ ] Cancellation works.
-   [ ] Chapa/Telebirr checkout initializes.
-   [ ] Trusted payment verification confirms booking.
-   [ ] Abandoned paid reservation expires.
-   [ ] Refund state is recorded.
-   [ ] Duplicate webhook handling is safe/idempotent.
-   [ ] Authorized user can create/edit/cancel games.
-   [ ] Unauthorized user cannot perform admin operations.
-   [ ] Addis Ababa times remain correct from other timezones.
-   [ ] iPhone safe areas work.
-   [ ] Android status/navigation bars do not overlap UI.
-   [ ] Keyboard behavior is correct.
-   [ ] English, Amharic, and Afaan Oromoo render correctly.

------------------------------------------------------------------------

# 17. Developer Handoff Reading Order

``` text
src/app/_layout.tsx
 -> src/app/(auth)/login.tsx
 -> src/app/(auth)/verify.tsx
 -> src/app/(tabs)/_layout.tsx
 -> src/app/(tabs)/index.tsx
 -> src/components/GameCard.tsx
 -> src/app/(tabs)/bookings.tsx
 -> src/app/(tabs)/profile.tsx
 -> src/app/admin/manage-games.tsx
 -> src/app/admin/create-game.tsx
 -> src/app/admin/edit-game.tsx
 -> src/lib/supabase.ts
 -> Supabase SQL/RPC/Edge Function source
```

------------------------------------------------------------------------

# 18. One-Paragraph Summary

**Addis Football** is an Expo/React Native pickup-football marketplace
for Addis Ababa. Players authenticate primarily through Ethiopian phone
OTP, discover local games, reserve spots, join waitlists, manage
bookings, and pay for paid games through Chapa/Telebirr.
Organizers/admins create and manage games. Supabase provides
authentication, PostgreSQL storage, Row Level Security, RPC-based
business logic, and backend workflows. The app supports English,
Amharic, and Afaan Oromoo and treats administrative game schedules as
Addis Ababa time.

------------------------------------------------------------------------

## Documentation Scope

This README documents the known Addis Football architecture, core source
files, database entities, RPC inventory, payment/authentication flows,
security rules, build process, and a Swagger/OpenAPI contract.

For documentation containing **every exact current function signature,
every SQL parameter, every Edge Function request/response, and every
source file**, generate the next revision directly from a fresh
checkout/export of the latest repository and deployed Supabase functions
so the documentation cannot drift from production.

**Addis Football --- Version 1.0**
