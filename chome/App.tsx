import {useEffect, useMemo, useState} from 'react';
import {cleanText} from '../src/core/engine';
import type {CleanedResult, SourceType} from '../src/core/types';
import {CopyButton} from '../src/components/ui/copy-button';
import {DownloadButton} from '../src/components/ui/download-button';
import {Eraser, FileText, History, RefreshCw, ScanText, Trash2} from 'lucide-react';

type Tab = 'raw' | 'cleaned' | 'markdown' | 'prompt';

type HistoryItem = {
  id: string;
  timestamp: number;
  rawText: string;
  preset: SourceType | 'auto';
  result: CleanedResult;
};

const HISTORY_KEY = 'text-cleaner-chrome-history';
const MAX_HISTORY_ITEMS = 25;

const presetOptions: Array<{value: SourceType | 'auto'; label: string}> = [
  {value: 'auto', label: 'Auto-detect'},
  {value: 'generic', label: 'Generic text'},
  {value: 'github_pr', label: 'GitHub pull request'},
  {value: 'github_issue', label: 'GitHub issue'},
  {value: 'docs', label: 'Documentation'},
  {value: 'article', label: 'Article'},
  {value: 'chat', label: 'Chat transcript'},
];

const sourceTypeLabels: Record<SourceType, string> = {
  generic: 'Generic text',
  github_pr: 'GitHub pull request',
  github_issue: 'GitHub issue',
  docs: 'Documentation',
  article: 'Article',
  chat: 'Chat transcript',
};

const sampleByPreset: Record<SourceType | 'auto', {text: string; preset: SourceType | 'auto'}> = {
  auto: {
    preset: 'auto',
    text: `Skip to content
Navigation Menu
Pull requests
Issues
# Fix the bug
This PR fixes the bug.
Files changed
1
Commits
2
Review
requested changes
Copy link
Quote reply
Terms
Privacy`,
  },
  generic: {
    preset: 'generic',
    text: `Menu
Sign in
Quarterly planning notes
We want a short summary of the current release risks and the mitigation plan.
Advertisement
More content follows here.
Footer
Terms`,
  },
  github_pr: {
    preset: 'github_pr',
    text: `Skip to content
Navigation Menu
Pull requests
Issues
# Fix the bug
This PR fixes the bug.
Files changed
1
Commits
2
Review
requested changes
Copy link
Quote reply
Terms
Privacy`,
  },
  github_issue: {
    preset: 'github_issue',
    text: `Skip to content
Repository navigation
Issues
# Crash in export flow
Open issue
Labels
bug
Assignees
No one assigned
The export flow crashes when a draft document contains emoji.
Comment
Terms
Privacy`,
  },
  docs: {
    preset: 'docs',
    text: `Documentation
Table of contents
On this page
# Deploying TextCleaner
Use the production build for GitHub Pages deployments.

## Build
Run npm run build to generate the dist directory.

Edit this page
Back to top
Was this page helpful?`,
  },
  article: {
    preset: 'article',
    text: `Latest
8 min read
# Why clean copied text before prompting
Clean input reduces irrelevant context and makes summaries more reliable.

Related articles
Sign up for our newsletter
Continue reading`,
  },
  chat: {
    preset: 'chat',
    text: `Messages
Jump to present
Today
John Doe 10:42 AM
Can you review the cleaned output before release?
Jane Smith 10:43 AM
Yes — please send the GitHub Pages URL when it is ready.
Reply in thread
Typing…`,
  },
};

function readHistory(): HistoryItem[] {
  const saved = localStorage.getItem(HISTORY_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch (error) {
    console.error('Failed to load extension history', error);
    return [];
  }
}

function saveHistory(nextHistory: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
}

async function readCurrentSelection() {
  if (!chrome?.tabs?.query || !chrome.scripting?.executeScript) {
    throw new Error('Chrome extension APIs are unavailable.');
  }

  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) {
    throw new Error('No active tab is available.');
  }

  const [injection] = await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      const selection = globalThis.getSelection?.()?.toString().trim();
      if (selection) {
        return selection;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement instanceof HTMLInputElement &&
          /^(?:email|search|tel|text|url)$/i.test(activeElement.type))
      ) {
        const selectionStart = activeElement.selectionStart ?? 0;
        const selectionEnd = activeElement.selectionEnd ?? 0;
        const {value} = activeElement;
        const selectedValue = value.slice(selectionStart, selectionEnd).trim();
        if (selectedValue) {
          return selectedValue;
        }
      }

      return '';
    },
  });

  return typeof injection?.result === 'string' ? injection.result : '';
}

export default function PopupApp() {
  const [rawText, setRawText] = useState('');
  const [preset, setPreset] = useState<SourceType | 'auto'>('auto');
  const [result, setResult] = useState<CleanedResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('raw');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isImportingSelection, setIsImportingSelection] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const persistHistory = (nextHistory: HistoryItem[]) => {
    setHistory(nextHistory);
    saveHistory(nextHistory);
  };

  const handleClean = async (textToClean: string = rawText) => {
    const text = textToClean.trim() ? textToClean : rawText;
    if (!text.trim()) {
      return;
    }

    setIsCleaning(true);
    setNotice(null);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const cleaned = cleanText({
      rawText: text,
      sourceTypeHint: preset === 'auto' ? undefined : preset,
    });

    setResult(cleaned);
    setActiveTab('cleaned');
    setIsCleaning(false);

    const nextHistory = [
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        rawText: text,
        preset,
        result: cleaned,
      },
      ...history,
    ].slice(0, MAX_HISTORY_ITEMS);

    persistHistory(nextHistory);
  };

  const handleReset = () => {
    setRawText('');
    setPreset('auto');
    setResult(null);
    setActiveTab('raw');
    setNotice(null);
  };

  const handleLoadSample = () => {
    const sample = sampleByPreset[preset];
    setRawText(sample.text);
    setNotice('Loaded a sample from the selected preset.');
  };

  const handleImportSelection = async () => {
    setIsImportingSelection(true);
    setNotice(null);

    try {
      const selection = await readCurrentSelection();
      if (!selection) {
        setNotice('No selected text was found on the current page.');
        return;
      }

      setRawText(selection);
      await handleClean(selection);
      setNotice('Imported the current page selection.');
    } catch (error) {
      console.error('Failed to import selected text', error);
      setNotice('Unable to read the current tab selection.');
    } finally {
      setIsImportingSelection(false);
    }
  };

  const handleTextareaPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    if (!pastedText) {
      return;
    }

    const target = event.target as HTMLTextAreaElement;
    const nextText =
      rawText.slice(0, target.selectionStart) +
      pastedText +
      rawText.slice(target.selectionEnd);

    setRawText(nextText);
    void handleClean(nextText);
    event.preventDefault();
  };

  const activeExport = useMemo(() => {
    if (activeTab === 'raw') {
      return {
        text: rawText,
        filename: 'raw-text.txt',
        extensionLabel: '.txt',
      };
    }

    if (activeTab === 'cleaned') {
      return {
        text: result?.cleanedText ?? '',
        filename: 'cleaned-text.txt',
        extensionLabel: '.txt',
      };
    }

    if (activeTab === 'markdown') {
      return {
        text: result?.markdownText ?? '',
        filename: 'formatted-content.md',
        extensionLabel: '.md',
      };
    }

    return {
      text: result?.llmPromptText ?? '',
      filename: 'llm-prompt.txt',
      extensionLabel: '.txt',
    };
  }, [activeTab, rawText, result]);

  return (
    <div className="w-[420px] min-h-[640px] bg-slate-950 text-slate-100">
      <div className="flex min-h-[640px] flex-col">
        <header className="border-b border-slate-800 bg-slate-900 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">TextCleaner</h1>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Chrome popup for cleaning copied text before pasting it into prompts, comments, or notes.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              aria-label="Reset popup"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleImportSelection}
              disabled={isImportingSelection}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ScanText className="h-4 w-4" />
              {isImportingSelection ? 'Reading…' : 'Import selection'}
            </button>
            <button
              onClick={handleLoadSample}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Sample
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="preset" className="text-xs font-medium text-slate-400">
              Preset
            </label>
            <select
              id="preset"
              value={preset}
              onChange={(event) => setPreset(event.target.value as SourceType | 'auto')}
              className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              {presetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleClean()}
              disabled={!rawText.trim() || isCleaning}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Eraser className="h-4 w-4" />
              {isCleaning ? 'Cleaning…' : 'Clean'}
            </button>
          </div>
        </header>

        <div className="border-b border-slate-800 px-2 pt-2">
          <div className="grid grid-cols-4 gap-1">
            {(['raw', 'cleaned', 'markdown', 'prompt'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-t-md px-2 py-2 text-xs font-medium capitalize transition ${
                  activeTab === tab
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 space-y-3 overflow-y-auto p-4">
          {notice ? (
            <div className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-100">
              {notice}
            </div>
          ) : null}

          <div className="space-y-2">
            <textarea
              value={
                activeTab === 'raw'
                  ? rawText
                  : activeTab === 'cleaned'
                    ? result?.cleanedText ?? ''
                    : activeTab === 'markdown'
                      ? result?.markdownText ?? ''
                      : result?.llmPromptText ?? ''
              }
              onChange={(event) => {
                if (activeTab === 'raw') {
                  setRawText(event.target.value);
                }
              }}
              onPaste={activeTab === 'raw' ? handleTextareaPaste : undefined}
              readOnly={activeTab !== 'raw'}
              placeholder={
                activeTab === 'raw'
                  ? 'Paste copied text here…'
                  : 'Cleaned output will appear here…'
              }
              className="min-h-[250px] w-full rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-xs leading-5 text-slate-100 outline-none"
            />

            <div className="flex flex-wrap items-center gap-2">
              <CopyButton
                text={activeExport.text}
                label={`Copy ${activeTab}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              />
              <DownloadButton
                content={activeExport.text}
                filename={activeExport.filename}
                label={`Save ${activeExport.extensionLabel}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              />
            </div>
          </div>

          {result ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
              <div className="flex flex-wrap gap-3">
                <span>
                  Detected: <span className="font-semibold text-slate-100">{sourceTypeLabels[result.detectedType]}</span>
                </span>
                <span>
                  Removed lines: <span className="font-semibold text-slate-100">{result.removedLineCount}</span>
                </span>
              </div>
              {result.warnings.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-200">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <History className="h-4 w-4" />
                Recent history
              </h2>
              {history.length ? (
                <button
                  onClick={() => persistHistory([])}
                  className="text-xs font-medium text-rose-300 hover:text-rose-200"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="space-y-2">
              {history.length ? (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setRawText(item.rawText);
                        setPreset(item.preset);
                        setResult(item.result);
                        setActiveTab('cleaned');
                        setNotice('Restored a recent cleanup.');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setRawText(item.rawText);
                          setPreset(item.preset);
                          setResult(item.result);
                          setActiveTab('cleaned');
                          setNotice('Restored a recent cleanup.');
                        }
                      }}
                      className="w-full cursor-pointer text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-100">
                            {sourceTypeLabels[item.result.detectedType]}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            persistHistory(history.filter((historyItem) => historyItem.id !== item.id));
                          }}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                          aria-label="Delete history item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-slate-300">
                        {item.rawText}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">
                  Cleaned selections and pasted text will appear here.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
