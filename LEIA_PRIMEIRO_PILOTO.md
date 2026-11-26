# Player mobile — publicar primeiro em PRÉVIA

Esta versão **não muda nada para quem não ativar o teste**: desktop e celular continuam com o player do Google Drive (iframe), exatamente como na versão aprovada. O novo player HTML5 só aparece em telas de até 950 px **depois** de abrir o site uma vez com `?player=teste`. O relatório completo está em [RELATORIO_PLAYER_MOBILE.md](RELATORIO_PLAYER_MOBILE.md).

## Como ativar e desativar no aparelho
- Ativar: abra `https://SEU-PREVIEW/?player=teste`. O celular passa a lembrar a escolha (não precisa repetir o parâmetro nas próximas visitas).
- Desativar: abra `https://SEU-PREVIEW/?player=drive`.
- Em qualquer aula, o botão **Usar player do Google Drive** (menu de velocidade ou tela de erro) volta ao iframe só para aquela aula.

## Publicar em prévia (sem expor Secrets)
1. Crie uma branch nova no GitHub (ex.: `player-mobile`), **não** `main`, e envie estes arquivos. Na raiz devem ficar `public`, `functions`, `lib`. Não envie `.dev.vars`, JSON de conta de serviço nem a pasta `.wrangler`.
2. No Cloudflare: **Workers & Pages → projeto → Settings → Variables and Secrets**. Confira que `CECA_CONFIG` e `GOOGLE_SERVICE_ACCOUNT_JSON` existem também no ambiente **Preview** (eles são separados da Production). Se faltarem, adicione-os ali, como **Secret**, colando os valores direto no painel. Nunca no GitHub nem em chat.
3. Aguarde o deploy da branch em **Deployments** e copie a URL de prévia daquele deploy (algo como `https://player-mobile.SEU-PROJETO.pages.dev`).
4. Restrinja quem acessa a prévia (Cloudflare Access em `*.SEU-PROJETO.pages.dev` ou, no mínimo, não divulgar a URL).
5. No celular, abra a URL de prévia com `?player=teste`, entre e siga o roteiro de teste do relatório (seção "Roteiro de teste em aparelho").
6. Só depois de aprovar em aparelhos reais, faça o merge em `main`. Mesmo em produção o player novo continua desligado por padrão até cada pessoa abrir `?player=teste`.

## Teste local (sem Google, sem Secrets)
`node tools/servidor-local.mjs <pasta-com-mp4> [porta]` executa as Functions reais e simula só a API do Drive, servindo os MP4 da pasta com Range/206. Login local: usuário `teste-local`, senha `senha-local-teste` (apenas para esse servidor de teste). Abra `http://localhost:8788/?player=teste`.

## Para desfazer
Não faça merge da branch. Se já tiver feito, reverta o commit: o site volta ao player do Drive. Nada no Google Drive é alterado por esta versão.
