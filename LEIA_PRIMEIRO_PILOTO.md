# Player próprio + Google Drive como armazenamento — publicar primeiro em PRÉVIA

Nesta versão o **player HTML5 do cecAcademy é o único player das aulas**, no celular e no desktop. O Google Drive serve apenas como armazenamento: o navegador recebe o vídeo por `GET /api/media?id=…` (Pages Function), que autentica a Service Account, confere se o vídeo pertence à pasta raiz e repassa o conteúdo com `Range`/`206`. Não há iframe `/preview`, link "abrir no Drive" nem fallback para o player do Google.

## Pré-requisitos (já existentes, nada novo)
- Secrets `CECA_CONFIG` e `GOOGLE_SERVICE_ACCOUNT_JSON` no projeto Pages, **em Production e em Preview** (são separados).
- A pasta raiz (Ispin) compartilhada com o e-mail da Service Account como **Leitor**. **Sem isso nenhum vídeo toca**: o player mostra "Vídeo não encontrado ou não compartilhado com a conta de serviço".

## Publicar em prévia (sem expor Secrets)
1. Envie o projeto para uma branch nova no GitHub (ex.: `player-proprio`), **não** `main`. Não envie `.dev.vars`, JSON de conta de serviço nem `.wrangler`.
2. Cloudflare → Workers & Pages → projeto → **Settings → Variables and Secrets** → confira os dois Secrets no ambiente **Preview** (adicione-os ali como *Secret*, se faltarem).
3. Em **Deployments**, abra o deploy da branch e copie a URL de prévia.
4. Teste em celular e computador (roteiro no relatório). Restrinja o acesso à prévia (Cloudflare Access ou não divulgar a URL).
5. Só depois de aprovado, faça o merge em `main` (Production).

## Diagnóstico rápido na prévia (logado no site)
Abra no navegador `URL-DA-PREVIA/api/media?id=<ID-de-um-vídeo>`:
- vídeo começa a baixar/tocar → integração OK;
- `{"code":"not_found"}` → pasta não compartilhada com a Service Account ou ID errado;
- `{"code":"drive_auth"}` → Secret `GOOGLE_SERVICE_ACCOUNT_JSON` ausente/inválido nesse ambiente;
- `{"code":"session"}` → faça login primeiro;
- `{"code":"drive_quota"}` → limite do Google Drive; tente mais tarde.

## Executar localmente
- **Com o Drive real:** copie `.dev.vars.example` para `.dev.vars`, preencha só na sua máquina e rode `npx wrangler pages dev public --compatibility-date 2025-04-01`.
- **Sem credenciais (Drive simulado):** `node tools/servidor-local.mjs <pasta-com-mp4> [porta]` e abra `http://localhost:8788/`. Login local: `teste-local` / `senha-local-teste` (vale só para esse servidor de teste).
- Testes automáticos: `npm test`.

## Para desfazer
Não faça o merge da branch (ou reverta o commit). Nada no Google Drive é alterado por esta versão.
