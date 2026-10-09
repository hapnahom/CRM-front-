'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ConfirmReseatDialog({
  open,
  confirming,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  confirming: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="z-[80] sm:max-w-[440px]"
        overlayClassName="z-[80] bg-black/40"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Re-seat downstream targets?</AlertDialogTitle>
          <AlertDialogDescription>
            Saving this company target replaces the current department, team,
            and person targets with amounts from the opportunities you selected.
            Continue to save, or cancel to keep editing your selection.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirming}
            className="bg-brand text-white hover:bg-brand-hover"
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {confirming ? 'Saving…' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
