import { TelegramClient } from '@/integrations/telegram/client';
import type { Env } from '@/shared/env';

export async function confirmRule(chatId: string, text: string, env: Env): Promise<void> {
  const ruleMatch = text.match(/^(\d+)\s*(.*)$/);
  if (!ruleMatch) return;

  const [, indexStr, overrideCategory] = ruleMatch;
  const index = indexStr || '';
  console.log(`Processing rule confirmation: index=${index}, override=${overrideCategory}`);

  const pendingJson = await env.GMAIL_RULES_KV.get('rules:pending');
  if (!pendingJson) {
    console.log('No pending rules found');
    return;
  }

  const pending = JSON.parse(pendingJson);
  const suggestion = pending[index];
  if (!suggestion) {
    console.log(`Invalid rule index: ${index}`);
    return;
  }

  let finalCategory = suggestion.suggestedCategory;
  let finalLabel = suggestion.suggestedLabel;

  if (overrideCategory) {
    finalLabel = overrideCategory.trim();
    finalCategory = overrideCategory
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u');
  }

  const learnedJson = await env.GMAIL_RULES_KV.get('rules:learned');
  const learned = learnedJson ? JSON.parse(learnedJson) : {};
  learned[suggestion.email] = {
    category: finalCategory,
    labelName: finalLabel,
    confirmedAt: new Date().toISOString(),
    source: 'ai_suggestion',
  };
  await env.GMAIL_RULES_KV.put('rules:learned', JSON.stringify(learned));

  delete pending[index];
  await env.GMAIL_RULES_KV.put('rules:pending', JSON.stringify(pending), {
    expirationTtl: 7 * 24 * 60 * 60,
  });

  const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN!);
  await telegram.sendMessage({
    chat_id: chatId,
    text: `✅ Regla guardada:\n<code>${suggestion.email}</code> → <b>${finalLabel}</b>`,
    parse_mode: 'HTML',
  });

  console.log(`Rule confirmed: ${suggestion.email} → ${finalCategory}`);
}
