# PILOTO ISOLADO — NÃO PUBLICAR EM PRODUÇÃO AINDA

Este pacote é uma cópia de homologação; não substitui a versão aprovada. O player HTML5 só é ativado em telas até 950 px acessando a URL de preview com `?player=teste`. Sem esse parâmetro, permanece o player do Drive anterior. Desktop continua com o iframe. O piloto inclui botão para retornar ao player do Drive. Não altera arquivos ou compartilhamentos do Google Drive.

## Como testar em uma prévia
1. Suba este projeto em uma branch separada do GitHub (não `main`) e aguarde a Cloudflare criar o deploy Preview. Na raiz devem ficar `public`, `functions` e `lib`.
2. Confira no projeto Pages que os dois Secrets `CECA_CONFIG` e `GOOGLE_SERVICE_ACCOUNT_JSON` estão configurados também para o ambiente **Preview**, além da produção. Não copie segredos para o GitHub ou chat. Mantenha o mesmo sessionSecret se quiser preservar a sessão; rotação invalida sessões. A Service Account deve poder ler os vídeos e metadados da raiz configurada. Proteja a URL de preview contra acesso indevido.
3. Abra a URL específica do preview adicionando `?player=teste`. Entre normalmente e abra uma aula no celular. Toque play, pause, arraste a barra e teste ±15 segundos e o cinema. Teste tela horizontal, áudio e velocidades; volte para o Drive pelo botão caso ocorra erro. Se a URL já tiver parâmetros use `&player=teste`.
4. Não mescle em produção antes de testar uma aula real, acesso, seek HTTP 206, erros e regressão desktop em aparelhos reais. Para remover este piloto, não mescle a branch. A versão anterior continua no pacote de restauração.

## Segurança e acesso
O endpoint `/api/media` exige a sessão assinada, valida o ID e percorre os pais até a pasta raiz configurada antes de solicitar mídia. Encaminha Range ao Drive, retorna streaming sem buffer completo e não envia o token ao navegador. Resposta é private/no-store. O acesso é por conta de serviço: todos que tiverem sessão válida no CECAcademy podem acessar os vídeos descendentes da raiz que a conta puder ler, mesmo sem acesso Google individual (mudança autorizada). O recurso precisa de revisão de segurança, limites, custos/quotas e teste em produção simulada antes de uso amplo. Não há cache persistente; cada requisição Range consulta o Drive e autentica, portanto latência/quotas podem afetar o desempenho.

## Testes já feitos
- 3 testes backend passam; media, autenticação do Google, raiz e Range foram simulados. Foram testados sessão ausente, arquivo externo e Range múltiplo inválido.
- Chromium desktop com emulação de 390×844 e arquivo de vídeo **público de teste**, roteado localmente em vez do Drive: play, pause, barra, ajuste de playbackRate 1.5, limites de ±15, entrar e sair do cinema. O arquivo tinha apenas 5 s; não prova saltos exatos de 15 s no meio de uma aula.
- Não testados com a Service Account real, arquivo real via endpoint, áudio, 206 real, Safari iOS, Samsung Internet, Chrome Android físico, performance, qualidade, 403 e quota. Não se deve considerar o piloto validado.

Arquivos adicionados: `functions/api/media.js`, `tests/media.test.js`. Modificados nesta cópia: `lib/drive.js`, `public/assets/app.js`, `public/assets/style.css`. Sem banco, KV, credenciais novas ou serviços adicionais.
