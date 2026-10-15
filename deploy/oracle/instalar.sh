#!/usr/bin/env bash
# Prepara uma maquina virtual Ubuntu 24.04 (Oracle Cloud Always Free) para rodar o SuperPreco:
# Node.js, Chromium + ChromeDriver (Selenium), Caddy (HTTPS) e o servico da API com a coleta.
#
# Uso, dentro da pasta do projeto ja clonada na VM:
#   bash deploy/oracle/instalar.sh
# Pode ser executado de novo para atualizar (git pull + npm install + reinicio).
set -euo pipefail

PROJETO="$(cd "$(dirname "$0")/../.." && pwd)"
USUARIO="$(whoami)"
IP_PUBLICO="$(curl -fsS https://api.ipify.org || true)"

echo "==> Projeto em $PROJETO (usuario $USUARIO, IP publico ${IP_PUBLICO:-desconhecido})"

echo "==> Pacotes do sistema"
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates gnupg git software-properties-common debian-keyring debian-archive-keyring apt-transport-https netfilter-persistent iptables-persistent

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
    echo "==> Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v chromedriver >/dev/null; then
    echo "==> Chromium e ChromeDriver (pacotes .deb, sem snap, para ARM e x86)"
    sudo add-apt-repository -y ppa:xtradeb/apps
    sudo apt-get update -y
    sudo apt-get install -y chromium chromium-driver fonts-liberation
fi

if ! command -v caddy >/dev/null; then
    echo "==> Caddy (proxy com HTTPS automatico)"
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y caddy
fi

echo "==> Liberando as portas 80 e 443 no firewall da VM"
# As imagens Ubuntu da Oracle bloqueiam tudo menos a porta 22 no iptables.
for porta in 80 443; do
    if ! sudo iptables -C INPUT -p tcp --dport "$porta" -m state --state NEW -j ACCEPT 2>/dev/null; then
        sudo iptables -I INPUT 6 -p tcp --dport "$porta" -m state --state NEW -j ACCEPT
    fi
done
sudo netfilter-persistent save

echo "==> Dependencias do projeto"
cd "$PROJETO"
git pull --ff-only || true
npm --prefix backend install --omit=dev
npm --prefix scraper install --omit=dev

if [ ! -f backend/.env ]; then
    cp deploy/oracle/env.producao.exemplo backend/.env
    echo "!! Criei backend/.env a partir do exemplo. Edite-o (MONGODB_URI, CORS_ORIGIN, ADMIN_TOKEN) e rode o script de novo."
    exit 1
fi

echo "==> Servico da API (reinicia sozinho e sobe junto com a VM)"
sed -e "s|__USUARIO__|$USUARIO|g" -e "s|__PROJETO__|$PROJETO|g" deploy/oracle/superpreco.service \
    | sudo tee /etc/systemd/system/superpreco.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable superpreco
sudo systemctl restart superpreco

if [ -n "$IP_PUBLICO" ]; then
    DOMINIO="api.${IP_PUBLICO//./-}.sslip.io"
    echo "==> HTTPS em https://$DOMINIO"
    sed "s|__DOMINIO__|$DOMINIO|g" deploy/oracle/Caddyfile | sudo tee /etc/caddy/Caddyfile >/dev/null
    sudo systemctl reload caddy || sudo systemctl restart caddy
fi

echo
echo "Pronto. Confira:"
echo "  sudo systemctl status superpreco      # API e coleta"
echo "  journalctl -u superpreco -f           # logs ao vivo"
echo "  curl https://${DOMINIO:-<dominio>}/api/health"
