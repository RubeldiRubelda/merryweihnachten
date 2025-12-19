# Vercel Deployment Anleitung

## Problem: Daten werden nach einer Weile gelöscht

Vercel ist **serverless**, was bedeutet, dass der Server bei jedem Request neu gestartet werden kann. Alle Daten im Arbeitsspeicher gehen dabei verloren.

## Lösung: Vercel KV Storage

Wir verwenden jetzt **Vercel KV** (Redis-basierter Storage) für persistente Datenspeicherung.

## Setup-Schritte für Vercel KV:

### 1. Vercel KV Store erstellen

1. Gehe zu deinem Vercel Dashboard: https://vercel.com/dashboard
2. Wähle dein Projekt aus
3. Gehe zu **Storage** Tab
4. Klicke auf **Create Database**
5. Wähle **KV** (Key-Value Store)
6. Gib einen Namen ein (z.B. `christmas-party-db`)
7. Wähle die Region (z.B. `Frankfurt, Germany`)
8. Klicke auf **Create**

### 2. KV Store mit deinem Projekt verbinden

1. Nach der Erstellung, klicke auf deinen KV Store
2. Gehe zum **Settings** Tab
3. Unter **Connected Projects** klicke auf **Connect Project**
4. Wähle dein Projekt aus (merryweihnachten)
5. Klicke auf **Connect**

### 3. Umgebungsvariablen werden automatisch gesetzt

Vercel setzt automatisch diese Umgebungsvariablen:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

Diese werden von `@vercel/kv` automatisch verwendet.

### 4. Deployment

Nach der Verbindung mit dem KV Store:

1. Pushe deinen Code zu GitHub:
   ```bash
   git add .
   git commit -m "Add persistent storage with Vercel KV"
   git push
   ```

2. Vercel deployt automatisch und verwendet den KV Store

## Was wurde geändert:

- ✅ `@vercel/kv` Package hinzugefügt
- ✅ Alle API-Endpunkte auf `async/await` umgestellt
- ✅ User-Daten werden in Vercel KV gespeichert
- ✅ Admin-Tokens werden in Vercel KV gespeichert
- ✅ Daten bleiben nach Server-Neustarts erhalten

## Testen:

Nach dem Deployment kannst du testen:
1. Erstelle Benutzer und weise Gruppen zu
2. Warte einige Minuten
3. Die Daten sollten weiterhin vorhanden sein

## Wichtig:

- Der erste API-Aufruf nach einem Cold Start kann etwas länger dauern
- Vercel KV hat ein kostenloses Limit (siehe Vercel Dashboard)
- Für Produktionsumgebung eventuell einen größeren Plan in Betracht ziehen

## Alternative: Lokaler Test ohne Vercel KV

Für lokale Tests ohne Vercel KV wird automatisch ein Fallback auf In-Memory Storage verwendet. In diesem Fall werden die Daten bei jedem Server-Neustart gelöscht.
