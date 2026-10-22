# Revendedora Pink — site completo com Painel ADM

Este projeto reúne o site público de cadastro, um painel administrativo, API e integração com Cloudflare D1.

## Importante antes de publicar
O projeto ainda exige configurar um banco D1 e dois secrets no Cloudflare. O arquivo `wrangler.toml` contém um marcador `SUBSTITUA_PELO_ID_DO_D1`, que precisa ser substituído pelo ID real do banco. Não publique antes de concluir essa configuração e testar.

## Configuração pelo Android

### 1. Criar banco D1
1. Entre em https://dash.cloudflare.com/.
2. Abra **Storage & databases / D1 SQL Database** (o nome pode variar na interface) e toque em **Create database**.
3. Use o nome `revendedora-pink-db`.
4. Abra o banco e copie o **Database ID**.
5. No GitHub, abra `wrangler.toml`, toque em editar e substitua `SUBSTITUA_PELO_ID_DO_D1` pelo ID copiado.

### 2. Enviar o projeto ao GitHub
1. Crie um repositório novo, por exemplo `revendedora-pink-admin`.
2. Extraia o ZIP no celular usando o gerenciador de arquivos.
3. Envie os arquivos e pastas do projeto para a raiz do repositório, incluindo `public`, `migrations`, `worker.js`, `wrangler.toml` e `package.json`.
4. No Cloudflare, abra **Workers & Pages** e crie/importar um Worker conectado ao repositório GitHub. Selecione a configuração Wrangler do repositório. O deploy usa `npm run deploy`.

### 3. Criar os secrets
No Worker publicado, abra **Settings > Variables and Secrets** e adicione como secrets:
- `ADMIN_PASSWORD`: uma senha administrativa forte e exclusiva.
- `SESSION_SECRET`: um segredo aleatório longo (pelo menos 32 bytes), diferente da senha administrativa.

Nunca coloque esses valores no código ou no GitHub.

### 4. Aplicar a tabela D1
Depois de configurar o Database ID e o binding `DB`, execute a migração no console do D1 usando o conteúdo de `migrations/0001_create_registrations.sql`, ou use o comando `npm run db:migrate` em um ambiente com Wrangler autenticado e o banco configurado.

### 5. Testar
- Abra o endereço do Worker e envie um cadastro fictício.
- Abra `/admin.html` e entre com a senha definida em `ADMIN_PASSWORD`.
- Confirme que o cadastro aparece e que consegue mudar o status.
- Confirme que a API administrativa não mostra dados sem sessão.

## O que inclui
- `public/index.html`: site público.
- `public/admin.html`: painel administrativo.
- `public/app.js`: formulário, envio para API e QR de referência.
- `worker.js`: API e sessão administrativa.
- `migrations/0001_create_registrations.sql`: tabela do D1.
- `wrangler.toml`: configuração de Worker, Assets e D1.

## Privacidade e segurança
O formulário coleta nome, e-mail e telefone opcional para contato, com consentimento. Não solicita senhas de contas, dados bancários ou códigos de segurança. O QR contém apenas um identificador aleatório, não os dados pessoais completos. O site é independente e não confirma vínculo oficial com a WePink. Antes de usar em produção, publique um aviso de privacidade claro e defina finalidade, retenção e canal de solicitações conforme a LGPD. Considere adicionar proteção contra spam e limitação de tentativas de login antes de uso público.
