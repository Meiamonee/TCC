# Colocando o SuperPreço online (tudo gratuito)

| Parte | Onde | Por quê |
| --- | --- | --- |
| Site (React) | Cloudflare Pages | Hospeda os arquivos do site gratuitamente, com HTTPS. |
| Banco (MongoDB) | MongoDB Atlas Free | Cerca de 512 MB; o banco atual ocupa uns 40 MB. |
| API (Express) + coleta (Selenium + node-cron) | VM Oracle Cloud Always Free | Computador ligado 24 h, onde o Chrome e o agendador rodam como no ambiente local. |

```
Usuário ──HTTPS──> Cloudflare Pages (site)
   └──────HTTPS──> api.<ip>.sslip.io ─ Caddy ─> API Express :3001 ──> MongoDB Atlas
                                                 └─ node-cron ─> Selenium + Chromium ─> sites dos mercados
```

Faça as etapas na ordem. As senhas e chaves ficam só com você: nunca as coloque no git.

## 1. MongoDB Atlas

1. Crie a conta em <https://www.mongodb.com/cloud/atlas> e um cluster **Free**, na região **São Paulo** (AWS sa-east-1) se houver.
2. **Database Access**: crie um usuário com senha e permissão "Read and write to any database".
3. **Network Access**: libere o IP do seu computador, usado para copiar o banco. O IP da VM entra na etapa 3.
4. **Connect > Drivers**: copie a string `mongodb+srv://...`. Coloque o nome do banco antes do `?`:
   `mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/Mercados?retryWrites=true&w=majority`

## 2. Copiar o banco atual para o Atlas

Assim o histórico de preços já coletado vai junto. No seu computador, com o MongoDB local ligado, comece pela simulação, que só mostra o que seria copiado:

```bash
MONGODB_URI_ORIGEM=mongodb://localhost:27017/Mercados MONGODB_URI_DESTINO="<string do Atlas>" npm --prefix backend run copiar-banco
```

No PowerShell:

```powershell
$env:MONGODB_URI_ORIGEM='mongodb://localhost:27017/Mercados'; $env:MONGODB_URI_DESTINO='<string do Atlas>'; npm --prefix backend run copiar-banco
```

Se estiver tudo certo, rode de novo acrescentando `-- --substituir` ao final para copiar de verdade.

## 3. Máquina virtual na Oracle Cloud

1. Crie a conta em <https://www.oracle.com/cloud/free/>. O cartão é pedido só para verificação; os recursos *Always Free* não são cobrados.
2. **Compute > Instances > Create instance**:
   - **Image**: Canonical Ubuntu 24.04.
   - **Shape**: Ampere `VM.Standard.A1.Flex` com 2 OCPUs e 12 GB de memória. Fica dentro do gratuito, que vai até 4 OCPUs e 24 GB.
   - Se aparecer "out of capacity", tente outro *availability domain* ou mais tarde.
   - Baixe a chave SSH que a Oracle gera.
3. **Liberar HTTPS**: na sub-rede da VM, abra **Security List > Add Ingress Rules** e libere as portas TCP **80** e **443** para `0.0.0.0/0`.
4. Anote o **IP público** da VM e libere esse IP no **Network Access** do Atlas.
5. Entre na VM:

   ```bash
   ssh -i chave.key ubuntu@<IP>
   ```

6. Dê à VM acesso de leitura ao repositório, que é privado:
   - Rode `ssh-keygen -t ed25519` e depois `cat ~/.ssh/id_ed25519.pub`.
   - No GitHub, abra **TCC > Settings > Deploy keys > Add deploy key** e cole a chave. Deixe a escrita desmarcada.
7. Clone e instale:

   ```bash
   git clone git@github.com:Meiamonee/TCC.git && cd TCC
   bash deploy/oracle/instalar.sh
   ```

   Na primeira vez, o script cria o `backend/.env` a partir de `deploy/oracle/env.producao.exemplo` e para.

8. Edite o `.env` com `nano backend/.env`:
   - `MONGODB_URI`: a string do Atlas.
   - `CORS_ORIGIN`: o endereço do site no Pages (etapa 4; dá para ajustar depois).
   - `ADMIN_TOKEN`: gere com `openssl rand -hex 24`.

9. Rode `bash deploy/oracle/instalar.sh` de novo. No final ele mostra o endereço da API, no formato `https://api.<ip-com-traços>.sslip.io`.
10. Teste:
    - `curl https://api.<...>.sslip.io/api/health`
    - Uma coleta de verdade, acompanhando o log:

      ```bash
      npm --prefix backend run atualizar -- supervale
      ```

    - Faça o mesmo com `pedrilho`. O site do Pedrilho tem proteção contra robôs (Cloudflare) e pode tratar IPs de nuvem de forma diferente do IP de casa.

**Atualizar a VM depois de um push**: `cd TCC && bash deploy/oracle/instalar.sh`. Ele faz `git pull`, instala as dependências e reinicia.

**Comandos úteis**:
- `sudo systemctl status superpreco`: mostra se a API está no ar.
- `journalctl -u superpreco -f`: logs ao vivo, inclusive das coletas.
- `sudo systemctl restart superpreco`: reinicia a API.

## 4. Site no Cloudflare Pages

1. Crie a conta em <https://dash.cloudflare.com> e abra **Workers & Pages > Create > Pages > Connect to Git**. Escolha o repositório `TCC` e a branch `main`.
2. Configuração do build:

   | Campo | Valor |
   | --- | --- |
   | Framework preset | Vite (ou None) |
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

3. **Environment variables** (Production):
   - `VITE_API_URL` = `https://api.<ip-com-traços>.sslip.io/api`
   - `NODE_VERSION` = `22`
4. Faça o deploy. O site fica em `https://<nome>.pages.dev`. Esse endereço precisa estar no `CORS_ORIGIN` do `.env` da VM; depois de alterar, rode `sudo systemctl restart superpreco`.

O arquivo `frontend/public/_redirects` faz rotas como `/produto/123` abrirem o React em vez de dar erro 404. Cada push na `main` gera um novo deploy do site automaticamente.

## Custos e limites

- **Oracle Always Free**: gratuito enquanto ficar dentro dos limites (Ampere até 4 OCPUs e 24 GB, 200 GB de disco). Contas gratuitas sem uso por muito tempo podem ter a VM recuperada pela Oracle.
- **Atlas Free**: cerca de 512 MB e sem backups automáticos. O histórico cresce a cada coleta, então vale acompanhar o tamanho em **Atlas > Metrics**.
- **Cloudflare Pages**: gratuito para sites estáticos.
