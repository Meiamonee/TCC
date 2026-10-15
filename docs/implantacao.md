# SuperPreço online (tudo gratuito)

| Parte | Onde | Endereço / configuração |
| --- | --- | --- |
| Site (React) | Cloudflare Pages | https://superpreco.pages.dev |
| API (Express) | Render, plano grátis | https://superpreco-api.onrender.com (`render.yaml`) |
| Banco (MongoDB) | MongoDB Atlas Free, AWS São Paulo | projeto SuperPreco, Cluster0, banco `Mercados` |
| Coleta (Selenium + Chrome) | GitHub Actions | `.github/workflows/coleta.yml`, às 6h e 18h (Brasília) |

```
Usuário ──HTTPS──> Cloudflare Pages (site estático)
   └──────HTTPS──> Render: API Express ──> MongoDB Atlas
GitHub Actions (6h/18h): Selenium + Chrome ─> sites dos mercados ─> importação ─> MongoDB Atlas
```

Cada push na branch `main` publica de novo o site (Pages) e a API (Render) automaticamente.

## Por que essa divisão

- **Cloudflare Pages**: hospeda o site estático (`frontend/dist`) com HTTPS.
- **API fora do Cloudflare Workers**: o plano grátis do Workers dá 10 ms de CPU por requisição e 128 MB de memória, o que não comporta a comparação sobre ~27 mil produtos. O Render roda o Express + Mongoose sem mudanças.
- **Coleta fora do Render**: o plano grátis do Render não tem Chrome. O GitHub Actions oferece máquinas Linux com Chrome e é gratuito sem limite de minutos para repositórios públicos.
- **node-cron**: continua no projeto e agenda a coleta quando a API roda numa máquina própria (`SCHEDULER_ENABLED`). No Render ele fica desligado e o agendamento na nuvem é feito pelo `schedule` do GitHub Actions.

## Configuração

### MongoDB Atlas

- **Projeto `SuperPreco`**: cluster Free, AWS São Paulo (sa-east-1).
- **Usuário do banco**: `pedrolsouzafaria_db_user`. A senha fica só no `backend/.env.atlas` (fora do git), no Render e nos segredos do GitHub.
- **Network Access**: `0.0.0.0/0`, porque o Render grátis e o GitHub Actions não têm IP fixo. O acesso continua protegido por usuário e senha.

### Render (API)

Criado em **New > Blueprint** a partir do `render.yaml`:
- pasta `backend`, `npm install --omit=dev`, `node server.js`;
- verificação de saúde em `/api/health`;
- região Virgínia.

Variáveis de ambiente:
- `MONGODB_URI`: definida no painel do Render.
- `CORS_ORIGIN`: `https://superpreco.pages.dev`.
- `SCHEDULER_ENABLED`: `false`.

No plano grátis a API "dorme" após 15 minutos sem uso. O primeiro acesso depois disso pode levar perto de 1 minuto.

### Cloudflare Pages (site)

| Campo | Valor |
| --- | --- |
| Repositório / branch | `Meiamonee/TCC` / `main` |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output | `dist` |
| `VITE_API_URL` | `https://superpreco-api.onrender.com/api` |
| `NODE_VERSION` | `22` |

O arquivo `frontend/public/_redirects` faz rotas como `/produto/123` abrirem o React.

### GitHub Actions (coleta)

- **Horário**: `0 9,21 * * *` em UTC, que equivale a 6h e 18h em Brasília.
- **Execução**: um job por supermercado, em paralelo; a falha de um mercado não afeta os outros.
- **Segredo `MONGODB_URI`**: em **Settings > Secrets and variables > Actions**.
- **Coleta manual**: aba **Actions > Coleta de precos > Run workflow**, informando um mercado ou `todos`.
- **Proteção**: se uma coleta trouxer menos de 60% dos produtos que o mercado tinha, nada é marcado como indisponível (`coletaIncompleta`).

## Tarefas comuns

**Copiar o banco local para o Atlas.** Use `--substituir` para gravar; sem ele, o script só simula:

```bash
MONGODB_URI_ORIGEM=mongodb://localhost:27017/Mercados MONGODB_URI_DESTINO="<string do Atlas>" DNS_SERVERS=1.1.1.1,8.8.8.8 npm --prefix backend run copiar-banco -- --substituir
```

`DNS_SERVERS` só é necessário no Windows, quando aparece o erro `querySrv ECONNREFUSED`.

**Rodar localmente contra o Atlas**: no `backend/.env`, defina `MONGODB_URI` com a string do Atlas e `DNS_SERVERS=1.1.1.1,8.8.8.8`.

## Alternativa: servidor próprio

A pasta `deploy/oracle/` tem um instalador para rodar API + coleta + node-cron numa máquina Linux ligada 24 h (por exemplo, Oracle Cloud Always Free). Inclui Chromium, Caddy com HTTPS e serviço systemd. Não está em uso.
