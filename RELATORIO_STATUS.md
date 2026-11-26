# Estado da versão responsiva

Versão de trabalho, ainda não validada em produção. Ajustes no cabeçalho e busca móvel, menu, áreas de toque, quebra de títulos e contêiner 16:9; marcação de conclusão mantém o iframe, e próximas aulas seguem a sequência.

Testes Chromium com catálogo e iframe simulados em 320×568, 360×640, 375×812, 390×844, 768×1024, 1024×768, 1366×768 e 1920×1080: sem overflow horizontal detectado nas páginas inicial e aula; proporção aproximada 16:9; busca, tema e mudança de aula exercitados. Capturas em evidencias/ representam dados e player simulados. Testes de backend: 2 passaram, com Drive simulado.

Pendente: reprodução de vídeo real com conta Google autorizada, áudio, avanço, tela cheia, diagnóstico conclusivo do 403 e revisão visual completa. O aviso CSP report-only não comprova bloqueio. A Service Account não concede ao visitante permissão de reprodução; nenhum compartilhamento foi alterado. Não inserir credenciais em arquivos públicos. Consulte CONFIGURACAO_RAPIDA.md para os dois Secrets e substitua a senha inicial fraca antes do uso institucional.
