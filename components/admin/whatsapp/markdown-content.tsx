'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// WhatsApp uses single-delimiter formatting (*bold*, _italic_, ~strike~) instead
// of CommonMark's double markers. Convert to CommonMark before parsing so the
// notification templates in lib/notifications/message-templates.ts render
// correctly. Also force every \n into a hard break so the multi-line receipt
// templates keep their layout (CommonMark would otherwise collapse single
// newlines into spaces).
function whatsappToCommonMark(input: string): string {
  return input
    .replace(/(^|[^\w*])\*((?!\s)[^\n*]+?(?<!\s))\*(?!\w)/g, '$1**$2**')
    .replace(/(^|[^\w~])~((?!\s)[^\n~]+?(?<!\s))~(?!\w)/g, '$1~~$2~~')
    .replace(/([^\n])\n(?!\n)/g, '$1  \n');
}

interface Props {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: Props) {
  return (
    <div className={cn('text-[15px] leading-relaxed break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={['p', 'strong', 'em', 'code', 'a', 'ul', 'ol', 'li', 'br', 'del']}
        unwrapDisallowed
        components={{
          p: ({ children }) => <p className="my-0">{children}</p>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 break-all"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-700/60 px-1.5 py-0.5 font-mono text-[13px]">
              {children}
            </code>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through opacity-80">{children}</del>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
        }}
      >
        {whatsappToCommonMark(content)}
      </ReactMarkdown>
    </div>
  );
}
