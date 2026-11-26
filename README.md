# cecAcademy

Portal existente com Pages Functions e Google Drive API v3. Não utiliza D1, KV, banco de dados ou servidor externo. Acesse [CONFIGURACAO_RAPIDA.md](CONFIGURACAO_RAPIDA.md) para configurar os dois Secrets e publicar. A pasta indicada no workspace é **Ispin**, ID `1YufBNInkKqIibzMsDZPkFksf3-eo9eTQ`; a inspeção anterior identificou dez categorias e 43 vídeos diretos. Nada foi alterado no Drive.

A interface em `public/` mantém o visual anterior. `functions/api/` contém os cinco endpoints; `lib/` implementa sessão e leitura do Drive. O catálogo é consultado na abertura e ao atualizar, sem cache externo e sem JSON público. O backend autentica uma Service Account com JWT RS256 via Web Crypto e escopo `drive.readonly`; percorre pastas recursivamente, lista vídeos por MIME com paginação e ignora lixeira e atalhos. Nomes de pastas originais são preservados e apenas os rótulos conhecidos são ajustados na interface. Sem rede ou autorização, o site mostra uma mensagem e permite tentar novamente. Requisições grandes podem atingir limites de subrequisições/execução do plano Cloudflare.

## Segredos
- `CECA_CONFIG`: JSON com `username`, `password`, `sessionSecret` (ao menos 32 caracteres, aleatório), `spinRootFolderId`. Não há credencial padrão no código. Gere chave com `node tools/gerar-chave.mjs` em local privado e copie diretamente ao Cloudflare. O usuário inicial informado pelo solicitante deve ser colocado pelo administrador no Secret; sua senha curta e já exposta deve ser trocada antes do uso amplo.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: JSON completo da conta de serviço; a pasta precisa estar compartilhada com o e-mail dessa conta como leitor. Não imprimir ou publicar a chave.

No Pages, use `public` como output e configure os dois Secrets em Settings → Variables and Secrets. `.dev.vars.example` não contém valores reais. Para desenvolvimento, use `npx wrangler pages dev public --compatibility-date 2025-04-01`, com `.dev.vars` preenchido localmente; não faça commit do arquivo. Não coloque JSON de credenciais em `public` ou no repositório. Os profissionais precisam de suas próprias permissões Google para assistir ao vídeo privado; o backend só lista metadados.

## Endpoints
`POST /api/login`, `POST /api/logout`, `GET /api/session`, `GET /api/catalog`, `POST /api/sync`, `GET /api/media?id=` (streaming com Range/206 para o player HTML5 móvel; ver [LEIA_PRIMEIRO_PILOTO.md](LEIA_PRIMEIRO_PILOTO.md) e [RELATORIO_PLAYER_MOBILE.md](RELATORIO_PLAYER_MOBILE.md)). Catálogo, sincronização e mídia exigem sessão; mutações verificam origem. Sessões HMAC expiram em oito horas e usam cookies HttpOnly, Secure e SameSite=Strict. Logout limpa o cookie do navegador, mas não revoga cópias; rotacionar `sessionSecret` revoga todas. Usuário compartilhado não permite identificar profissionais. Progresso e histórico são locais ao navegador.

A proteção de tentativas em memória é **aproximada por instância**, não coordenada globalmente, e não protege contra ataques distribuídos. Para utilização real, configure rate limiting do Cloudflare WAF para `POST /api/login` em todos os hosts acessíveis e proteja ou desative URLs de preview e pages.dev. Além disso, troque a senha inicial fraca. A aplicação não foi auditada.

## Testes
`npm test` executa testes de login, sessão, expiração e logout, proteção dos endpoints e Drive **simulado**, incluindo verificação criptográfica do JWT, paginação e subpastas. O conector do workspace não fornece credencial de Service Account para produção. Testes reais de conexão da Service Account, atualização de novo vídeo, reprodução com imagem e áudio, fullscreen, responsividade e deploy publicado requerem configuração e contas autorizadas; não foram confirmados neste ambiente.
