# Github

> Exported from ClickUp Knowledge Base
> Source: https://app.clickup.com/20450769/v/dc/kg3eh-1581/kg3eh-1054192
> Updated: 2026-05-11T09:14:49.269Z

## ⚠️ Det vigtigste step: .gitignore og .env
Før du kører `git add .`, skal du sikre dig, at du ikke uploader filer, der kan skade sikkerheden eller gøre projektet unødigt tungt.
### 1\. Hvad er en .gitignore?
Dette er en lille tekstfil, du opretter i din projektmappe (samme sted som du kørte `git init`). Den fortæller Git, hvilke filer og mapper der skal ignoreres.
*   Hvorfor? Vi vil ikke uploade store mapper som `node_modules`, `vendor` eller midlertidige logfiler. De fylder for meget og skal genereres lokalt af hver medarbejder.
*   Pro-tip: Du kan nemt generere en færdig fil på [gitignore.io](https://www.toptal.com/developers/gitignore) ved at skrive f.eks. "Laravel", "Node" eller "WordPress".
### 2\. Pas på din .env-fil!
`.env`\-filen indeholder dine lokale hemmeligheder: Kodeord til databaser, API-nøgler og systemindstillinger.
*   Regel nummer 1: En `.env`\-fil må ALDRIG pushes til GitHub.
*   Hvis den ryger op på vores fælles account, kan alle med adgang (og potentielt hackere, hvis repoet er offentligt) se vores adgangskoder.
### Sådan gør du i praksis:
1. Opret en fil der hedder præcis `.gitignore` i din mappe.
2. Åbn den og tilføj linjen: `.env`
3. Tilføj også de mapper, der ikke skal med (f.eks. `node_modules/`).
4. Nu kan du trygt køre `git add .`
> Husk: Hvis du først har pushet en `.env`\-fil én gang, ligger den i historikken for evigt – selvom du sletter den bagefter. Så tjek din `.gitignore` før dit første push!
##   

##   

## Guide: Sådan uploader du projekter til vores fælles GitHub
Denne guide sikrer, at dit navn står i historikken, selvom vi uploader til vores fælles manager-konto via Uniqkey.
### 1\. Installation
Hvis du ikke allerede har Git, skal du hente det her:
*   Download: [git-scm.com/download/win](https://git-scm.com/download/win) (Vælg _64-bit Git for Windows Setup_).
*   Når du installerer, skal du bare trykke "Next" til standardindstillingerne.

* * *

### 2\. Opsætning af din identitet (Kun én gang)
Åbn Git Bash og kør disse to linjer, så vi kan se, hvem der har lavet koden:
*   `git config --global` [`user.name`](http://user.name) `"Dit Navn"`
*   `git config --global` [`user.email`](http://user.email) `"`[`din-mail@searchmind.dk`](mailto:din-mail@searchmind.dk)`"`
*   _Tjek om det virker med:_ `git config --global --list`

* * *

### 3\. Start et nyt projekt (Step-by-step)
Hver gang du har et nyt projekt lokalt, der skal på GitHub, gør du følgende:
1. Find mappen: Naviger til din projektmappe i Git Bash:
    *   `cd "C:/sti/til/dit/projekt"`
2. Start projektet: Aktiver Git i mappen:
    *   `git init`
3. Omdøb grenen: Sørg for at den hedder 'main' (standard i dag):
    *   `git branch -m main`
4. Klargør og gem: Saml filerne og "sign" dem med dit navn:
    *   `git add .`
    *   `git commit -m "Beskrivelse af hvad du har lavet"`

* * *

### 4\. Forbind og Upload (Push)
1. Opret Repo (**PRIVATE**): Gå på GitHub ([`mc@searchmind.dk`](mailto:mc@searchmind.dk)), opret et nyt repository og kopier URL'en.
2. Link til GitHub: Forbind din lokale mappe med GitHub:
    *   `git remote add origin [indsæt URL]`
3. Første push (Force): For at få alt op med det samme og overskrive standardfiler:
    *   `git push -u origin main --force`

* * *

### 5\. Login via Uniqkey
Når du kører `push`, vil Windows poppe op med et login-vindue.
*   Her logger du ind med de credentials til [mc@searchmind.dk](mailto:mc@searchmind.dk), der ligger i vores Uniqkey.
*   _Når du er logget ind én gang, husker computeren det typisk til næste gang._

* * *

> Vigtigt: Husk altid at starte med `cd` (så du er i den rigtige mappe) og `git init` (så Git er tændt), ellers virker ingen af de andre kommandoer!
