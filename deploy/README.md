# Deploy della landing (seomcp.contentisking.guru)

La landing è statica: Nginx serve direttamente la cartella `site/` di questo repository sul server.
Per aggiornarla basta modificare i file (o `git pull`): non c'è build.

## Prima attivazione (serve sudo)

Prerequisito: il record DNS `A seomcp.contentisking.guru` deve puntare all'IP del server, con proxy Cloudflare **disattivato** (solo DNS).

```bash
sudo cp /home/datareport/seomcp/deploy/nginx-seomcp.contentisking.guru.conf /etc/nginx/sites-available/seomcp.contentisking.guru.conf
sudo ln -s /etc/nginx/sites-available/seomcp.contentisking.guru.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d seomcp.contentisking.guru --redirect
```

## Aggiornamento: attivare gli include (SSI)

Le pagine usano include lato server (`<!--#include virtual="/_partials/..." -->`).
Su un'installazione esistente, dove Certbot ha già modificato il file, aggiungi le due direttive senza ricopiare il file:

```bash
F=/etc/nginx/sites-available/seomcp.contentisking.guru.conf
sudo sed -i 's#^    index index.html;#    index index.html;\n    ssi on;#' $F
sudo sed -i 's#^    \# Mai servire file nascosti\.#    location /_partials/ { internal; }\n\n    \# Mai servire file nascosti.#' $F
sudo nginx -t && sudo systemctl reload nginx
```

## Aggiornamento: redirect e pagina 404

Redirect 301 e pagina 404 stanno in `deploy/nginx-seomcp-extra.conf`, generato dallo script. Va incluso una volta sola:

```bash
F=/etc/nginx/sites-available/seomcp.contentisking.guru.conf
sudo sed -i 's#^    ssi on;#    ssi on;\n    include /home/datareport/seomcp/deploy/nginx-seomcp-extra.conf;#' $F
sudo nginx -t && sudo systemctl reload nginx
```

Dopo ogni rigenerazione che cambia i redirect basta `sudo nginx -t && sudo systemctl reload nginx`.

## Pagine generate

Le guide in `site/installa/` e il partial `site/_partials/clients.html` si rigenerano con:

```bash
python3 scripts/build-site.py
```

## Verifica

```bash
curl -sI https://seomcp.contentisking.guru | grep -Ei "^(HTTP|strict-transport|content-security)"
```
