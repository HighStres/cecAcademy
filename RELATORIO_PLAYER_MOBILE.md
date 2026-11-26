# Relatório — player mobile do cecAcademy

Data: 26/11/2026. Escopo: player de vídeo no celular e modo cinema. O desktop não foi alterado.

## 1. Diagnóstico

### O que é do Google Drive e o que é do cecAcademy
- **Padrão atual (iframe):** o vídeo roda em `drive.google.com/file/d/<id>/preview`, outra origem. Play, barra, volume, velocidade e tela cheia dentro do vídeo são **controles nativos do Drive**. O JavaScript do cecAcademy não consegue ler nem alterar esses controles (bloqueio de origem cruzada). Por isso não há como deixá-los maiores ou mais fáceis de tocar no celular.
- **Do cecAcademy:** a moldura do player, os botões "Modo cinema" e "Recarregar vídeo", a barra do modo cinema ("Sair") e o layout da página.
- Para ter controles bons no celular, é preciso um player HTML5 próprio. Ele recebe o vídeo pela Function `/api/media`, que lê o Drive com a Service Account.

### Por que o piloto anterior não mostrou melhoria
| Causa | Situação |
|---|---|
| **Ativação.** O piloto só ligava com `?player=teste` na URL **e** tela ≤ 950 px no momento do carregamento. Sem o parâmetro, o site mostra o iframe do Drive, igual ao anterior. O parâmetro também se perdia ao abrir um link sem ele. | **Comprovado no código.** É a causa mais provável de "nada mudou". |
| **Controles do piloto.** Texto de 10 px, velocidade em `<select>` pequeno, barra e mensagens sempre por cima do vídeo, sem volume/mudo e sem ocultar controles. A barra fazia uma busca no Drive a cada movimento do dedo (`input`), o que deixa o arraste lento. | **Comprovado no código.** |
| **Desempenho do `/api/media`.** Cada requisição Range refazia a troca JWT→token no Google (assinatura RSA) e subia toda a cadeia de pastas (3 ou mais chamadas). O vídeo faz várias requisições Range, então havia latência alta a cada busca. | **Comprovado no código.** Corrigido. |
| **Arquivo inválido na biblioteca.** "BOAS VINDAS - ACADEMIA INSPIN.mp4" (Drive `1enV_6UG…`) é na verdade uma **imagem PNG** com extensão .mp4. Nenhum player HTML5 o reproduz. | **Comprovado** (arquivo baixado e analisado com ffprobe). |
| Secrets ausentes no ambiente **Preview**, pasta não compartilhada com a Service Account, ou branch/deploy errado. | **Sem causa conclusiva.** Não tive acesso ao painel Cloudflare (o conector exige autorização) nem à URL publicada. Não foi possível ver console, rede, status 206 ou erros reais da publicação. |

Outros dados verificados no Drive (pela conta conectada, só leitura): os 43 vídeos são `video/mp4`, de 0,3 a 290 MB, **sem restrição de download** (`downloadRestriction` vazio). A aula "MÉTODO VEER - Conclusões" (H.264 Main + AAC, 640×360, 3 min 6 s) tem o índice `moov` no início, o que é bom para streaming. A posição do `moov` nos arquivos grandes não foi verificada.

## 2. O que foi feito

### Player HTML5 móvel (`public/assets/player.js`, novo)
- Play/pausa central de 64 px, ±15 s em botões de 52 px, toque duplo nas laterais = ±15 s.
- Barra de progresso com área de toque de 30 px, mostra o trecho já carregado. Durante o arraste, o tempo é só pré-visualizado e a busca acontece ao soltar (uma requisição em vez de dezenas).
- Tempo atual / duração (h:mm:ss quando passar de 1 h).
- Velocidade 0,5x a 2x em um painel com botões de 44 px. A escolha é lembrada no aparelho.
- Mudo sempre visível. Controle deslizante de volume só aparece onde o navegador permite (o iOS não permite volume por script; nesse caso fica só o mudo).
- Controles somem 3 s depois de começar a tocar; um toque mostra de novo. Não há sobreposição: verificado em 320, 390 e 844 px.
- Mensagens claras: carregando, sessão expirada (com botão "Entrar novamente"), vídeo fora da biblioteca, sem permissão da conta de serviço, quota do Drive, arquivo incompatível e sem internet. Em todas há "Tentar novamente" e **Usar player do Google Drive**.
- "Recarregar vídeo" mantém a posição e o estado de reprodução.
- Ao trocar de tela, o vídeo é parado e o download interrompido.

### Modo cinema
- Com o player HTML5, o vídeo ocupa a tela inteira (`object-fit: contain`, sem deformar), em retrato e paisagem. A barra superior com "Sair" some junto com os controles.
- Usa a tela cheia do navegador quando disponível (inclusive `webkit` no iPad) e trava em paisagem quando o navegador permite (Android).
- Sem tela cheia de elemento (iPhone): fica o modo cinema em CSS e aparece um botão **Tela cheia** que abre a tela cheia nativa do iOS.
- Ao sair, o vídeo continua tocando na mesma posição e a rolagem da página é restaurada.
- O modo cinema do iframe (padrão) foi mantido como estava.

### Function `/api/media` (`functions/api/media.js`) e `lib/drive.js`
- Continua exigindo sessão válida, validando o ID e confirmando que o arquivo é `video/*` e descende da pasta raiz.
- Token OAuth reaproveitado na memória da instância até perto de expirar. A autorização de cada vídeo fica guardada por 10 min. Assim, as requisições Range seguintes fazem **uma** chamada ao Drive em vez de 4 ou 5. Nada é persistido: sem KV, banco ou cache de conteúdo.
- Streaming direto do corpo do Drive com `Range`, `206`, `Content-Range`, `Content-Length` e `Accept-Ranges`. `private, no-store`. O token nunca vai ao navegador.
- Erros do Drive traduzidos para mensagens úteis (quota → 429, permissão → 403, inexistente → 404, autenticação → 503), sem expor detalhes internos.
- O catálogo (`/api/catalog`) também se beneficia do token reaproveitado.

### Restante da interface móvel
Cabeçalho, menu, busca e "Próximas aulas" foram conferidos em 320 e 390 px: sem rolagem horizontal, botões de 44 px e cabeçalho cabendo em 320 px. **Nenhuma alteração foi necessária.**

## 3. Arquivos
- Novo: `public/assets/player.js`, `tools/servidor-local.mjs`, `RELATORIO_PLAYER_MOBILE.md`
- Alterados: `public/assets/app.js` (ativação, troca para o Drive, cinema com prefixos webkit, parar vídeo ao navegar), `public/assets/style.css` (bloco do piloto substituído pelo do player novo), `public/index.html` (carrega `player.js`), `functions/api/media.js`, `lib/drive.js` (cache do token), `tests/media.test.js`, `LEIA_PRIMEIRO_PILOTO.md`

## 4. Testes

Ambiente: Chrome 151 headless (Playwright) no Linux. Backend = **Functions reais** rodando em Node (`tools/servidor-local.mjs`) com a API do Google **simulada**, servindo **arquivos reais das aulas** baixados do Drive ("MÉTODO VEER - Conclusões", 6,8 MB, 3:06, e "BOAS VINDAS", o PNG). Celular = **emulação** (viewport 390×844 / 320×640, `isMobile` e toque). **Nenhum teste em aparelho físico.**

| Teste | Resultado |
|---|---|
| `npm test`: 13 testes (login/sessão/catálogo + 11 de mídia: 401, 206, reuso de token/autorização, fora da raiz, não-vídeo, 404, Range múltiplo, 416, quota 429, ID inválido, Service Account ausente) | APROVADO |
| Build das Functions pelo Cloudflare (`wrangler pages functions build`) | APROVADO |
| Reproduzir aula real (H.264/AAC) pelo `/api/media`, com áudio decodificado (`webkitAudioDecodedByteCount` subindo) | APROVADO (emulação) |
| Pausar (tempo para) e retomar | APROVADO (emulação) |
| +15 s (12,7 → 28,3) e −15 s (28,3 → 14,0) | APROVADO (emulação) |
| Toque duplo à direita/esquerda: +15 s / −15 s, com toque real | APROVADO (emulação) |
| Arrastar barra: prévia 1:33 sem buscar durante o arraste; ao soltar, vai para 1:34 | APROVADO (emulação) |
| Tempo atual/duração sincronizados (0:00 / 3:06) | APROVADO (emulação) |
| Velocidades 0,5; 0,75; 1; 1,25; 1,5; 1,75; 2 (playbackRate confirmado; a 2x avançou 4,0 s em 2 s) | APROVADO (emulação) |
| Mudo/som e volume 0,4 | APROVADO (emulação Chrome) |
| Requisições do navegador: `bytes=0-`, `bytes=1114112-` etc. → 206 com Content-Range | APROVADO (Drive simulado) |
| Ocultar controles após 3 s e reaparecer com toque | APROVADO (emulação) |
| Cinema retrato: vídeo centralizado 390×844, controles sem sobreposição, botões ≥ 44 px | APROVADO (emulação) |
| Cinema paisagem (844×390): vídeo em tela cheia sem deformar | APROVADO (emulação) |
| Sair do cinema: continua tocando, posição mantida, rolagem restaurada | APROVADO (emulação) |
| Cinema sem API de tela cheia (simulação de iPhone): modo CSS + botão Tela cheia nativa | APROVADO (simulação; não é iOS real) |
| Recarregar vídeo mantém posição e reprodução | APROVADO (emulação) |
| Arquivo PNG ".mp4": mensagem de formato incompatível + botão do Drive | APROVADO (emulação) |
| Sessão expirada durante a aula: mensagem e botão "Entrar novamente" | APROVADO (emulação) |
| Botão "Usar player do Google Drive" troca para o iframe | APROVADO (iframe simulado) |
| Celular sem ativação (`?player=drive`): iframe do Drive, como antes | APROVADO (emulação) |
| Regressão desktop 1024/1366/1920 (home e página da aula): comparação pixel a pixel com a versão original = **0 pixels diferentes** | APROVADO |
| Regressão home mobile 320/390 sem ativação: 0 pixels diferentes | APROVADO |
| Service Account real + Drive real + Cloudflare publicado (206 real, latência, 403, quota) | **NÃO TESTADO** (sem credenciais nem acesso ao painel) |
| iPhone / Safari iOS (incluindo tela cheia nativa e volume) | **NÃO TESTADO** |
| Chrome Android, Samsung Internet em aparelho físico | **NÃO TESTADO** |
| Áudio audível (ouvido humano) | **NÃO TESTADO** (só decodificação confirmada) |
| Trava de orientação em paisagem | **NÃO TESTADO** (o navegador headless não gira tela) |
| Aulas grandes (100–290 MB) e posição do `moov` nelas | **NÃO TESTADO** |
| Player do Drive dentro do iframe (conteúdo real do Google) | **NÃO TESTADO** (iframe simulado) |

## 5. Roteiro de teste em aparelho (prévia)
Faça em um iPhone (Safari) e em um Android (Chrome), em uma aula curta e em uma longa (> 100 MB):
1. Abra `URL-da-prévia/?player=teste`, entre e abra a aula.
2. Play → ouvir áudio. Pausar e retomar.
3. ±15 s pelos botões e com toque duplo nas laterais.
4. Arrastar a barra até o meio e soltar: deve continuar dali em poucos segundos.
5. Velocidades 0,5x e 2x. Mudo. Volume (só Android).
6. Modo cinema em retrato, girar para paisagem, sair: o vídeo continua no mesmo ponto.
7. No iPhone, dentro do cinema, tocar **Tela cheia** e voltar.
8. Recarregar vídeo. Sair e entrar de novo depois de 8 h (sessão expirada).
9. No computador: abrir a mesma prévia e confirmar que nada mudou.
Se algo falhar, anote aparelho, navegador, aula e a mensagem exibida.

## 6. Pendências reais antes de produção
1. **Testar na prévia com a Service Account real** e aulas reais, em iPhone e Android físicos (seção 5). Até lá, manter o padrão no iframe (já é o comportamento desta versão).
2. **Corrigir a aula "BOAS VINDAS - ACADEMIA INSPIN.mp4"**: é uma imagem PNG, não um vídeo. Substituir no Drive pelo vídeo correto (precisa ser feito pelo dono do arquivo).
3. **Quotas e custos:** cada visualização gera várias requisições à Function (cada busca/arraste = 1 requisição + 1 chamada ao Drive). No plano gratuito do Workers/Pages o limite é de 100 mil requisições por dia; a API do Drive tem limites por minuto e um limite não divulgado de download por arquivo (aparece como "quota do Drive" no player). Acompanhe em Cloudflare → Analytics e no Google Cloud Console → APIs → Drive API.
4. **Termos de uso da Cloudflare para vídeo:** servir vídeo através de Workers/Pages pode estar sujeito a regras específicas de conteúdo de vídeo nos termos da Cloudflare. Revise com quem administra a conta antes do uso amplo.
5. **Modelo de acesso:** com o player HTML5, quem tem sessão válida no cecAcademy assiste aos vídeos da raiz mesmo sem conta Google individual (mudança já autorizada). Logout não revoga cookies copiados; para revogar todos, troque o `sessionSecret`.
6. **Segurança já pendente:** rate limit no WAF para `POST /api/login`, proteger `*.pages.dev`/prévias com Cloudflare Access e trocar a senha inicial curta.
7. **Compatibilidade:** vídeos que não sejam H.264/AAC em MP4 podem não tocar em alguns aparelhos (o player mostra a mensagem e oferece o Drive). Vídeos com `moov` no fim do arquivo funcionam, mas demoram mais para começar.
8. A autorização de um vídeo fica guardada por até 10 min em cada instância: um vídeo movido para fora da biblioteca pode continuar acessível por esse tempo.
