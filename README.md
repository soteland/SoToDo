# SoToDo

**[todo.soteland.no](https://todo.soteland.no)**

A personal shopping and todo app built for everyday household use. The goal is a fast, frictionless experience on mobile — open the app, check off items, close the app.

## Features

- **Smart lists** — create typed lists (handleliste, apotek, gaveønsker, etc.) with color-coded tiles on the home screen
- **Accidental tap protection** — checking off an item waits 10 seconds before recording it as purchased; unchecking within the window cancels the write entirely
- **Fridge/pantry tracker** — track what you have at home with quantities, units, and expiry dates; items are grouped by urgency
- **Recipes** — save recipes with ingredient lists; add all ingredients to a shopping list in one tap
- **Dark mode** — full dark/light/system toggle; list colors adapt to the current mode
- **PWA** — installable on iPhone and Android, works like a native app with status bar color matching the active list

## Why it exists

The best shopping app is one that doesn't get in the way. Most apps are cluttered, slow, or require accounts and subscriptions for basic features. SoToDo is a private, invite-only app for a single household — no ads, no tracking, no bloat.

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth + RLS)
- Deployed on GitHub Pages with a custom domain

## Invite only

New accounts require an invite code. The app is not open for public registration.
