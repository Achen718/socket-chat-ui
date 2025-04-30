'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
  isAI?: boolean;
  preview?: boolean;
}
const MarkdownContent = ({
  content,
  className = '',
  isAI = false,
  preview = false,
}: MarkdownContentProps) => {
  // For previews, truncate the content
  const displayContent =
    preview && content.length > 30 ? `${content.substring(0, 30)}...` : content;

  // Only process as markdown if it's AI content
  return isAI ? (
    <ReactMarkdown>{displayContent}</ReactMarkdown>
  ) : (
    <span className={className}>{displayContent}</span>
  );
};

export default MarkdownContent;
