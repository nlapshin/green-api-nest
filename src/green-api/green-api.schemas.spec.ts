import {
  getSettingsBodySchema,
  sendFileByUrlBodySchema,
  sendMessageBodySchema,
} from './green-api.schemas';

const validToken = 'a'.repeat(24);

describe('green-api.schemas', () => {
  describe('chatId', () => {
    it('accepts valid personal chatId', () => {
      const r = sendMessageBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '79001234567@c.us',
        message: 'hello',
      });
      expect(r.success).toBe(true);
    });

    it('accepts valid group chatId', () => {
      const r = sendMessageBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '1234567890123@g.us',
        message: 'hi',
      });
      expect(r.success).toBe(true);
    });

    it('rejects wrong suffix', () => {
      const r = sendMessageBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '79001234567@wrong.us',
        message: 'x',
      });
      expect(r.success).toBe(false);
    });

    it('rejects too few digits', () => {
      const r = sendMessageBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '123456@c.us',
        message: 'x',
      });
      expect(r.success).toBe(false);
    });
  });

  describe('apiTokenInstance', () => {
    it('rejects short token', () => {
      const r = getSettingsBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: 'short',
      });
      expect(r.success).toBe(false);
    });

    it('rejects control characters in token', () => {
      const r = getSettingsBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: 'a'.repeat(19) + '\n',
      });
      expect(r.success).toBe(false);
    });
  });

  describe('sendMessage message', () => {
    it('rejects whitespace-only message', () => {
      const r = sendMessageBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '79001234567@c.us',
        message: '   \t  ',
      });
      expect(r.success).toBe(false);
    });
  });

  describe('sendFileByUrl', () => {
    it('rejects javascript: URL', () => {
      const r = sendFileByUrlBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '79001234567@c.us',
        fileUrl: 'javascript:alert(1)',
      });
      expect(r.success).toBe(false);
    });

    it('rejects file: URL', () => {
      const r = sendFileByUrlBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '79001234567@c.us',
        fileUrl: 'file:///etc/passwd',
      });
      expect(r.success).toBe(false);
    });

    it('rejects path traversal in fileName', () => {
      const r = sendFileByUrlBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        chatId: '79001234567@c.us',
        fileUrl: 'https://example.com/a.pdf',
        fileName: '../../etc/passwd',
      });
      expect(r.success).toBe(false);
    });
  });

  describe('strict object', () => {
    it('rejects unknown fields on getSettings', () => {
      const r = getSettingsBodySchema.safeParse({
        idInstance: '123456',
        apiTokenInstance: validToken,
        extra: 1,
      });
      expect(r.success).toBe(false);
    });
  });
});
