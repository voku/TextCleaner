import { CleanupRuleSet } from '../types';
import { GenericRuleSet } from './generic';

export const ArticleRuleSet: CleanupRuleSet = {
  name: 'Article',
  prefixExactLines: [
    ...GenericRuleSet.prefixExactLines,
    'Latest',
    'Trending',
    'Recommended',
    'More stories',
  ],
  suffixExactLines: [
    ...GenericRuleSet.suffixExactLines,
    'Related articles',
    'Continue reading',
    'Read next',
    'More stories',
  ],
  prefixRegexes: [
    ...GenericRuleSet.prefixRegexes,
    /^\d+\s+min read$/i,
  ],
  suffixRegexes: [
    ...GenericRuleSet.suffixRegexes,
    /^Published .*$/i,
    /^Updated .*$/i,
  ],
  removeAnywhereExactLines: [
    ...GenericRuleSet.removeAnywhereExactLines,
    'Related articles',
    'Continue reading',
    'Read next',
    'More stories',
    'Recommended',
  ],
  removeAnywhereContains: [
    ...GenericRuleSet.removeAnywhereContains,
    'Sign up for our newsletter',
    'Follow us',
    'Listen to this article',
    'Related articles',
  ],
  removeAnywhereRegexes: [
    /^\d+\s+min read$/i,
  ],
  preserveRegexes: [
    ...GenericRuleSet.preserveRegexes,
    /^\d+\.\s+/,
  ],
};
