# 2. Modo Escuta

Implemente worker/ingest/whatsapp.ts com o whatsapp-web.js oficial (LocalAuth, QR no terminal), ativo só quando WORKER_ROLES inclui listen. Na primeira conexão, liste todos os chats e canais, classifique como fonte sugerida o que tem nome de promoção ou mais de 30% das últimas 50 mensagens com preço e link, salve em sources e escute só as confirmadas na aba Fontes. Grave cada mensagem em raw_messages e emita um evento. Faça o mesmo para o grupo de Telegram em worker/ingest/telegram.ts com GramJS. Somente leitura: nunca envie nada.
Pronto quando: uma mensagem nova num grupo escolhido aparece no banco em menos de 5 s.
