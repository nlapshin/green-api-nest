import { z } from 'zod';
import { CHAT_ID_REGEX, ID_INSTANCE_REGEX } from './char-patterns';
import {
  hasDisallowedMessageControlChars,
  hasDisallowedStrictControlChars,
  isOnlyWhitespace,
} from './sanitize-text';

const idInstanceSchema = z
  .string()
  .trim()
  .regex(ID_INSTANCE_REGEX, 'idInstance must contain only digits (5–20)');

const apiTokenInstanceSchema = z
  .string()
  .trim()
  .min(20, 'apiTokenInstance is too short')
  .refine(
    (s) => !hasDisallowedStrictControlChars(s),
    'apiTokenInstance must not contain control characters',
  );

const chatIdSchema = z
  .string()
  .trim()
  .regex(
    CHAT_ID_REGEX,
    'chatId must be 7–15 digits followed by @c.us or @g.us',
  );

const messageSchema = z
  .string()
  .trim()
  .min(1)
  .max(4096)
  .refine((s) => !isOnlyWhitespace(s), {
    message: 'message cannot be only whitespace',
  })
  .refine((s) => !hasDisallowedMessageControlChars(s), {
    message:
      'message must not contain control characters (newlines and tabs are allowed)',
  });

const optionalTrimmed = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (v === '' || v === undefined || v === null) return undefined;
    return v;
  }, schema.optional());

const fileUrlSchema = z.string().trim().superRefine((val, ctx) => {
  const lower = val.toLowerCase();
  if (
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('javascript:')
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'URL scheme is not allowed',
    });
    return;
  }

  let u: URL;
  try {
    u = new URL(val);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid URL',
    });
    return;
  }

  const protocol = u.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Only http and https URLs are allowed',
    });
    return;
  }

  if (!u.hostname || u.hostname.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'URL hostname is required',
    });
  }
});

const fileNameSchema = z
  .string()
  .trim()
  .max(255)
  .refine((s) => !s.includes('..'), 'fileName must not contain path traversal')
  .refine(
    (s) => !/[\\/]/.test(s),
    'fileName must not contain path separators',
  )
  .refine(
    (s) => !hasDisallowedStrictControlChars(s),
    'fileName must not contain control characters',
  );

const captionSchema = z
  .string()
  .trim()
  .max(1024)
  .refine(
    (s) => !hasDisallowedMessageControlChars(s),
    'caption must not contain disallowed control characters',
  );

export const getSettingsBodySchema = z
  .object({
    idInstance: idInstanceSchema,
    apiTokenInstance: apiTokenInstanceSchema,
  })
  .strict();

export const getStateInstanceBodySchema = z
  .object({
    idInstance: idInstanceSchema,
    apiTokenInstance: apiTokenInstanceSchema,
  })
  .strict();

export const sendMessageBodySchema = z
  .object({
    idInstance: idInstanceSchema,
    apiTokenInstance: apiTokenInstanceSchema,
    chatId: chatIdSchema,
    message: messageSchema,
  })
  .strict();

export const sendFileByUrlBodySchema = z
  .object({
    idInstance: idInstanceSchema,
    apiTokenInstance: apiTokenInstanceSchema,
    chatId: chatIdSchema,
    fileUrl: fileUrlSchema,
    fileName: optionalTrimmed(fileNameSchema),
    caption: optionalTrimmed(captionSchema),
  })
  .strict();

export type GetSettingsBody = z.infer<typeof getSettingsBodySchema>;
export type GetStateInstanceBody = z.infer<typeof getStateInstanceBodySchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
export type SendFileByUrlBody = z.infer<typeof sendFileByUrlBodySchema>;
