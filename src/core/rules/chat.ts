import { CleanupRuleSet } from '../types';
import { GenericRuleSet } from './generic';

export const ChatRuleSet: CleanupRuleSet = {
  name: 'Chat',
  prefixExactLines: [
    ...GenericRuleSet.prefixExactLines,
    'Messages',
    'Jump to present',
    'New messages',
    'Thread',
  ],
  suffixExactLines: [
    ...GenericRuleSet.suffixExactLines,
    'Type a message',
    'Reply in thread',
    'Add reaction',
    'Seen',
    'Delivered',
  ],
  prefixRegexes: [
    ...GenericRuleSet.prefixRegexes,
    /^new messages?$/i,
  ],
  suffixRegexes: [
    ...GenericRuleSet.suffixRegexes,
    /^Typing(?:\.\.\.|…)?$/i,
  ],
  removeAnywhereExactLines: [
    ...GenericRuleSet.removeAnywhereExactLines,
    'Reply in thread',
    'Add reaction',
    'Seen',
    'Delivered',
    'Typing…',
    'Typing...',
  ],
  removeAnywhereContains: [
    ...GenericRuleSet.removeAnywhereContains,
    'joined the channel',
    'left the channel',
    'started a call',
    'missed a call',
  ],
  removeAnywhereRegexes: [
    /^Today$/i,
    /^Yesterday$/i,
  ],
  preserveRegexes: [
    ...GenericRuleSet.preserveRegexes,
    /^\[?\d{1,2}:\d{2}(?:\s*[AP]M)?\]?\s*[\w\s.-]+:/i,
    /^[\w\s.-]+\s+\d{1,2}:\d{2}\s*[AP]M$/i,
  ],
};
