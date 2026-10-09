'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CustomerAvatar } from '@/modules/customers/components/CustomerAvatar';
import { initialsFromName } from '@/modules/customers/lib/display';
import { fileUpload } from '@/utils/fileUpload';

export function LogoUploadField({
  value,
  onChange,
  accountName,
}: {
  value: string;
  onChange: (url: string) => void;
  accountName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const name = accountName?.trim() || 'Customer';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    setUploading(true);
    try {
      const response = await fileUpload(file);
      const body = (response?.data ?? {}) as Record<string, unknown>;
      const nested =
        body.data && typeof body.data === 'object'
          ? (body.data as Record<string, unknown>)
          : {};
      const url = [
        nested.viewImage,
        nested.image,
        body.viewImage,
        body.image,
        typeof body === 'string' ? body : '',
      ].find((value) => typeof value === 'string' && value.trim()) as
        | string
        | undefined;
      if (!url) {
        toast.error('Upload succeeded but no image URL was returned.');
        return;
      }
      onChange(url);
      toast.success('Logo uploaded.');
    } catch {
      toast.error('Could not upload logo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>Logo</Label>
      <div className="flex items-center gap-3">
        <CustomerAvatar
          name={name}
          initials={initialsFromName(name)}
          logoUrl={value || null}
          size="md"
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 border-border"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <ImagePlus size={14} className="mr-1.5" />
            )}
            {uploading ? 'Uploading…' : value ? 'Change logo' : 'Upload logo'}
          </Button>
          {value ? (
            <button
              type="button"
              className="block text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange('')}
            >
              Remove logo
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              PNG or JPG. Shown instantly on this customer.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
