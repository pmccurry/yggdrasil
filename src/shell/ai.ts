import { invoke } from '@tauri-apps/api/core';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function aiChatStream(
  requestId: string,
  providerType: string,
  apiEndpoint: string,
  apiKeyRef: string,
  model: string,
  messages: AiMessage[],
): Promise<void> {
  return invoke<void>('ai_chat_stream', {
    requestId,
    providerType,
    apiEndpoint,
    apiKeyRef,
    model,
    messages,
  });
}
