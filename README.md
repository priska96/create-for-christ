# Create For Christ

Expo-App für Reel-Kooperationen zwischen UGC-Creatorn und Brands. Creator entdecken Barter- und Paid-Kampagnen und veröffentlichen vereinbarte Reels auf ihrem eigenen Instagram-Kanal.

## Stack

- Expo SDK 57, React Native, Expo Router und TypeScript
- Node.js 22, Fastify und PostgreSQL 17
- npm Workspaces; gemeinsame API-Verträge und Laufzeitvalidierung mit Zod
- Eigener modularer Backend-Aufbau. Kein Supabase-Dienst erforderlich; PostgreSQL und separate Auth-Identitäten halten einen späteren Wechsel offen.

## Lokal starten

Voraussetzungen: Node.js laut `.nvmrc`, npm und laufendes Docker Desktop.

```sh
nvm use
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
npm run db:up
npm run db:migrate
npm run dev
```

Die `.env`-Dateien sind bei der Ersteinrichtung bereits lokal angelegt. Die Kopierbefehle sind für einen frischen Checkout gedacht; vorhandene eigene Werte nicht überschreiben. Die enthaltenen Datenbank-Zugangsdaten sind ausschließlich für lokale Entwicklung.

- API: `http://localhost:3001`
- `/health`: Prozess lebt, unabhängig von der Datenbank
- `/ready`: Datenbank erreichbar
- `/v1/campaigns`: bis zu 20 veröffentlichte Kampagnen, optional `?dealType=barter` oder `?dealType=paid`
- Mobile: QR-Code im Expo-Terminal; alternativ `npm run dev:web` für den Browser (API separat mit `npm run dev:api` starten).

Für ein echtes Smartphone muss `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` die LAN-IP des Rechners enthalten, z. B. `http://192.168.1.20:3001`. Rechner und Telefon müssen sich erreichen können. Im Android-Emulator ist es normalerweise `http://10.0.2.2:3001`; im iOS-Simulator und Browser `http://localhost:3001`. Nach Änderungen Expo neu starten. Für Expo Go muss dessen SDK-Version passen; alternativ einen Development Build verwenden.

PostgreSQL wird nur an `127.0.0.1:5433` veröffentlicht, um bestehende lokale Datenbanken auf Port 5432 nicht zu stören. Bei geänderten DB-Zugangsdaten auch `apps/api/.env` anpassen. `npm run db:down` stoppt die Datenbank und behält das Datenvolume.

## Struktur

```text
apps/
  mobile/             Expo-App und öffentliche API-Anbindung
  api/
    src/              Fastify-API, Datenbankzugriff, Konfiguration
    migrations/       Versionierte SQL-Migrationen
    test/             API-Verhalten und Fehlerfälle
packages/
  contracts/          Gemeinsame Zod-Schemas und TypeScript-Typen
compose.yaml          Lokale PostgreSQL-Datenbank
app-konzept.mdx       Konzept und dokumentierte Entscheidungen
```

## Prüfungen

```sh
npm run check
npm run build
```

Die API-Tests benötigen keine laufende Datenbank. Migrationen werden mit `npm run db:migrate` auf die konfigurierte Datenbank angewendet. Bereits angewendete Migrationen werden nicht erneut ausgeführt; ihre Prüfsummen verhindern unbemerkte nachträgliche Änderungen. Neue Änderungen bekommen eine neue SQL-Datei.

Für einen Bundle-Test:

```sh
cd apps/mobile
npx expo export --platform web
```

Nach Änderungen an `packages/contracts` dessen Build neu starten; die gemeinsamen Pakete werden vor den Root-Startskripten gebaut. App und API unterstützen während der Entwicklung Änderungen über ihre eigenen Watcher.

## Aktueller Umfang

Startfähige Projektgrundlage mit Creator-/Brand-Vorschau, Barter-/Paid-Filter, echten API-Anfragen und Lade-, Leer- und Fehlerzuständen. Es werden keine Beispielkampagnen als echte Angebote ausgegeben. Die Datenbank beginnt leer.

Registrierung, Login, Profile bearbeiten, Kampagnen veröffentlichen, Swipe-Bewerbungen, Matches, Chat, Versand und Reel-Abnahme sind noch nicht implementiert. Die Rollenwahl in der Vorschau ist keine Anmeldung oder Berechtigung. Es gibt bewusst keine offenen Schreib-Endpunkte. Das Schema ist eine erste Grundlage und wird mit den Features erweitert, insbesondere um versionierte Vereinbarungen, private Lieferdaten und Benachrichtigungsaufträge.

## Vor einem öffentlichen Pilot

Eine Auth-Lösung integrieren; Berechtigungen pro API-Aktion prüfen; atomare Bewerbungsannahme und Platzvergabe implementieren; HTTPS und E-Mail-Versand einrichten. Für den Server einen eingeschränkten Datenbankbenutzer verwenden, statt des lokalen Docker-Administrators. Datenbank und Dateien extern sichern und Wiederherstellung prüfen. Das Compose-Setup ist für lokale Entwicklung, keine fertige Produktionsbereitstellung.

Paketname und URL-Slug: `create-for-christ`. Anzeigename: **Create For Christ**. Die technischen App-IDs `app.createforchrist.mobile` sind vor der Store-Veröffentlichung mit der tatsächlichen Organisation abzugleichen.

## Prüfstand und bekannte Einschränkungen

Typechecks, API-Tests und Backend-Build wurden erfolgreich ausgeführt. Expo-Bundles für iOS, Android und Web wurden erfolgreich exportiert; ein nativer Simulator-/Gerätetest ist noch nicht erfolgt. Die SQL-Migration wurde auf PostgreSQL 17 angewendet und ihre Wiederholbarkeit geprüft.

Beim initialen npm audit wurden 13 moderate Meldungen innerhalb der Expo-Abhängigkeitsketten ausgewiesen, insbesondere uuid über xcode sowie decode-uri-component über query-string/Expo Router. Keine hohen oder kritischen Meldungen in diesem Prüfstand. Die vorgeschlagenen automatischen Major-Downgrades wurden nicht angewendet, da sie nicht zur gewählten Expo-Version passen. Vor Veröffentlichung erneut prüfen und kompatible Upstream-Korrekturen einspielen.
