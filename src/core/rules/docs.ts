import { CleanupRuleSet } from '../types';
import { GenericRuleSet } from './generic';

export const DocsRuleSet: CleanupRuleSet = {
  name: 'Documentation',
  prefixExactLines: [
    ...GenericRuleSet.prefixExactLines,
    'Table of contents',
    'On this page',
    'Contents',
    'Search docs',
    'Search documentation',
    'Documentation',
  ],
  suffixExactLines: [
    ...GenericRuleSet.suffixExactLines,
    'Back to top',
    'Was this page helpful?',
    'Was this helpful?',
    'Edit this page',
    'Open on GitHub',
    'Copy page',
    'Previous',
    'Next',
  ],
  prefixRegexes: [
    ...GenericRuleSet.prefixRegexes,
    /^Breadcrumbs$/i,
    /^Version \d+(?:\.\d+)*$/i,
  ],
  suffixRegexes: [
    ...GenericRuleSet.suffixRegexes,
    /^Last updated .*$/i,
    /^Updated .* ago$/i,
  ],
  removeAnywhereExactLines: [
    ...GenericRuleSet.removeAnywhereExactLines,
    'Table of contents',
    'On this page',
    'Contents',
    'Edit this page',
    'Open on GitHub',
    'Copy page',
    'Back to top',
    'Previous',
    'Next',
    'Was this page helpful?',
    'Was this helpful?',
  ],
  removeAnywhereContains: [
    ...GenericRuleSet.removeAnywhereContains,
    'Edit this page',
    'Back to top',
    'Was this page helpful',
    'Ask AI',
  ],
  removeAnywhereRegexes: [
    /^Copy page$/i,
    /^\d+\s+min read$/i,
  ],
  preserveRegexes: [
    ...GenericRuleSet.preserveRegexes,
    /^\d+\.\s+/,
  ],
};
