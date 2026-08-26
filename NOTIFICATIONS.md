# Live match notifications

What SlipRadar can and cannot do per platform, and why.

## Summary

| Capability | Android (Chrome/Edge) | iOS (installed PWA) | iOS (Safari tab) | Desktop |
| :--- | :--- | :--- | :--- | :--- |
| Permission prompt | yes | yes, 16.4+ | **no** | yes |
| Notification on goal | yes | yes | no | yes |
| Notification while app closed | yes (needs push) | yes (needs push) | no | yes (needs push) |
| **Single card that updates in place** | **yes** | no — each update is a new alert | no | partial |
| **iOS Live Activity / Dynamic Island** | n/a | **no — not possible from a web app** | no | n/a |

## The iOS Live Activity gap

This is the one thing on the request list that cannot be built as the product
currently exists, so it is worth being precise about.

iOS Live Activities — the persistent lock-screen card and the Dynamic Island
presentation — are provided by **ActivityKit**. ActivityKit is a native
framework. There is no JavaScript API for it, no web-exposed equivalent, and
installing the PWA to the home screen does not unlock it. A website cannot
start, update, or end a Live Activity.

Delivering true Live Activities requires shipping a **native iOS app** that:

1. declares `NSSupportsLiveActivities` in its Info.plist,
2. defines an `ActivityAttributes` type for the match state,
3. starts an `Activity` when the user begins tracking a live match,
4. receives updates either from the app itself or via **ActivityKit push
   tokens** sent to APNs with the `liveactivity` push type.

That is a separate deliverable from this web app. The backend work already
done here — per-match live state and the delta stream — is the part such an app
would consume, so the server side is not wasted, but the client is a new build.

Android's equivalent (an ongoing foreground-service notification) likewise
needs a native app for the full effect, though the web version below gets
much closer there.

## What is implemented

`frontend/lib/liveActivity.ts` builds the best available web approximation.

On Android, re-showing a notification under the same `tag` **replaces** the
existing one rather than stacking a new one. Combined with `silent: true` and
`renotify: false`, that produces a single card per tracked live match which
quietly refreshes its score and clock on every poll, and only makes noise when
something actually happens:

- **routine update** — `silent: true`, `renotify: false` → the card's text
  changes, no sound, no vibration, no re-alert
- **goal or point** — `silent: false`, `renotify: true` → the same card alerts
- **match ends** — the notification is closed via `getNotifications({ tag })`

`requireInteraction: true` keeps the card resident on platforms that honour it,
which is what makes it read as an ongoing activity rather than a transient
toast.

On iOS this degrades to ordinary notifications: each update presents as its
own alert rather than editing one card in place. `getNotificationCapability()`
reports this so the UI can describe what the user will actually get instead of
promising a Live Activity.

## Prerequisites that were missing

The service worker at `frontend/public/sw.js` had a complete `push` handler but
**was never registered anywhere in the app**. Without a registration there is
no push subscription and no way to show a notification that outlives the tab,
so notifications only ever appeared while a tab was focused. Registration now
happens in `registerServiceWorker()`, called once from the live page.

To deliver notifications while the app is closed you additionally need:

1. a VAPID key pair on the server,
2. `pushManager.subscribe()` on the client with the public key,
3. subscription storage per user,
4. a server-side push send on score change.

Steps 1–4 are **not yet built**. Until they are, notifications fire only while
a tab is open. The `push` handler in the service worker is ready to receive
them once the server side exists.

## iOS specifics

- Web push requires **iOS 16.4 or later**.
- The PWA must be **installed to the home screen**; Safari tabs get nothing.
- The permission prompt must follow a user gesture.
- `getNotificationCapability().requiresInstall` detects this case so the UI can
  prompt the user to install rather than silently failing.
