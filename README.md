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
npm run setup
npm run db:up
npm run db:migrate
npm run dev
```

Die `.env`-Dateien sind lokal bereits angelegt. `npm run setup` erstellt fehlende Dateien, erzeugt ein zufälliges Auth-Secret und behält vorhandene Konfigurationen bei. Die enthaltenen Datenbank-Zugangsdaten sind ausschließlich für lokale Entwicklung.

- API: `http://localhost:3001`
- `/health`: Prozess lebt, unabhängig von der Datenbank
- `/ready`: Datenbank erreichbar
- Mailpit-Testpostfach: `http://localhost:8025` (lokale Bestätigungs- und Reset-Mails; kein externer Versand)
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

- Registrierung mit Name, E-Mail und Passwort; E-Mail-Bestätigung ist vor dem Login erforderlich.
- Login, persistente Sitzungen und Logout mit serverseitigem Widerruf.
- Passwort vergessen, Browserformular zum Zurücksetzen und Widerruf bestehender Sitzungen nach erfolgreichem Reset.
- Einmaliges Onboarding als Creator oder Brand. Die Rolle kann über Profiländerungen nicht gewechselt werden.
- Creator-Profil mit Instagram-Nutzername, Vorstellung, Standort, Sprachen, Themen, Deal-Präferenzen und optionalen Reel-Links.
- Brand-Profil mit Ansprechpartner, Brand-Name, Beschreibung, Website, Branche und Standort.
- Eigene Profile laden und bearbeiten; IDs werden ausschließlich aus der geprüften Sitzung abgeleitet.
- Öffentliche Kampagnenübersicht mit Barter-/Paid-Filtern.

Kampagnenverwaltung, Bewerbungs-Swipes, Matches, Chat, Versand und Reel-Abnahme sind weiterhin nicht implementiert. Profilbilder/Logos und automatische Instagram-Verifizierung folgen separat; der angegebene öffentliche Kanal wird noch nicht automatisch geprüft.

## Authentifizierung lokal testen

Nach dem Update `npm run setup`, `npm run db:up`, `npm run db:migrate` ausführen und den Dev-Server neu starten.

1. In der App „Konto erstellen“ wählen und registrieren. Passwörter haben 10–128 Zeichen.
2. Das lokale Testpostfach unter `http://localhost:8025` öffnen und auf den Bestätigungslink klicken.
3. Zur App zurückkehren, anmelden und das Creator- oder Brand-Profil ausfüllen.
4. Zum Testen der anderen Rolle abmelden und einen zweiten Account registrieren.
5. „Passwort vergessen?“ testen. Der E-Mail-Link öffnet ein Browserformular; nach erfolgreichem Reset erneut anmelden.

Für Smartphone-Tests müssen `AUTH_BASE_URL` in `apps/api/.env` und `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` dieselbe erreichbare API-Adresse verwenden (z. B. die LAN-IP des Rechners mit Port 3001). `CORS_ORIGINS` enthält die tatsächlich verwendeten Web-Ursprünge, durch Komma getrennt. Nach Änderungen Server und Expo neu starten. Native Sitzungs-Cookies werden mit Expo SecureStore gespeichert, im Browser als HttpOnly-Cookies. Auf einem bestehenden Development Build ist wegen neuer nativer Pakete ggf. ein neuer Build nötig.

Better Auth verwaltet eigene Tabellen; `auth_identities` verknüpft dessen Benutzer mit stabilen Profil-IDs. Ein späterer Datenbank-/Auth-Wechsel bleibt getrennt planbar. Auth-Mails werden dauerhaft in `auth_mail_outbox` vorgemerkt, im Hintergrund an SMTP übergeben und nach Erfolg gelöscht. Fehlgeschlagene Zustellungen werden begrenzt wiederholt; nach einer Stunde werden verbleibende Inhalte entfernt. SMTP-Ausfälle werden ohne Empfänger oder Token geloggt. Das lokale Mailpit hat keine externen Empfänger.

`npm run test:integration` prüft den Auth-Lebenszyklus gegen ein zufälliges, isoliertes PostgreSQL-Testschema, das danach gelöscht wird. Dafür muss die lokale Datenbank laufen; der Test-Benutzer benötigt Rechte zum Erstellen eines Schemas. Die Tests ändern keine bestehenden Nutzerprofile und versenden keine echten E-Mails.

## Vor einem öffentlichen Pilot

Atomare Bewerbungsannahme und Platzvergabe implementieren; HTTPS und einen echten SMTP-Anbieter mit passendem Absender einrichten. Die lokalen Mailpit-Ports nicht öffentlich freigeben. Für einen Reverse Proxy müssen dessen vertrauenswürdige Adressen gezielt konfiguriert werden, damit die IP-basierten Limits korrekt greifen. Bei mehreren API-Instanzen einen gemeinsamen Rate-Limit-Speicher einrichten. Für den Server einen eingeschränkten Datenbankbenutzer verwenden, statt des lokalen Docker-Administrators. Datenbank und Dateien extern sichern und Wiederherstellung prüfen. Das Compose-Setup ist für lokale Entwicklung, keine fertige Produktionsbereitstellung.

Paketname und URL-Slug: `create-for-christ`. Anzeigename: **Create For Christ**. Die technischen App-IDs `app.createforchrist.mobile` sind vor der Store-Veröffentlichung mit der tatsächlichen Organisation abzugleichen.

## Prüfstand und bekannte Einschränkungen

Typechecks, API-Tests und Backend-Build wurden erfolgreich ausgeführt. Die Auth-Integrationstests prüfen unbestätigte Accounts, idempotentes Onboarding, fremde Profil-IDs, Rollenwechsel, CSRF, Logout und einmalige Passwort-Resets mit Sitzungswiderruf. Expo-Bundles für iOS, Android und Web wurden erfolgreich exportiert; ein nativer Simulator-/Gerätetest ist noch nicht erfolgt. Die SQL-Migration wurde auf PostgreSQL 17 angewendet und ihre Wiederholbarkeit geprüft.

Beim initialen npm audit wurden 13 moderate Meldungen innerhalb der Expo-Abhängigkeitsketten ausgewiesen, insbesondere uuid über xcode sowie decode-uri-component über query-string/Expo Router. Keine hohen oder kritischen Meldungen in diesem Prüfstand. Die vorgeschlagenen automatischen Major-Downgrades wurden nicht angewendet, da sie nicht zur gewählten Expo-Version passen. Vor Veröffentlichung erneut prüfen und kompatible Upstream-Korrekturen einspielen.
