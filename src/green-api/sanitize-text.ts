const DISALLOWED_MESSAGE_CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

const DISALLOWED_STRICT_CTRL = /[\x00-\x1F\x7F]/;

export function hasDisallowedMessageControlChars(input: string): boolean {
  return DISALLOWED_MESSAGE_CTRL.test(input);
}

export function hasDisallowedStrictControlChars(input: string): boolean {
  return DISALLOWED_STRICT_CTRL.test(input);
}

export function isOnlyWhitespace(input: string): boolean {
  return input.trim().length === 0;
}
