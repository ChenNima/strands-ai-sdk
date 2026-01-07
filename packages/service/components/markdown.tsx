import Link from "next/link";
import React, { memo, type ReactNode, type HTMLAttributes } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element } from "hast";

interface CodeProps extends HTMLAttributes<HTMLElement> {
  node?: Element;
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

interface ElementProps extends HTMLAttributes<HTMLElement> {
  node?: Element;
  children?: ReactNode;
}

interface LinkProps extends HTMLAttributes<HTMLAnchorElement> {
  node?: Element;
  children?: ReactNode;
  href?: string;
}

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const components: Partial<Components> = {
    code: ({ inline, className, children, ...props }: CodeProps) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <pre
          {...(props as HTMLAttributes<HTMLPreElement>)}
          className={`${className} text-sm w-[80dvw] md:max-w-[500px] overflow-x-scroll bg-zinc-100 p-3 rounded-lg mt-2 dark:bg-zinc-800`}
        >
          <code className={match[1]}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className || ''} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
          {...props}
        >
          {children}
        </code>
      );
    },
    ol: ({ children, ...props }: ElementProps) => {
      return (
        <ol className="list-decimal list-outside ml-4" {...(props as HTMLAttributes<HTMLOListElement>)}>
          {children}
        </ol>
      );
    },
    li: ({ children, ...props }: ElementProps) => {
      return (
        <li className="py-1" {...(props as HTMLAttributes<HTMLLIElement>)}>
          {children}
        </li>
      );
    },
    ul: ({ children, ...props }: ElementProps) => {
      return (
        <ul className="list-disc list-outside ml-4" {...(props as HTMLAttributes<HTMLUListElement>)}>
          {children}
        </ul>
      );
    },
    strong: ({ children, ...props }: ElementProps) => {
      return (
        <span className="font-semibold" {...props}>
          {children}
        </span>
      );
    },
    a: ({ children, href, ...props }: LinkProps) => {
      return (
        <Link
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noreferrer"
          href={href || '#'}
          {...(props as Omit<HTMLAttributes<HTMLAnchorElement>, 'href'>)}
        >
          {children}
        </Link>
      );
    },
    h1: ({ children, ...props }: ElementProps) => {
      return (
        <h1 className="text-3xl font-semibold mt-6 mb-2" {...(props as HTMLAttributes<HTMLHeadingElement>)}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: ElementProps) => {
      return (
        <h2 className="text-2xl font-semibold mt-6 mb-2" {...(props as HTMLAttributes<HTMLHeadingElement>)}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: ElementProps) => {
      return (
        <h3 className="text-xl font-semibold mt-6 mb-2" {...(props as HTMLAttributes<HTMLHeadingElement>)}>
          {children}
        </h3>
      );
    },
    h4: ({ children, ...props }: ElementProps) => {
      return (
        <h4 className="text-lg font-semibold mt-6 mb-2" {...(props as HTMLAttributes<HTMLHeadingElement>)}>
          {children}
        </h4>
      );
    },
    h5: ({ children, ...props }: ElementProps) => {
      return (
        <h5 className="text-base font-semibold mt-6 mb-2" {...(props as HTMLAttributes<HTMLHeadingElement>)}>
          {children}
        </h5>
      );
    },
    h6: ({ children, ...props }: ElementProps) => {
      return (
        <h6 className="text-sm font-semibold mt-6 mb-2" {...(props as HTMLAttributes<HTMLHeadingElement>)}>
          {children}
        </h6>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
