import { CleanupRuleSet } from '../types';

export const GenericRuleSet: CleanupRuleSet = {
  name: 'Generic',
  prefixExactLines: [
    'Skip to content',
    'Sign in',
    'Home',
    'Pricing',
    'Search',
    'Docs',
    'Menu',
    'Navigation',
    'Log in',
    'Sign up',
    'Register',
    'Contact us',
    'About',
    'Blog',
    'Support',
    'FAQ',
  ],
  suffixExactLines: [
    'Terms',
    'Privacy',
    'Contact',
    'Footer',
    'About us',
    'Careers',
    'Cookie Policy',
    'All rights reserved',
    'Terms of Service',
    'Privacy Policy',
    'Sitemap',
    'Help Center',
  ],
  prefixRegexes: [
    /^Sign up for free$/i,
    /^Log in$/i,
  ],
  suffixRegexes: [
    /^\u00A9 \d{4} .*$/i, // Copyright lines
  ],
  removeAnywhereExactLines: [
    'Advertisement',
    'Share this article',
    'Tweet',
    'Share on Facebook',
    'Share on LinkedIn',
    'Pin it',
    'Email',
    'Print',
    'Subscribe',
    'Leave a comment',
  ],
  removeAnywhereContains: [
    'Subscribe to our newsletter',
    'Join our mailing list',
    'Enter your email',
  ],
  preserveRegexes: [
    /^#+ /, // Headings
    /^- /, // Bullets
    /^\* /, // Bullets
    /^> /, // Blockquotes
    /^```/, // Code blocks
  ],
};
