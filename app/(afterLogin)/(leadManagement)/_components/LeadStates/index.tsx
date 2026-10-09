'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { ChevronDown } from 'lucide-react';
import { useUpdateLeadStageMutation } from '@/store/server/features/leads/mutation';
import { useEngagementStagesQuery } from '@/store/server/features/leads/queries';
import type { EngagementStage } from '@/store/server/features/leads/interface';
import { tokens } from '@/lib/design-tokens';

interface LeadStatesProps {
  leadId: string;
  currentStage: string | null;
  onStageChange?: (leadId: string, newStage: string) => void;
  'data-cy'?: string;
}

export function LeadStates({
  leadId,
  currentStage,
  onStageChange,
  'data-cy': dataCy,
}: LeadStatesProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    data: engagementStages = [],
    isLoading: stagesLoading,
    error: stagesError,
  } = useEngagementStagesQuery();
  const updateLeadStageMutation = useUpdateLeadStageMutation();

  const isUpdating = updateLeadStageMutation.isLoading;
  const currentStageObj = engagementStages.find(
    (stage: EngagementStage) => stage.id === currentStage,
  );

  // Helper function to detect UUID
  const isUUID = (str: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const currentStageName = (() => {
    if (stagesLoading) {
      return 'Loading...';
    }

    if (stagesError) {
      return 'Error loading';
    }

    if (!currentStage) {
      return 'No stage';
    }

    if (!currentStageObj) {
      // If currentStage looks like a UUID, it's a missing reference
      if (isUUID(currentStage)) {
        return 'Stage not found';
      }
      // If it doesn't look like a UUID, it might be a name
      return currentStage;
    }

    return (
      currentStageObj.name.charAt(0).toUpperCase() +
      currentStageObj.name.slice(1)
    );
  })();

  const getStageColors = (stage: EngagementStage) => {
    const colorCode = stage.colorCode || tokens.color.brand;

    return {
      border: colorCode,
      color: colorCode,
      background: `${colorCode}10`, // Very light version of the color (10% opacity) like Figma
    };
  };

  const currentStageColors = currentStageObj
    ? getStageColors(currentStageObj)
    : {
        border: tokens.color.brand,
        color: tokens.color.brand,
        background: `${tokens.color.brand}10`,
      };

  const handleStageChange = async (stageId: string) => {
    if (stageId === currentStage) {
      return;
    }

    try {
      await updateLeadStageMutation.mutateAsync({
        leadId,
        stageId: stageId,
      });

      const stageName =
        engagementStages.find((stage: EngagementStage) => stage.id === stageId)
          ?.name || 'Unknown';

      onStageChange?.(leadId, stageName);
    } catch (error) {
      // Silent error handling
    }
  };
  const stages: Array<{ value: string; label: string }> = engagementStages.map(
    (stage) => ({
      value: stage.id, // Use stage ID for reliable identification
      label: stage.name.charAt(0).toUpperCase() + stage.name.slice(1), // Capitalize first letter
    }),
  );

  // Don't render anything if no stages are available
  if (engagementStages.length === 0) {
    if (stagesLoading) {
      return (
        <span className="text-sm text-muted-foreground">Loading stages...</span>
      );
    }
    if (stagesError) {
      return <span className="text-sm text-red-500">Error loading stages</span>;
    }
    return (
      <span className="text-sm text-muted-foreground">No stages available</span>
    );
  }

  return (
    <>
      {/* Global overlay when dropdown is open */}
      {dropdownOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.3)', // Light dark overlay
            zIndex: 1000, // Lower z-index so dropdown appears above
            pointerEvents: 'none', // Allow clicks to pass through
          }}
        />
      )}

      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild disabled={isUpdating}>
          <Button
            className="lead-stage-button"
            variant="outline"
            size="sm"
            style={{
              ['--button-text-color' as any]: currentStageColors.color,
              ['--button-border-color' as any]: currentStageColors.border,
              ['--button-background-color' as any]:
                currentStageColors.background,
              borderColor: currentStageColors.border,
              color: currentStageColors.color,
              background: currentStageColors.background,
              fontWeight: 500,
              fontSize: '14px',
              padding: '18px 12px',
              borderWidth: 2,
              borderStyle: 'solid',
              borderRadius: '8px', // Rounded corners
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.setProperty(
                '--button-background-color',
                tokens.color.surfaceHover,
              );
              e.currentTarget.style.background = tokens.color.surfaceHover; // Light gray on hover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty(
                '--button-background-color',
                currentStageColors.background,
              );
              e.currentTarget.style.background = currentStageColors.background;
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.setProperty(
                '--button-background-color',
                tokens.color.borderDefault,
              );
              e.currentTarget.style.background = tokens.color.borderDefault; // Darker gray when clicked
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.setProperty(
                '--button-background-color',
                tokens.color.surfaceHover,
              );
              e.currentTarget.style.background = tokens.color.surfaceHover; // Back to hover state
            }}
            disabled={isUpdating}
            data-cy={dataCy || `lead-stage-button-${leadId}`}
          >
            <span className="flex items-center justify-between w-full">
              <span>{isUpdating ? 'Updating...' : currentStageName}</span>
              {isUpdating ? (
                <Spinner className="size-3.5" />
              ) : (
                <ChevronDown className="ml-1 size-3.5" />
              )}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-[1001] min-w-[160px]">
          {stages.map((stage) => {
            const backendStage = engagementStages.find(
              (s) => s.id === stage.value,
            );
            const stageColors = backendStage
              ? getStageColors(backendStage)
              : {
                  border: tokens.color.accentBlue,
                  color: tokens.color.accentBlue,
                  background: `${tokens.color.accentBlue}10`,
                };

            return (
              <DropdownMenuItem
                key={stage.value}
                className="p-0 focus:bg-transparent"
                onSelect={() => handleStageChange(stage.value)}
              >
                <Button
                  variant="outline"
                  size="sm"
                  style={{
                    borderColor: stageColors.border,
                    color: stageColors.color,
                    background: stageColors.background,
                    width: '100%',
                    marginBottom: 2,
                    fontWeight: 500,
                    fontSize: '14px',
                    padding: '18px 12px',
                    borderWidth: 2,
                    borderStyle: 'solid',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      tokens.color.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = stageColors.background;
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background =
                      tokens.color.borderDefault;
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background =
                      tokens.color.surfaceHover;
                  }}
                  onClick={() => handleStageChange(stage.value)}
                  data-cy={`stage-option-${stage.value}`}
                >
                  {stage.label}
                </Button>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
