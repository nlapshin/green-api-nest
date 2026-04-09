import type { SendFileByUrlBody, SendMessageBody } from './green-api.schemas';

export function toSendMessageUpstream(body: SendMessageBody): Record<string, string> {
  return {
    chatId: body.chatId,
    message: body.message,
  };
}

export function toSendFileByUrlUpstream(
  body: SendFileByUrlBody,
): Record<string, string> {
  const payload: Record<string, string> = {
    chatId: body.chatId,
    urlFile: body.fileUrl,
  };
  if (body.fileName) {
    payload.fileName = body.fileName;
  }
  if (body.caption) {
    payload.caption = body.caption;
  }
  return payload;
}
