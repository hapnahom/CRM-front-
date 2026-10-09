'use client';

import { tokens } from '@/lib/design-tokens';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { AttachedFilesSkeleton } from '@/components/loading/skeleton-screens';
import { Download, Trash2 } from 'lucide-react';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import { useLeadDocumentsQuery } from '@/store/server/features/leads/queries';
import { useDeleteLeadDocumentMutation } from '@/store/server/features/leads/mutation';
import { LeadDocument } from '@/store/server/features/leads/interface';

interface AttachedFilesProps {
  leadId: string;
}

const AttachedFiles: React.FC<AttachedFilesProps> = ({ leadId }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [documentToDelete, setDocumentToDelete] = useState<LeadDocument | null>(
    null,
  );

  const { data: documents = [], isLoading } = useLeadDocumentsQuery(leadId);
  const deleteDocumentMutation = useDeleteLeadDocumentMutation();

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const handleDownloadFile = (
    filePath: string,
    fileName: string,
    fileId: string,
  ) => {
    try {
      // Set loading state
      setDownloadingFileId(fileId);

      // Create hidden link element
      const link = document.createElement('a');
      link.href = filePath;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      toast.success(`Downloading ${fileName}`);

      // Remove loading state after short delay
      setTimeout(() => {
        setDownloadingFileId(null);
      }, 100);
    } catch (error) {
      toast.error('Failed to download file. Please try again.');
      setDownloadingFileId(null);
    }
  };

  const handleDeleteDocument = (document: LeadDocument) => {
    setDocumentToDelete(document);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    try {
      await deleteDocumentMutation.mutateAsync({
        leadId: leadId,
        documentId: documentToDelete.id,
      });
      setDocumentToDelete(null);
    } catch (error: any) {
      // Error handling is done in the mutation's onError
    }
  };

  return (
    <div className="pt-6">
      <div className="flex items-center justify-between mb-4 ml-2 mr-2">
        <h3 className="m-0 text-base font-semibold text-foreground">
          Attached Files
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
        >
          <Icon
            icon="fluent:edit-16-regular"
            className="text-lg sm:text-2xl"
            style={{
              color: isEditMode ? tokens.color.blue : tokens.color.textPrimary,
            }}
          />
        </Button>
      </div>

      {isEditMode && documents.length > 0 && (
        <div className="mb-4 ml-2 mr-2">
          <span className="text-sm text-muted-foreground">
            Click the delete button on any file to remove it
          </span>
        </div>
      )}

      {isLoading ? (
        <AttachedFilesSkeleton />
      ) : documents.length === 0 ? (
        <div className="ml-2 mr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                Uploaded File Name
              </span>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                Uploaded File Name
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-2 mr-2">
          {documents.map((document) => (
            <div key={document.id} className="relative">
              <div
                className="border-2 border-solid border-border rounded-lg p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                onClick={() =>
                  handleDownloadFile(
                    document.filePath,
                    document.fileName,
                    document.id,
                  )
                }
                title="Click to download"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getFileIcon(document.fileName)}
                    </div>
                    <div>
                      <span className="block text-base font-semibold text-foreground">
                        {document.fileName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Download Button - Always visible */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFile(
                          document.filePath,
                          document.fileName,
                          document.id,
                        );
                      }}
                      className={cn(
                        downloadingFileId === document.id && 'opacity-50',
                      )}
                      disabled={downloadingFileId === document.id}
                    >
                      <Download className="size-[18px] text-brand" />
                    </Button>
                    {/* Delete Button - Only in Edit Mode */}
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(document);
                        }}
                        className={cn(
                          'text-destructive hover:text-destructive',
                          deleteDocumentMutation.isLoading && 'opacity-50',
                        )}
                        disabled={deleteDocumentMutation.isLoading}
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <AlertDialog
        open={!!documentToDelete}
        onOpenChange={(open) => {
          if (!open) setDocumentToDelete(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this File ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-brand text-brand hover:text-brand"
              disabled={deleteDocumentMutation.isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#3b82f6] text-brand-foreground hover:bg-brand"
              onClick={(event) => {
                event.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteDocumentMutation.isLoading}
            >
              {deleteDocumentMutation.isLoading ? 'Removing…' : 'Remove File'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AttachedFiles;
