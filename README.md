# Verdemare – sito

Sito statico fatto con [Hugo](https://gohugo.io) (open source). Va online da solo su Cloudflare Pages a ogni modifica salvata su GitHub.

## Modificare i testi
Da https://app.pagescms.org (accesso con GitHub): contatti, prezzi, hotel, testi delle pagine.

## Caricare le foto
Su GitHub: apri la cartella giusta → **Add file → Upload files** → trascina i JPEG (qualità massima, lato lungo almeno 2400 px). Hugo crea da solo le versioni leggere e toglie i dati GPS.

| Dove | Cartella | Nomi file |
|---|---|---|
| Home | `content/` | `H1.jpg` (hero), `H2.jpg` solo, `H3.jpg` coppia, `H4.jpg` gruppo, `V1.mp4` clip |
| Sessions | `content/sessions/` | `S1.jpg` |
| Real sessions | `content/real-sessions/<sessione>/` | `01.jpg`, `02.jpg`… in ordine; `01.jpg` è la copertina |
| Work | `content/work/<capitolo>/` | `01.jpg`, `02.jpg`… |
| About | `content/about/` | `A1.jpg` (apertura), `A2.jpg` (sezione del polpo); il logo è in `assets/logo.png` |
| Partners | `content/partners/` | `P1.jpg` |

Per sostituire una foto basta caricarne una con lo stesso nome.

## Font
Norwester (Jamie Wilson) e Montserrat, licenza SIL OFL 1.1, ospitati sul sito (nessuna richiesta a Google).

## Verdemare Desk (/desk/)
App per post, contatti, partner e commissioni. I dati stanno nel database Cloudflare D1 (binding `DB`) e si sincronizzano tra telefono e computer; sul dispositivo resta una copia per usarla offline.
Accesso: solo tramite Cloudflare Access (codice via email). Senza le variabili `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` Desk resta chiuso.

## Link degli hotel (/book/<id>/)
L'id è quello della struttura in Desk (sezione Partner). Il link apre WhatsApp con il nome della struttura già scritto e conta le scansioni (solo un numero al giorno, nessun dato personale).
