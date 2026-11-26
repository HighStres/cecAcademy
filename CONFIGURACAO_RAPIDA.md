# cecAcademy — configuração rápida

## 1 · Google Drive
1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione um projeto e ative **Google Drive API** em **APIs e serviços → Biblioteca**.
2. Em **IAM e administrador → Contas de serviço**, crie uma conta de serviço. Abra-a e copie seu endereço de e-mail técnico.
3. Na conta de serviço, abra **Chaves → Adicionar chave → Criar nova chave → JSON**. Guarde o arquivo baixado em local seguro; ele contém uma chave privada. Se a criação de chaves estiver bloqueada pela organização, solicite ajuda ao administrador Google.
4. Abra a pasta [Ispin](https://drive.google.com/drive/folders/1YufBNInkKqIibzMsDZPkFksf3-eo9eTQ), clique em **Compartilhar**, adicione o e-mail técnico como **Leitor**. Não ative acesso público. A conta de serviço pode ler somente o que lhe for compartilhado.

## 2 · Cloudflare Pages
No [Cloudflare Dashboard](https://dash.cloudflare.com/) abra **Workers & Pages → Create application → Pages → Connect to Git**. Selecione o repositório do projeto. Escolha **None** em framework, deixe o comando de build vazio e informe **public** no diretório de saída. Salve e publique. O primeiro deploy ainda não terá acesso ao Drive ou login até os próximos passos.

## 3 · Dois Secrets
No projeto, abra **Settings → Variables and Secrets → Add**. Selecione **Secret**, configure em Production e salve:

**`CECA_CONFIG`** — cole um JSON neste formato, substituindo os textos entre sinais de menor e maior pelo usuário, senha inicial informada na conversa e chave exclusiva. Preserve aspas, vírgulas e chaves; se houver aspas ou barras invertidas na senha, elas devem ser escapadas segundo o formato JSON:

```json
{"username":"<usuario>","password":"<senha>","sessionSecret":"<chave-aleatoria-longa>","spinRootFolderId":"1YufBNInkKqIibzMsDZPkFksf3-eo9eTQ"}
```

Gere `sessionSecret` com um gerenciador de senhas confiável: pelo menos **43 caracteres aleatórios**, exclusivos e diferentes da senha. Não compartilhe essa chave. Como alternativa, uma pessoa técnica pode executar o gerador `node tools/gerar-chave.mjs` num terminal privado; ele cria uma chave de 32 bytes. Copie a saída diretamente para o Secret; não a salve no repositório. A credencial inicial foi fornecida na conversa e **não está pré-configurada**: insira-a no campo acima. Ela é curta e já foi exposta na conversa; substitua-a por uma senha longa e única **antes do uso institucional**.

**`GOOGLE_SERVICE_ACCOUNT_JSON`** — abra o JSON baixado no passo 1 e cole seu conteúdo completo neste Secret. Não cole esse conteúdo em chats ou no GitHub. Depois, apague a cópia local se não for mais necessária e mantenha a chave protegida.

## 4 · Publicar as configurações
Em **Deployments**, execute um novo deploy após salvar os Secrets. Use HTTPS. Para Preview, configure os Secrets separadamente somente se necessário, e restrinja o acesso a previews e ao domínio `pages.dev`.

## 5 · Utilizar
Abra o endereço publicado, entre com o usuário e senha definidos no Secret e selecione uma aula. **Atualizar biblioteca** consulta novamente o Drive, sem publicar o site. Os vídeos tocam no player próprio do cecAcademy, entregues pelo endpoint `/api/media` com a conta de serviço; não é preciso conta Google individual. Se o vídeo não abrir, use **Recarregar vídeo** e confira se a pasta continua compartilhada com a conta de serviço. Nenhuma permissão é alterada automaticamente.

**Alterar senha:** edite o JSON inteiro de `CECA_CONFIG` em Variables and Secrets, altere `password`, salve e faça novo deploy. Para invalidar todas as sessões já emitidas, substitua também `sessionSecret` por uma nova chave aleatória e publique novamente.

**Segurança:** o bloqueio básico de tentativas funciona apenas por instância e não impede ataques distribuídos. Antes do uso amplo, configure uma regra de limitação para `POST /api/login` em todos os endereços acessíveis (inclusive `pages.dev` e previews), ou restrinja esses endereços com Cloudflare Access. O logout apaga o cookie do navegador; uma cópia dele continua válida até expirar ou até a rotação de `sessionSecret`.
