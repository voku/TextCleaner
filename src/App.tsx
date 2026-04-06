import React, { useState, useEffect } from 'react';
import { CleanedResult, SourceType } from './core/types';
import { cleanText } from './core/engine';
import engineCode from './core/engine.ts?raw';
import genericRulesCode from './core/rules/generic.ts?raw';
import githubRulesCode from './core/rules/github.ts?raw';
import { RefreshCw, Eraser, FileText, Loader2, Clock, X, Trash2, Code2, Smartphone } from 'lucide-react';
import { CopyButton } from './components/ui/copy-button';
import { DownloadButton } from './components/ui/download-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';

type Tab = 'raw' | 'cleaned' | 'markdown' | 'prompt';

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

interface HistoryItem {
  id: string;
  timestamp: number;
  rawText: string;
  preset: SourceType | 'auto';
  result: CleanedResult;
}

export default function App() {
  const [rawText, setRawText] = useState('');
  const [preset, setPreset] = useState<SourceType | 'auto'>('auto');
  const [result, setResult] = useState<CleanedResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('raw');
  const [isCleaning, setIsCleaning] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('text-cleaner-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('text-cleaner-history', JSON.stringify(newHistory));
  };

  const handleClean = async (textToClean: string | React.MouseEvent = rawText) => {
    const text = typeof textToClean === 'string' ? textToClean : rawText;
    if (!text.trim()) return;
    
    setIsCleaning(true);
    
    // Brief delay to ensure the loading state is visible to the user
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let sourceTypeHint: SourceType | undefined = preset === 'auto' ? undefined : preset;
    
    const res = cleanText({ rawText: text, sourceTypeHint });
    setResult(res);
    setActiveTab('cleaned');
    setIsCleaning(false);

    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      rawText: text,
      preset,
      result: res
    };
    const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50
    saveHistory(updatedHistory);
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;
    
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const newText = rawText.substring(0, start) + pastedText + rawText.substring(end);
    
    setRawText(newText);
    handleClean(newText);
    e.preventDefault();
  };

  const handleReset = () => {
    setRawText('');
    setResult(null);
    setActiveTab('raw');
    setPreset('auto');
  };

  const handlePasteSample = () => {
    const sample = sampleByPreset[preset];
    setRawText(sample.text);
    setPreset(sample.preset);
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    setRawText(item.rawText);
    setPreset(item.preset);
    setResult(item.result);
    setActiveTab('cleaned');
    setIsHistoryOpen(false);
  };

  const deleteHistoryItem = (id: string) => {
    saveHistory(history.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  let activeText = '';
  let activeFilename = '';
  let activeExtension = '';
  
  if (activeTab === 'raw') {
    activeText = rawText;
    activeFilename = 'raw-text.txt';
    activeExtension = '.txt';
  } else if (result) {
    if (activeTab === 'cleaned') {
      activeText = result.cleanedText;
      activeFilename = 'cleaned-text.txt';
      activeExtension = '.txt';
    } else if (activeTab === 'markdown') {
      activeText = result.markdownText;
      activeFilename = 'formatted-content.md';
      activeExtension = '.md';
    } else if (activeTab === 'prompt') {
      activeText = result.llmPromptText;
      activeFilename = 'llm-prompt.txt';
      activeExtension = '.txt';
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex items-center justify-between space-y-0 text-center sm:text-left">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Text Cleaner</h1>
              <p className="text-gray-500">Clean noisy text from GitHub, docs, articles, and chat before sending it to an LLM.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href="https://github.com/voku/TextCleaner/releases/tag/android-latest"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  aria-label="Download Android app"
                >
                  <Smartphone className="w-4 h-4" />
                  Get the Android app
                </a>
                <span className="text-sm text-gray-500 hidden sm:inline">
                  Same cleaning engine — works fully offline, no browser needed.
                </span>
                <a
                  href="https://github.com/voku/TextCleaner/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                >
                  Contribute on GitHub
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setIsCodeOpen(true)} 
                    className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    aria-label="View cleanup logic"
                  >
                    <Code2 className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View cleanup logic</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setIsHistoryOpen(true)} 
                    className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    aria-label="Open history"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View local history</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <label htmlFor="preset" className="text-sm font-medium text-gray-700 whitespace-nowrap">Preset:</label>
                <select
                  id="preset"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as SourceType | 'auto')}
                  className="block w-full lg:w-48 rounded-md border-gray-300 py-2 pl-3 pr-10 text-gray-900 focus:ring-2 focus:ring-indigo-600 sm:text-sm border transition-shadow"
                  aria-label="Select parsing preset"
                >
                  {presetOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handlePasteSample}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      aria-label="Paste sample text"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Sample</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Load a sample for the selected preset</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleReset}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      aria-label="Reset all fields"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear text and results</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleClean}
                      disabled={!rawText.trim() || isCleaning}
                      className="inline-flex flex-1 sm:flex-none justify-center items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Clean the text"
                    >
                      {isCleaning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eraser className="w-4 h-4" />
                      )}
                      {isCleaning ? 'Cleaning...' : 'Clean Text'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove UI noise from the raw text</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex min-w-full" aria-label="Tabs">
                {(['raw', 'cleaned', 'markdown', 'prompt'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-[100px] py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                      activeTab === tab
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50/30'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={activeTab === tab ? 'page' : undefined}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 bg-gray-50 flex-1 flex flex-col min-h-[500px]">
              {activeTab === 'raw' && (
                <div className="flex-1 relative flex flex-col group">
                  <label htmlFor="raw-text" className="sr-only">Raw Text Input</label>
                  <textarea
                    id="raw-text"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    onPaste={handleTextareaPaste}
                    placeholder="Paste noisy text here... (auto-cleans on paste)"
                    className="flex-1 w-full p-4 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-y font-mono text-sm shadow-inner"
                    aria-label="Raw Text Input"
                  />
                  {rawText && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-2">
                      <CopyButton 
                        text={rawText} 
                        iconOnly 
                        tooltipText="Copy raw text"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Copy raw text"
                      />
                      <DownloadButton 
                        content={rawText} 
                        filename="raw-text.txt"
                        iconOnly 
                        tooltipText="Download raw text"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Download raw text"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'cleaned' && (
                <div className="flex-1 relative flex flex-col group">
                  <label htmlFor="cleaned-text" className="sr-only">Cleaned Text Output</label>
                  <textarea
                    id="cleaned-text"
                    readOnly
                    value={result?.cleanedText || ''}
                    placeholder="Cleaned text will appear here..."
                    className="flex-1 w-full p-4 rounded-md border border-gray-300 bg-white resize-y font-mono text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    aria-label="Cleaned Text Output"
                  />
                  {result && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-2">
                      <CopyButton 
                        text={result.cleanedText} 
                        iconOnly 
                        tooltipText="Copy cleaned text"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Copy cleaned text"
                      />
                      <DownloadButton 
                        content={result.cleanedText} 
                        filename="cleaned-text.txt"
                        iconOnly 
                        tooltipText="Download cleaned text"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Download cleaned text"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'markdown' && (
                <div className="flex-1 relative flex flex-col group">
                  <label htmlFor="markdown-text" className="sr-only">Markdown Output</label>
                  <textarea
                    id="markdown-text"
                    readOnly
                    value={result?.markdownText || ''}
                    placeholder="Markdown will appear here..."
                    className="flex-1 w-full p-4 rounded-md border border-gray-300 bg-white resize-y font-mono text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    aria-label="Markdown Output"
                  />
                  {result && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-2">
                      <CopyButton 
                        text={result.markdownText} 
                        iconOnly 
                        tooltipText="Copy markdown"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Copy markdown"
                      />
                      <DownloadButton 
                        content={result.markdownText} 
                        filename="formatted-content.md"
                        iconOnly 
                        tooltipText="Download markdown"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Download markdown"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'prompt' && (
                <div className="flex-1 relative flex flex-col group">
                  <label htmlFor="prompt-text" className="sr-only">LLM Prompt Output</label>
                  <textarea
                    id="prompt-text"
                    readOnly
                    value={result?.llmPromptText || ''}
                    placeholder="LLM Prompt will appear here..."
                    className="flex-1 w-full p-4 rounded-md border border-gray-300 bg-white resize-y font-mono text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    aria-label="LLM Prompt Output"
                  />
                  {result && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-2">
                      <CopyButton 
                        text={result.llmPromptText} 
                        iconOnly 
                        tooltipText="Copy LLM prompt"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Copy LLM prompt"
                      />
                      <DownloadButton 
                        content={result.llmPromptText} 
                        filename="llm-prompt.txt"
                        iconOnly 
                        tooltipText="Download LLM prompt"
                        className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        label="Download LLM prompt"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {result && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-gray-500">
                <div className="flex flex-wrap gap-4">
                  <div>
                    Detected type: <span className="font-medium text-gray-900">{sourceTypeLabels[result.detectedType]}</span>
                  </div>
                  <div>
                    Removed lines: <span className="font-medium text-gray-900">{result.removedLineCount}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-700 font-medium mr-2 hidden sm:inline">
                    Export {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}:
                  </span>
                  <CopyButton 
                    text={activeText} 
                    label="Copy" 
                    tooltipText={`Copy ${activeTab} text`}
                  />
                  <DownloadButton 
                    content={activeText} 
                    filename={activeFilename} 
                    label={`Save ${activeExtension}`} 
                    tooltipText={`Download ${activeTab} as ${activeExtension}`}
                  />
                </div>
              </div>
            )}
            {result?.warnings.length ? (
              <div className="p-4 border-t border-yellow-200 bg-yellow-50 text-sm text-yellow-800" role="alert">
                <ul className="list-disc pl-5 space-y-1">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {/* History Slide-over Panel */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                  <Clock className="w-5 h-5" /> 
                  Local History
                </h2>
                <button 
                  onClick={() => setIsHistoryOpen(false)} 
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Close history"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-2">
                    <Clock className="w-8 h-8 opacity-20" />
                    <p>No history yet.</p>
                    <p className="text-sm opacity-70">Cleaned texts will appear here.</p>
                  </div>
                ) : (
                  history.map(item => (
                    <div 
                      key={item.id} 
                      className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group bg-white" 
                      onClick={() => restoreHistoryItem(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') restoreHistoryItem(item); }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          {new Date(item.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                          })}
                        </span>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            deleteHistoryItem(item.id); 
                          }} 
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                          aria-label="Delete history item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {sourceTypeLabels[item.result.detectedType]}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2 font-mono bg-gray-50 p-1.5 rounded border border-gray-100">
                        {item.rawText}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {history.length > 0 && (
                <div className="p-4 border-t bg-gray-50">
                  <button 
                    onClick={clearHistory} 
                    className="w-full py-2 text-sm text-red-600 font-medium hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Clear All History
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Code View Slide-over Panel */}
        {isCodeOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                  <Code2 className="w-5 h-5" /> 
                  Cleanup Logic
                </h2>
                <button 
                  onClick={() => setIsCodeOpen(false)} 
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Close code view"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
                <p className="text-sm text-gray-600">
                  This panel displays the live code used to clean the text. It automatically stays up-to-date with any changes to the cleaning engine or rulesets.
                </p>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                    <span>core/engine.ts</span>
                    <CopyButton text={engineCode} iconOnly tooltipText="Copy engine code" className="p-1.5 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm" />
                  </h3>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono shadow-inner">
                    <code>{engineCode}</code>
                  </pre>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                    <span>core/rules/generic.ts</span>
                    <CopyButton text={genericRulesCode} iconOnly tooltipText="Copy generic rules" className="p-1.5 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm" />
                  </h3>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono shadow-inner">
                    <code>{genericRulesCode}</code>
                  </pre>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                    <span>core/rules/github.ts</span>
                    <CopyButton text={githubRulesCode} iconOnly tooltipText="Copy GitHub rules" className="p-1.5 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm" />
                  </h3>
                  <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono shadow-inner">
                    <code>{githubRulesCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}
