'use client';

import React, { useEffect, useState, memo } from 'react';
import { useTranslations } from 'next-intl';
import type { ToolUIPart } from 'ai';
import { Tool, ToolContent, ToolHeader, ToolOutput } from '@/components/ai-elements/tool';
import { Loader } from '@/components/ai-elements/loader';
import { Button } from '@/components/ui/button';
import { Weather } from '@/components/weather';

interface ToolRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  part: ToolUIPart<any>;
  toolCallId: string;
  toolName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addToolApprovalResponse: (response: { id: string; approved: boolean }) => any;
  sendMessage: () => void;
}

/**
 * Tool renderer component for displaying tool calls and their outputs
 */
function ToolRendererComponent({
  part,
  toolCallId,
  toolName,
  addToolApprovalResponse,
  sendMessage,
}: ToolRendererProps) {
  const t = useTranslations('tool');
  const { state, output, approval, input } = part;
  const [isOpen, setIsOpen] = useState(false);

  // Automatically open when approval is requested
  useEffect(() => {
    if (state === 'approval-requested') {
      setIsOpen(true);
    }
  }, [state]);

  return (
    <div className="my-2">
      <Tool open={isOpen} onOpenChange={setIsOpen}>
        <ToolHeader
          type={part.type}
          state={state}
          title={toolName}
        />
        <ToolContent>
          {/* Show approval request if tool requires approval */}
          {state === 'approval-requested' && approval && (
            <div className="space-y-3 p-3">
              <div className="text-sm">
                <div className="font-medium mb-2">{t('requiresApproval')}</div>
                <pre className="bg-muted rounded p-2 font-mono text-xs whitespace-pre-wrap overflow-auto">
                  {JSON.stringify(input as object, null, 2)}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    await addToolApprovalResponse({
                      id: approval.id,
                      approved: true,
                    });
                    sendMessage();
                  }}
                >
                  {t('approve')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    await addToolApprovalResponse({
                      id: approval.id,
                      approved: false,
                    });
                    sendMessage();
                  }}
                >
                  {t('deny')}
                </Button>
              </div>
            </div>
          )}

          {/* Show input if available */}
          {input && state !== 'approval-requested' && (
            <div className="p-3 border-b">
              <div className="text-sm font-medium mb-2">{t('input')}</div>
              <pre className="bg-muted rounded p-2 font-mono text-xs whitespace-pre-wrap overflow-auto">
                {JSON.stringify(input as object, null, 2)}
              </pre>
            </div>
          )}

          {/* Show output when available */}
          {state === 'output-available' && output && (
            <ToolOutput
              output={
                toolName === 'get_current_weather' ? (
                  <Weather weatherAtLocation={typeof output === 'string' ? JSON.parse(output) : output} />
                ) : (
                  <pre className="text-xs">{typeof output === 'string' ? output : JSON.stringify(output, null, 2)}</pre>
                )
              }
              errorText={undefined}
            />
          )}

          {/* Show loading state while tool is executing */}
          {state === 'input-streaming' && (
            <div className="flex items-center gap-2 p-2">
              <Loader size={16} />
              <span className="text-sm text-muted-foreground">
                {toolName === 'get_current_weather'
                  ? t('gettingWeather')
                  : t('executing', { toolName })}
              </span>
            </div>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
}

export const ToolRenderer = memo(ToolRendererComponent);
