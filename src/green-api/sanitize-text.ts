/** Control characters excluding common whitespace used in chat messages. */
/* eslint-disable no-control-regex -- intentional ASCII control detection */
const DISALLOWED_MESSAGE_CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/** All ASCII control characters + DEL. */
const DISALLOWED_STRICT_CTRL = /[\x00-\x1F\x7F]/;
/* eslint-enable no-control-regex */

export function hasDisallowedMessageControlChars(input: string): boolean {
  return DISALLOWED_MESSAGE_CTRL.test(input);
}

export function hasDisallowedStrictControlChars(input: string): boolean {
  return DISALLOWED_STRICT_CTRL.test(input);
}

export function isOnlyWhitespace(input: string): boolean {
  return input.trim().length === 0;
}
