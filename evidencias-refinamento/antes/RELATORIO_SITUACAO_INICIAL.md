# Diagnóstico inicial — antes de alterações desta tarefa

Data: 24/11/2026. Nenhum arquivo do projeto foi alterado durante esta bateria. Ponto de restauração: cecacademy-ponto-restauracao-antes.zip.

## Ambiente e limites
Chromium headless com emulação mobile em desktop, não é aparelho físico, Chrome Android, Safari iOS ou Samsung Internet. Login e catálogo da aplicação foram simulados; iframe apontou para aula real. Navegador não recebeu uma sessão Google configurada por nós; o fato de ter recebido a mídia nesta execução não prova permissões para outros visitantes nem justifica alterar compartilhamentos.

## Reprodução real
Em uma execução, clique no player da aula real Captação iniciou a mídia: readyState 4, largura de vídeo 640 px, paused=false e tempo avançando (~8 s após oito segundos); mídia via c.drive.google.com retornou 200. Em teste direto o tempo avançou 11,45 s. Não foi escutado áudio (ambiente sem dispositivo de áudio físico), embora muted=false e volume=1. Não comprova estabilidade, privacidade ou acesso de outros usuários. O evento load do iframe não prova reprodução.

## Velocidade real
No player nativo do Drive, em teste direto no mesmo Chromium, as opções reais 0,5; 0,75; 1; 1,25; 1,5; 1,75; 2 foram selecionadas. Em intervalos de ~2,4 segundos o tempo de mídia avançou respectivamente 1,20; 1,81; 2,39; 2,98; 3,59; 4,20; 4,81 segundos. Isso é evidência para esse vídeo e ambiente, não para todos os celulares. Playwright acessa internamente o frame para teste; o JavaScript de produção não pode controlar frames cross-origin.

## Responsividade e console
Em 320×568, 360×800, 390×844, 430×932, 768×1024, 1366×768, 1440×900 e 1920×1080: sem overflow horizontal detectado na página de aula; iframe medido em ~16:9; capturas home e mobile salvas neste diretório. Nenhum pageerror na execução. Um request csp.withgoogle.com apresentou ERR_BLOCKED_BY_ORB em uma execução; não evidencia bloqueio de vídeo. Não se reproduziu 403 ou ERR_ABORTED nesta bateria; as capturas fornecidas mostram um 403 anterior que continua sem causa conclusiva. CSP report-only não prova bloqueio; frame-src controla origem carregada, frame-ancestors quem pode incorporar um documento.

## Limitações e análise
O player é um iframe Google cross-origin; a aplicação não dispõe de controles próprios reais ou modo cinema, nem consegue inspecionar sua reprodução. O Drive forneceu controles nativos de play, pausa, ±10s, velocidade e tela cheia neste teste; seek e pausa não foram verificados efetivamente nesta bateria, nem áudio, orientação ou dispositivos físicos. Conclusão de causa do 403 não estabelecida. Google documenta files.get alt=media com Range, mas endpoint próprio precisaria Service Account autorizada, verificação do arquivo dentro do catálogo/raiz, proteção de sessão, resposta Range correta, quotas e testes reais. Tal proxy permitiria a qualquer usuário da aplicação ver mídias acessíveis à Service Account, independentemente de sua conta Google; é mudança de segurança e requer autorização explícita. Não há credenciais da Service Account em uso aqui para teste real do endpoint.

Fonte técnica: https://developers.google.com/workspace/drive/api/guides/manage-downloads
