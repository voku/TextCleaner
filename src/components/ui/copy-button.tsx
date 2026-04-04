import { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface CopyButtonProps {
  text: string;
  label?: string;
  tooltipText?: string;
  className?: string;
  iconOnly?: boolean;
}

export function CopyButton({ text, label, tooltipText, className, iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const buttonContent = (
    <button
      onClick={handleCopy}
      className={className || "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"}
      aria-label={label || "Copy to clipboard"}
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4" />}
      {!iconOnly && (copied ? <span className="text-green-600">Copied!</span> : <span>{label || 'Copy'}</span>)}
    </button>
  );

  if (tooltipText) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}
