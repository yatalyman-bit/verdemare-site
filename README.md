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
| About | `content/about/` | `A1.jpg`, `logo.jpg` |
| Partners | `content/partners/` | `P1.jpg` |

Per sostituire una foto basta caricarne una con lo stesso nome.

## Hotel
Ogni hotel in `data/hotels.yaml` ottiene il link `/book/<slug>/`, che apre WhatsApp con il nome dell'hotel già scritto. È il link da mettere nel QR del poster.

## Font
Norwester (Jamie Wilson) e Montserrat, licenza SIL OFL 1.1, ospitati sul sito (nessuna richiesta a Google).
