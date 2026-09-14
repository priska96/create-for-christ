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
apps/api/src/
  app.ts                    Serveraufbau und Registrierung der Module
  config/                   Umgebungsvariablen und Betriebsgrenzen
  http/                     Sitzungsprüfung, Validierung, Fehlerbehandlung
  infrastructure/           PostgreSQL, Transaktionen und Mail-Outbox
  modules/
    auth/                   Auth-Adapter, Better Auth und Browserseiten
    profiles/               Profil-Routen und Persistenz
    campaigns/              Routen, Persistenz, Mapping und Bildspeicherung
    applications/           Feed, Bewerbungen, Entscheidungen und Cursor-Paginierung
    health/                 Liveness und Readiness
apps/mobile/
  app/                      Expo-Router-Screens
  src/api/                  HTTP-Client und typisierte API-Aufrufe
  src/features/             Profile, Kampagnen, Swipe-Feed und Bewerbungsansichten
  src/ui/                   Gemeinsame Controls und Design-Tokens
packages/contracts/src/     Gemeinsame Schemas, Typen und fachliche Konstanten
```

## Prüfungen

```sh
npm run check
npm run test:integration
npm run format:check
```

`npm test` benötigt keine laufende Datenbank; `npm run test:integration` benötigt lokales PostgreSQL. Migrationen werden mit `npm run db:migrate` auf die konfigurierte Datenbank angewendet. Bereits angewendete Migrationen werden nicht erneut ausgeführt; ihre Prüfsummen verhindern unbemerkte nachträgliche Änderungen. Neue Änderungen bekommen eine neue SQL-Datei.

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
- Kampagnenverwaltung für Brands: Entwürfe erstellen und bearbeiten, Produktbild hochladen, veröffentlichen und schließen. Jede Brand sieht und ändert ausschließlich ihre eigenen Kampagnen; der Creator-Feed zeigt nur veröffentlichte, noch offene Kampagnen.

- Persönlicher Creator-Feed mit Deal-Präferenzen, Cursor-Paginierung und freien Kampagnenplätzen. Bereits beworbene oder übersprungene Kampagnen erscheinen nicht erneut.
- Links swipen zum Überspringen; rechts swipen öffnet eine Bestätigung mit optionalem Pitch. Beide Aktionen sind auch per Button erreichbar.
- Eigene Bewerbungen mit Statusfiltern; Brands prüfen pro Kampagne Creator-Profil, Reel-Portfolio, Pitch und gespeicherte Bedingungen.
- Zusage/Absage mit Bestätigung. Eine Zusage erstellt atomar genau eine Kooperation (`negotiating`) und belegt einen Platz; doppelte Anfragen sind idempotent.

Chat, beidseitige Vereinbarungsbestätigung, Versandabwicklung und Reel-Abnahme sind weiterhin nicht implementiert. Automatische Instagram-Verifizierung folgt separat; der angegebene öffentliche Kanal wird noch nicht automatisch geprüft. Produktbilder liegen lokal auf dem API-Server unter `apps/api/uploads/campaigns` und sind über unguessbare Dateinamen öffentlich abrufbar; das ist keine produktionsreife Medienablage.

## Authentifizierung lokal testen

Nach dem Update `npm run setup`, `npm run db:up`, `npm run db:migrate` ausführen und den Dev-Server neu starten.

1. In der App „Konto erstellen“ wählen und registrieren. Passwörter haben 10–128 Zeichen.
2. Das lokale Testpostfach unter `http://localhost:8025` öffnen und auf den Bestätigungslink klicken.
3. Zur App zurückkehren, anmelden und das Creator- oder Brand-Profil ausfüllen.
4. Zum Testen der anderen Rolle abmelden und einen zweiten Account registrieren.
5. „Passwort vergessen?“ testen. Der E-Mail-Link öffnet ein Browserformular; nach erfolgreichem Reset erneut anmelden.

Für Smartphone-Tests müssen `AUTH_BASE_URL` in `apps/api/.env` und `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` dieselbe erreichbare API-Adresse verwenden (z. B. die LAN-IP des Rechners mit Port 3001). `CORS_ORIGINS` enthält die tatsächlich verwendeten Web-Ursprünge, durch Komma getrennt. Nach Änderungen Server und Expo neu starten. Native Sitzungs-Cookies werden mit Expo SecureStore gespeichert, im Browser als HttpOnly-Cookies. Auf einem bestehenden Development Build ist wegen neuer nativer Pakete ggf. ein neuer Build nötig.

Better Auth verwaltet eigene Tabellen; `auth_identities` verknüpft dessen Benutzer mit stabilen Profil-IDs. Ein späterer Datenbank-/Auth-Wechsel bleibt getrennt planbar. Auth-Mails werden dauerhaft in `auth_mail_outbox` vorgemerkt, im Hintergrund an SMTP übergeben und nach Erfolg gelöscht. Fehlgeschlagene Zustellungen werden begrenzt wiederholt; nach einer Stunde werden verbleibende Inhalte entfernt. SMTP-Ausfälle werden ohne Empfänger oder Token geloggt. Das lokale Mailpit hat keine externen Empfänger.

`npm run test:integration` prüft Auth-Lebenszyklus, Bewerbungen, Feed-Filter, Cursor-Paginierung, unveränderliche Bedingungen und parallele Platzvergabe gegen isolierte PostgreSQL-Testschemas, die danach gelöscht werden. Dafür muss die lokale Datenbank laufen; der Test-Benutzer benötigt Rechte zum Erstellen eines Schemas. Die Tests ändern keine bestehenden Nutzerprofile und versenden keine echten E-Mails.

## Vor einem öffentlichen Pilot

HTTPS und einen echten SMTP-Anbieter mit passendem Absender einrichten. Die lokalen Mailpit-Ports nicht öffentlich freigeben. Für einen Reverse Proxy müssen dessen vertrauenswürdige Adressen gezielt konfiguriert werden, damit die IP-basierten Limits korrekt greifen. Bei mehreren API-Instanzen einen gemeinsamen Rate-Limit-Speicher einrichten. Für den Server einen eingeschränkten Datenbankbenutzer verwenden, statt des lokalen Docker-Administrators. Datenbank und Dateien extern sichern und Wiederherstellung prüfen. Das Compose-Setup ist für lokale Entwicklung, keine fertige Produktionsbereitstellung.

Paketname und URL-Slug: `create-for-christ`. Anzeigename: **Create For Christ**. Die technischen App-IDs `app.createforchrist.mobile` sind vor der Store-Veröffentlichung mit der tatsächlichen Organisation abzugleichen.

## Prüfstand und bekannte Einschränkungen

Typechecks, API-Tests und Backend-Build wurden erfolgreich ausgeführt. Die Auth-Integrationstests prüfen unbestätigte Accounts, idempotentes Onboarding, fremde Profil-IDs, Rollenwechsel, CSRF, Logout und einmalige Passwort-Resets mit Sitzungswiderruf. Expo-Bundles für iOS, Android und Web wurden erfolgreich exportiert; ein nativer Simulator-/Gerätetest ist noch nicht erfolgt. Die SQL-Migration wurde auf PostgreSQL 17 angewendet und ihre Wiederholbarkeit geprüft.

Beim initialen npm audit wurden 13 moderate Meldungen innerhalb der Expo-Abhängigkeitsketten ausgewiesen, insbesondere uuid über xcode sowie decode-uri-component über query-string/Expo Router. Keine hohen oder kritischen Meldungen in diesem Prüfstand. Die vorgeschlagenen automatischen Major-Downgrades wurden nicht angewendet, da sie nicht zur gewählten Expo-Version passen. Vor Veröffentlichung erneut prüfen und kompatible Upstream-Korrekturen einspielen.


### Kampagnen-Review (10. September 2026)

Bodylose Aktionen (Veröffentlichen/Schließen) senden keinen JSON-Content-Type. Uploads sind auf 5 MiB und 25 Megapixel begrenzt; JPEG/PNG/WebP werden serverseitig dekodiert, ohne Metadaten als WebP mit maximal 1600 Pixel Kantenlänge gespeichert. Eigentümerschaft und Kampagnenstatus werden vor dem Speichern innerhalb einer Datenbanktransaktion geprüft. Fehlgeschlagene Uploads und nicht mehr referenzierte ersetzte Bilder werden entfernt. Bilder aus gespeicherten Bewerbungsbedingungen bleiben erhalten. Produktbilder erscheinen im Discovery-Feed.

Bilder liegen weiterhin lokal unter `apps/api/uploads/campaigns` (Start im API-Workspace); dieses Verzeichnis muss beim Deployment persistent gespeichert und gesichert werden. Bild-URLs sind öffentlich, auch bei Entwürfen, und daher nicht für vertrauliche Inhalte geeignet. Alte, bereits verwaiste Dateien werden nicht automatisch gelöscht. Bei einem Prozessabbruch zwischen Dateischreiben und Datenbank-Commit kann ebenfalls eine verwaiste Datei entstehen; ein periodischer Abgleich ist eine spätere Betriebsaufgabe.

Regressionstests decken Bilddekodierung, Dateigrößen/Pixelgrenzen, manipulierte Dateien, Pfadzugriffe, Brand-Isolation, Veröffentlichung ohne Body und das Entfernen geschlossener Kampagnen aus dem Feed ab.


## Codekonventionen und Expo UI

Fachliche Werte (Rollen, Deal-Arten, Status, Passwort- und Upload-Grenzen, API-Pfade) liegen in `packages/contracts/src/constants.ts`. API-Betriebsgrenzen liegen in `apps/api/src/config/constants.ts`, mobile Routen/Timeouts in `apps/mobile/src/constants.ts`, Farben und Maße in `apps/mobile/src/ui/theme.ts`. Standardwerte von Konfigurationsschemas, SQL-Spaltennamen und einmalige UI-Texte bleiben in ihrem fachlichen Kontext. Angewendete SQL-Migrationen werden nicht für kosmetische Konstantenänderungen angefasst.

Die API prüft Sitzungen zentral. Mutationen benötigen zusätzlich einen vertrauten Origin; GET-Abfragen benötigen keinen Origin-Header. Fachmodule prüfen weiterhin Eigentümerschaft in der Datenbank. Gemeinsame Transaktionsverwaltung übernimmt Commit, Rollback und das Freigeben der Verbindung.

`@expo/ui` 57 wird über seine universelle API für Buttons und Checkboxen verwendet. Ein gemeinsamer Host setzt die Theme-Farbe und den hellen Modus. Expo UI nutzt auf iOS SwiftUI, auf Android Compose und im Browser Web-Komponenten; die Controls haben daher gemeinsame Farben, aber weiterhin plattformtypische Formen. Layout, Radio-Auswahl und Texteingaben bleiben gemeinsame React-Native-Komponenten. Insbesondere bietet der aktuelle universelle TextInput kein `accessibilityLabel`; `Field` erhält deshalb die vorhandenen zugänglichen Beschriftungen und Autofill-Einstellungen.

Referenzen: [Expo UI Universal](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/), [TextInput API](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/textinput/).

`noUnusedLocals` und `noUnusedParameters` sind in allen Workspaces aktiviert. `npm run format` vereinheitlicht die Quelltexte; `npm run format:check` prüft das Format. Bei einem eigenen nativen Development Build muss nach dem Hinzufügen von Expo UI der native Build erneuert werden.


## Bewerbungsablauf lokal testen

Nach dem Update `npm run db:migrate` ausführen und API sowie Expo neu starten.

1. Als Brand eine Kampagne mit Barter oder festem Honorar pro Reel veröffentlichen.
2. Mit einem separaten Creator-Konto anmelden. Rechts swipen, optional einen Pitch angeben und die Bewerbung bestätigen; „Abbrechen“ sendet nichts.
3. Unter „Meine Bewerbungen“ erscheint der Status „Offen“.
4. Als Brand „Kampagnen verwalten“ → „Bewerbungen ansehen“ öffnen und zusagen oder ablehnen.
5. Als Creator die Liste aktualisieren: Eine Zusage zeigt das Match, eine Absage den Status „Abgelehnt“.

Neue Endpunkte: `GET /v1/creator/feed`, `POST /v1/creator/campaigns/:id/applications`, `POST /v1/creator/campaigns/:id/dismiss`, `GET /v1/creator/applications`, `GET /v1/brand/campaigns/:id/applications`, `POST /v1/brand/applications/:id/accept` und `/reject`. Die GET-Listen akzeptieren einen `cursor`, Bewerbungslisten zusätzlich `status`, der Feed `dealType` innerhalb der Profilpräferenzen. Private Antworten sind nicht cachebar.

Migration `004_applications.sql` ergänzt dauerhafte Dismissals, Kampagnenrevisionen und unveränderliche Bedingungen für Bewerbungen/Kooperationen. Ändert sich eine Kampagne vor dem Absenden, muss der Creator die Bedingungen neu laden. Zusagen sperren zuerst die Kampagne und dann die Bewerbung; auch Kampagnenänderungen verwenden dieselbe Kampagnensperre. Die Platzanzahl lässt sich nicht unter die Zahl angenommener Bewerbungen reduzieren. Nach Schließen oder Ablauf einer Kampagne sind Zusagen gesperrt; offene Bewerbungen können weiterhin abgelehnt werden.

Die Personalisierung berücksichtigt derzeit Deal-Präferenzen, Verfügbarkeit und bisherige Aktionen. Themen-/Sprachfilter, Blockierung, Zurückziehen von Bewerbungen, Preisverhandlungen und Push-Nachrichten sind noch nicht implementiert. Ein Match startet noch keinen beidseitig bestätigten Auftrag; Chat und Vereinbarungsbestätigung sind der nächste Meilenstein.


### Prüfstand des Bewerbungsmeilensteins

`npm run check`, `npm run test:integration` und `npm run format:check` sind erfolgreich. Die fünf API-/Upload-Tests und 15 Integrationstest-Einträge einschließlich der beiden übergeordneten Testfälle sind grün. Der Browser-Test mit getrennten Creator-/Brand-Sitzungen prüft echte Links-/Rechts-Gesten, Abbrechen ohne Bewerbung, veraltete Bedingungen, optionalen Pitch, einen fehlgeschlagenen Request mit Wiederholung, Zusage/Absage, Statusfilter und persistente Feed-Ausschlüsse. Dabei traten keine Browser-JavaScript-Fehler auf.

Die aktuelle Expo-App wurde für Web, iOS und Android exportiert. Ein interaktiver Test auf einem nativen Gerät oder Simulator steht noch aus. Migration `004_applications.sql` ist auf der lokalen Entwicklungsdatenbank angewendet; bestehende Migrationen wurden nicht geändert. API und Expo nach dem Update neu starten.


## Designumsetzung nach Vorlage (11. September 2026)

Die Vorlage `designs/ChatGPT Image 10. Sept. 2026, 11_14_49.png` bestimmt den visuellen Stil: helle Flächen, dunkle runde Buttons, Korall-Akzente, grüne Zusagen, rote Absagen und großzügige Produktkarten. Der App-Name bleibt Create For Christ, und das Angebot bleibt auf Instagram-Reels beschränkt.

`Page` setzt einen gemeinsamen kompakten Header und die feste Bottom-Navigation außerhalb des Scrollbereichs um. Beide Rollen haben Home, Bewerbungen, Nachrichten und Profil. Creator-Home führt zum Swipe-Feed, Brand-Home zur Kampagnenverwaltung. Der Bewerbungs-Tab zeigt für Brands alle eigenen Kampagnen gemeinsam, für Creator die eigenen Bewerbungen. Die aktiven Tabs sind beschriftet und visuell sowie für Screenreader markiert.

Wiederverwendbare Bausteine liegen in `src/ui`: BottomNavigation, Icon, IconButton, Avatar, CampaignCover, DetailSheet, EmptyState und RoleOption. Profile, Formulare und Bestätigungen verwenden die bestehenden gemeinsamen Expo-UI-Buttons und zugänglichen Eingabefelder. Produktbilder kommen aus den Kampagnen; fehlende Bilder und derzeit nicht gespeicherte Profilfotos werden durch neutrale Flächen bzw. Initialen ersetzt. Erfundenes Bildmaterial, Bewertungen, Followerzahlen und Online-Status werden nicht angezeigt.

Bewerbungen erscheinen als kompakte Zeilen. Ein Antippen öffnet die Detailansicht mit Creator-Profil, Reel-Links, Pitch und vollständigen Bedingungen. Zusage/Absage bleibt bestätigt und serverseitig geschützt. Die dunkle Match-Ansicht ist nur für tatsächlich angenommene Bewerbungen zugänglich. Der Nachrichten-Tab hat einen ausdrücklich als noch nicht verfügbar gekennzeichneten Leerzustand; echter Chat-Versand ist weiterhin der nächste funktionale Meilenstein.

Der neue Endpunkt `GET /v1/brand/applications` liefert ausschließlich Bewerbungen eigener Brand-Kampagnen und unterstützt die vorhandenen Statusfilter und Cursor. Die Integrationstests prüfen Brand-Isolation und Creator-Ausschluss. Es ist keine neue Datenbankmigration nötig. Die Browserprüfung auf 390 × 844 Pixeln deckt alle vier Tabs für beide Rollen, die feste Navigation beim Scrollen, Swipes, Details, Zusagen/Absagen, Match-Ansicht und Kampagnenformulare ab. Ein interaktiver nativer Gerätetest steht weiterhin aus.

## Formulare

Alle Eingabeformulare verwenden React Hook Form: Registrierung, Login, Passwort-Anforderung und -Reset, Creator-/Brand-Profile, Kampagnen und Bewerbungs-Pitch. Mobile Textfelder werden über `src/ui/FormField.tsx` angebunden; `Field` zeigt rote Rahmen und zugeordnete Fehlermeldungen. Die Validierung beginnt beim Verlassen eines Feldes oder beim Absenden und aktualisiert sich nach einer Korrektur. Gemeinsam genutzte Zod-Regeln bleiben maßgeblich; API-Feldfehler werden über `setError` übernommen. Die API prüft weiterhin alle Eingaben und Berechtigungen unabhängig vom Frontend.

Die Passwort-Reset-Seite wird von derselben API wie bisher ausgeliefert. `npm run dev:api`, API-Integrationstests und `npm run build` erzeugen ihr React-Bundle automatisch in `apps/api/.generated`. Bei einer Bereitstellung neben `dist` auch `.generated` übernehmen und zuvor mit installierten Entwicklungsabhängigkeiten bauen. Der Reset-Token bleibt nur im Arbeitsspeicher; externe Skript-CDNs werden nicht benötigt.

## Serverdaten mit TanStack Query

`AppQueryProvider` stellt je Sitzung einen eigenen QueryClient bereit. Beim Accountwechsel und Logout werden ausstehende Queries abgebrochen und der alte Cache geleert. Better Auth bleibt für die Sitzung zuständig. Expo-AppState und Netzwerkstatus steuern Aktualisierungen im Vordergrund und nach Wiederverbindung; Router-Fokus aktualisiert geöffnete Ansichten.

Die Hooks in `apps/mobile/src/hooks` kapseln Profil-, Kampagnen-, Auth- und Bewerbungsabfragen sowie Mutationen. Feed und Bewerbungslisten verwenden `useInfiniteQuery` mit getrennten Schlüsseln je Filter. Erfolgreiche Änderungen aktualisieren den Cache und invalidieren betroffene Listen; fehlgeschlagene Mutationen werden weder automatisch wiederholt noch für spätere Ausführung offline gespeichert. Formularwerte bleiben in React Hook Form und werden durch Hintergrundabfragen nicht zurückgesetzt.

## Dauerhafte Tests

- `npm test`: schnelle API-, Schema- und Cache-Tests ohne laufende Datenbank.
- `npm run test:integration`: echte PostgreSQL-Tests für Authentifizierung, Rollen/Eigentümerschaft, CSRF, Kampagnen, Uploads, Bewerbungen, Kapazitätsgrenzen und konkurrierende Zusagen.
- `npm run test:e2e`: baut API und Expo-Web und prüft mit Playwright Registrierung, Feldfehler, Profil-Onboarding, Passwort-Reset, Swipe-/Match-Abläufe, Bildauswahl/-austausch, Veröffentlichung, Cursor-Paginierung, Filter-Caches und Kontowechsel.
- `npm run test:all`: Code-Prüfungen, schnelle Tests, Integrationstests und Browser-Suite zusammen.

Einmalig den Browser installieren: `npm exec -w @create-for-christ/e2e -- playwright install chromium`. Alternativ einen vorhandenen Chrome mit `CFC_TEST_BROWSER=chrome npm run test:e2e` verwenden. Einzelne Browsergruppen lassen sich z. B. mit `npm run test:e2e -- --project=upload` ausführen.

Für Integration/E2E muss die lokale Datenbank laufen (`npm run db:up`). E2E liest die Verbindung aus `TEST_DATABASE_URL` oder `apps/api/.env`, erlaubt nur lokale Datenbanken und erzeugt je Test ein eigenes Schema mit frischen Konten. Test-E-Mails werden im Arbeitsspeicher abgefangen; Schema und erzeugte Bilder werden anschließend entfernt. Die Ports 3100/3101 müssen frei sein. Browsergruppen laufen in getrennten Prozessen, damit der Auth-Rate-Limiter Tests nicht gegenseitig beeinflusst.

Der HTML-Bericht liegt in `apps/e2e/playwright-report`, Fehler-Traces und Screenshots in `apps/e2e/test-results` (beides von Git ausgeschlossen). Die Browser-Suite testet Expo-Web; native iOS-/Android-Bedienung und die nativen Bildauswahldialoge benötigen weiterhin Gerätetests.
