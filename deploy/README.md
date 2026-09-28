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

## Verifica

```bash
curl -sI https://seomcp.contentisking.guru | grep -Ei "^(HTTP|strict-transport|content-security)"
```
