import { dealUiLabel } from '@/config/salesWorkflow';
import { Button, Modal, message } from 'antd';
import { Pencil, RadioTower, Trash2 } from 'lucide-react';
import React from 'react';
import { useGetDealSources } from '@/store/server/features/deals/settings/source/query';
import { useDeleteDealSource } from '@/store/server/features/deals/settings/source/mutation';
import EditSourceSideBar from './editSideBar';
import dealSettingsSourceStore from '@/store/uistate/features/deal/settings/source';

const SourceCard = () => {
  const { data: sources, isLoading: isLoadingSources } = useGetDealSources();
  const { mutate: deleteDealSource } = useDeleteDealSource();

  const {
    editModalOpen,
    setEditModalOpen,
    currentSource,
    setCurrentSource,
    confirmDeleteModal,
    setConfirmDeleteModal,
    sourceToDelete,
    setSourceToDelete,
  } = dealSettingsSourceStore();

  const handleEditSource = (source: any) => {
    setCurrentSource(source);
    setEditModalOpen(true);
  };

  const handleDeleteSource = (sourceId: string) => {
    setSourceToDelete(sourceId);
    setConfirmDeleteModal(true);
  };

  const confirmDelete = () => {
    if (sourceToDelete) {
      deleteDealSource(sourceToDelete, {
        onSuccess: () => {
          message.success(`${dealUiLabel()} source deleted successfully`);
          setConfirmDeleteModal(false);
        },
      });
    }
  };

  if (isLoadingSources) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading sources...
      </div>
    );
  }

  const sourceItems = sources?.data ?? [];
  const sourceCount = sourceItems.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {dealUiLabel()} Sources
          </div>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            Manage channels that originate new{' '}
            {dealUiLabel({ plural: true, lowercase: true })}.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-brand-border bg-brand-muted px-2.5 py-0.5 text-xs font-semibold text-brand">
          {sourceCount} source{sourceCount === 1 ? '' : 's'}
        </span>
      </div>

      {sourceItems.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border-strong bg-surface-card text-sm text-muted-foreground">
          No sources found
        </div>
      ) : (
        <div className="-mx-4 -mb-4 divide-y divide-[#e5e7eb] border-t border-border">
          {sourceItems.map((source: any) => (
            <div
              key={source.id}
              className="group flex items-center gap-4 bg-surface-card px-4 py-3 transition-colors hover:bg-surface-elevated"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-muted text-brand">
                <RadioTower size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {source.name}
                </div>
                <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                  {dealUiLabel()} source
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  type="text"
                  icon={<Pencil size={14} />}
                  onClick={() => handleEditSource(source)}
                  className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-[#1f2937]"
                />
                <Button
                  type="text"
                  icon={<Trash2 size={14} />}
                  onClick={() => handleDeleteSource(source.id)}
                  className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <EditSourceSideBar
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setTimeout(() => setCurrentSource(null), 300);
        }}
        source={currentSource}
      />

      <Modal
        title="Confirm Delete"
        open={confirmDeleteModal}
        onOk={confirmDelete}
        onCancel={() => setConfirmDeleteModal(false)}
        cancelText="Cancel"
        okText="Remove Source"
        okButtonProps={{
          className: 'bg-brand border-brand text-brand-foreground',
        }}
      >
        <p>Are you sure you want to delete this source?</p>
      </Modal>
    </div>
  );
};

export default SourceCard;
