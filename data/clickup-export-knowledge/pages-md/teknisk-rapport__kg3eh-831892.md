# Teknisk rapport

> Exported from ClickUp Knowledge Base
> Source: https://app.clickup.com/20450769/v/dc/kg3eh-1581/kg3eh-831892
> Updated: 2025-10-23T08:23:04.803Z

# Mail sender
Kører på info@ mailen
How to:
1. Sign in to your Google Account: Go to the Google Account login page ([https://myaccount.google.com/](https://myaccount.google.com/)) and sign in with your Gmail username and password.
2. Access Security Settings: Once logged in, click on your profile picture in the top right corner, then select "Manage your Google Account."
3. Navigate to Security: In the left-hand menu, click on the "Security" tab.
4. Enable 2-Step Verification (if not already enabled): If you haven't set up 2-Step Verification yet, you'll need to do so. Follow the prompts to enable it and set it up with your preferred method (phone number or alternative email).
5. Go to App Passwords: Scroll down to the "Signing in to Google" section and click on "App passwords." You may need to enter your password again for security purposes.
6. Generate App Password: Under the "Select app" dropdown menu, choose the app for which you want to generate the app password (e.g., "Mail" or "Other (Custom name)").
7. Generate Password: After selecting the app, select your device type and click "Generate." Google will provide you with a unique 16-digit app password.
8. Use App Password: Copy the generated app password and use it in place of your regular Gmail password when setting up or configuring the application or device. Make sure to keep this password secure.
9. Finish: Once you've generated and used the app password, you may close the window. Your app-specific password will remain active until you revoke it.

# Logins
### Password for Ubuntu VM:
crawlmedude

Default keyring PW:
crawlmedude

Pin code for Chrome remote desktop:
552800

* * *

# Screaming Frog
### Adding new MC mails to SF
Login to the VM open SF and go to API ➝ Google Search console ➝ Sign in with the MC account ➝ remember to rename the account you attach to what the mail is named EG: [mc3@searchmind.dk](mailto:mc3@searchmind.dk)
![](https://t20450769.p.clickup-attachments.com/t20450769/5359ba81-fc7a-4999-b466-94204de44807/Screenshot%202024-05-15%20at%2014.30.57.png)

### Screaming Frog CLI commands

[https://www.screamingfrog.co.uk/seo-spider/user-guide/general/#command-line-interface-set-up:~:text=Command%20line%20interface%20set%2Dup](https://www.screamingfrog.co.uk/seo-spider/user-guide/general/#command-line-interface-set-up:~:text=Command%20line%20interface%20set%2Dup)

### Running screaming frog in the cloud

[https://www.screamingfrog.co.uk/seo-spider/tutorials/seo-spider-cloud/](https://www.screamingfrog.co.uk/seo-spider/tutorials/seo-spider-cloud/)

* * *

# VM Installation & Setup

### Step 1:
### Using Google Compute Engine for VM
[https://scribehow.com/shared/Accessing\_Google\_Cloud\_Console\_Server\_Crawl\_Teknisk\_Rapport\_\_22O9yHMrQsij7iIrm1liNQ](https://scribehow.com/shared/Accessing_Google_Cloud_Console_Server_Crawl_Teknisk_Rapport__22O9yHMrQsij7iIrm1liNQ) - Remember to add new people to the project

### Step 2:
### Using Chrome remote Desktop
[https://scribehow.com/shared/Set\_Up\_Chrome\_Remote\_Desktop\_via\_SSH\_\_\_bz5aSAZR5q937d-k3eqcA](https://scribehow.com/shared/Set_Up_Chrome_Remote_Desktop_via_SSH___bz5aSAZR5q937d-k3eqcA)

### Pushing new code to the VM
1: Connect to the VM via Chrome remote desktop
2: ctrl + c to stop the running process
3: fetch the new changes
4: write npm start in the terminal to start the process again

* * *

#   

# Stop og start af Server via SSH(Terminal)

1. Gå igennem "Step 1" i "VM installation og setup" for at bruge terminalen for VM, hvor Teknisk Rapport server kører på.
2. Når du ankommer er du logget ind som mc1 bruger.
Du skal herefter navigere til Desktop ➝ Teknisk-rapport-v2 ➝ backend.
1. Indtast "pm2 list". Dette giver en liste over pm2 processer der har kørt og som kører.

Noter id for proces der har "status" = online.

2. Indtast "pm2 stop <id>".(indtast 1 i stedet for <id>, hvis process id er 1).
3. Processen kan startes igen ved at indtastes "pm2 start npm --name <navn> -- start".(<navn> udskiftes med ønskede navn for pm2 proces)

Info:
Hvis den nyeste version af git main skal hentes, indtastes følgende efter stop af proces: git pull
(Du skal være i stien for backend folderen for at kan gøre dette).
Herefter startes serveren som beskrevet ovenfor.

# Links
### The template sheet file that is used for the project:
[https://docs.google.com/spreadsheets/d/1Qg00wks98qvr4WQeg5dgSJ8XN4GDsl9hyOEz2gY8OXM/edit#gid=1950399164](https://docs.google.com/spreadsheets/d/1Qg00wks98qvr4WQeg5dgSJ8XN4GDsl9hyOEz2gY8OXM/edit#gid=1950399164)
### The template slide file that is used for the project:
[https://docs.google.com/presentation/d/1VFvgOd7E72vEJo8DXDfPN0Js6XqvVs50YMBlWdtmvMk/edit#slide=id.g2c4cc3260e8\_0\_42](https://docs.google.com/presentation/d/1VFvgOd7E72vEJo8DXDfPN0Js6XqvVs50YMBlWdtmvMk/edit#slide=id.g2c4cc3260e8_0_42)
###   

* * *

# Feedback and issues
[https://docs.google.com/presentation/d/18p06-rxvpCTyyi6cNhHVa1UYHUmQZ8APkp1WFlws1F4/edit#slide=id.g2da0dda6248\_0\_1](https://docs.google.com/presentation/d/18p06-rxvpCTyyi6cNhHVa1UYHUmQZ8APkp1WFlws1F4/edit#slide=id.g2da0dda6248_0_1)

* * *
