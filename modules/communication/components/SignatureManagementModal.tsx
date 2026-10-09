'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CloudDownload,
  CloudUpload,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  PenLine,
  Plus,
  RemoveFormatting,
  Strikethrough,
  Trash2,
  Underline,
  X,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Code2,
  FileCode2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fileUpload } from '@/utils/fileUpload';
import {
  cleanImportedSignatureHtml,
  normalizeSignatureHtmlForEmail,
  rewriteSignatureResourceUrl,
} from '@/modules/communication/utils/signature-import-html.util';
import { rehostExternalSignatureImages } from '@/modules/communication/utils/signature-rehost-images';
import { useGetEmailSignatures } from '@/store/server/features/communication/queries';
import {
  useCreateEmailSignature,
  useDeleteEmailSignature,
  useImportGmailSignature,
  usePushSignatureToGmail,
  useSetSignatureDefaults,
  useUpdateEmailSignature,
} from '@/store/server/features/communication/mutations';
import type { CrmEmailSignature } from '@/store/server/features/communication/types';
import type { EmailAccount } from '@/modules/communication/components/EmailAccountSettings';

function sanitizePreviewHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
}

/** Selection chrome — class only so outline never lands in saved inline styles. */
const CRM_SIG_IMG_SELECTED = 'crm-sig-img-selected';

/** Radix Select dislikes empty string values — map "no signature" to a sentinel. */
const NO_SIGNATURE_VALUE = '__none__';

const SELECT_CONTENT_CLASS =
  'w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]';

const SELECT_ITEM_BRAND =
  'focus:bg-brand-muted focus:text-brand data-highlighted:bg-brand-muted data-highlighted:text-brand';

const SELECT_TRIGGER_CLASS =
  'h-9 w-full border-border bg-surface-card text-sm shadow-none focus:border-brand/40 focus-visible:border-brand/40 focus-visible:ring-brand/20';

/** contentEditable often keeps <br>/<div> so CSS :empty never fires. */
function isSignatureEditorEmpty(html: string): boolean {
  if (!html || !html.trim()) return true;
  const host =
    typeof document !== 'undefined' ? document.createElement('div') : null;
  if (!host) {
    return !html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim();
  }
  host.innerHTML = html;
  if (host.querySelector('img')) return false;
  const text = (host.textContent || '').replace(/\u200b/g, '').trim();
  return !text;
}

/** Focus contentEditable and put the caret on the first line. */
function focusEditorAtStart(editor: HTMLElement) {
  // Ensure there is a node for the caret (empty editors can refuse focus caret).
  if (!editor.innerHTML.trim()) {
    editor.innerHTML = '<br>';
  }
  editor.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStart(editor, 0);
  range.collapse(true);
  // Prefer start of first text/content node when present.
  const first = editor.firstChild;
  if (first) {
    if (first.nodeType === Node.TEXT_NODE) {
      range.setStart(first, 0);
      range.collapse(true);
    } else if (first.nodeType === Node.ELEMENT_NODE) {
      range.selectNodeContents(first);
      range.collapse(true);
    }
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Map toolbar size values → CSS px (email-safe; avoids deprecated <font size>). */
const SIGNATURE_FONT_SIZES: Record<string, string> = {
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
};

const SIGNATURE_SIZE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: '2', label: 'Small' },
  { key: '3', label: 'Normal' },
  { key: '4', label: 'Large' },
  { key: '5', label: 'Huge' },
];

/** Gmail-style font family choices (email-safe stacks). */
const SIGNATURE_FONT_OPTIONS: Array<{ label: string; css: string }> = [
  {
    label: 'Sans Serif',
    css: 'Arial, Helvetica, sans-serif',
  },
  {
    label: 'Serif',
    css: 'Times New Roman, Times, serif',
  },
  {
    label: 'Fixed Width',
    css: 'Courier New, Courier, monospace',
  },
  {
    label: 'Wide',
    css: 'Arial Black, Gadget, sans-serif',
  },
  {
    label: 'Narrow',
    css: 'Arial Narrow, Arial, sans-serif',
  },
  {
    label: 'Comic Sans MS',
    css: 'Comic Sans MS, Textile, cursive',
  },
  {
    label: 'Garamond',
    css: 'Garamond, Baskerville, Times New Roman, serif',
  },
  {
    label: 'Georgia',
    css: 'Georgia, Times New Roman, Times, serif',
  },
  {
    label: 'Tahoma',
    css: 'Tahoma, Geneva, sans-serif',
  },
  {
    label: 'Trebuchet MS',
    css: 'Trebuchet MS, Helvetica, sans-serif',
  },
  {
    label: 'Verdana',
    css: 'Verdana, Geneva, sans-serif',
  },
];

function wrapSelectionWithSpan(styleCss: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
    document.execCommand(
      'insertHTML',
      false,
      `<span style="${styleCss}">&#8203;</span>`,
    );
    return;
  }
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.setAttribute('style', styleCss);
  try {
    range.surroundContents(span);
  } catch {
    // Cross-node selection — fall back to extract + wrap.
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  sel.removeAllRanges();
  const after = document.createRange();
  after.selectNodeContents(span);
  after.collapse(false);
  sel.addRange(after);
}

const GMAIL_SIGNATURE_MAX_CHARS = 10_000;
const SIGNATURE_IMG_MIN_PX = 60;
const SIGNATURE_IMG_MAX_PX = 400;
const SIGNATURE_IMG_STEP_PX = 40;
const SIGNATURE_IMG_DEFAULT_PX = 200;

function readImgDisplayWidth(img: HTMLImageElement): number {
  const widthAttr = Number.parseInt(img.getAttribute('width') || '', 10);
  if (Number.isFinite(widthAttr) && widthAttr > 0) return widthAttr;
  const styleW = Number.parseInt(img.style.width || '', 10);
  if (Number.isFinite(styleW) && styleW > 0) return styleW;
  const maxW = Number.parseInt(img.style.maxWidth || '', 10);
  if (Number.isFinite(maxW) && maxW > 0) return maxW;
  const rendered = Math.round(img.getBoundingClientRect().width);
  return rendered > 0 ? rendered : SIGNATURE_IMG_DEFAULT_PX;
}

function applyImgDisplayWidth(img: HTMLImageElement, widthPx: number) {
  const clamped = Math.min(
    SIGNATURE_IMG_MAX_PX,
    Math.max(SIGNATURE_IMG_MIN_PX, Math.round(widthPx)),
  );
  // Explicit user resize only — keep height:auto so aspect ratio holds.
  const prevStyle = img.getAttribute('style') || '';
  const kept = prevStyle
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter(
      (p) => !/^(width|max-width|height)\s*:/i.test(p) && !/^outline/i.test(p),
    );
  kept.push(`width: ${clamped}px`);
  kept.push(`max-width: ${clamped}px`);
  kept.push('height: auto');
  img.setAttribute('width', String(clamped));
  img.removeAttribute('height');
  img.setAttribute('style', kept.join('; '));
  return clamped;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  const ax = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const raw = ax?.response?.data?.message;
  if (Array.isArray(raw) && raw[0]) return String(raw[0]);
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (typeof ax?.message === 'string' && ax.message.trim()) return ax.message;
  return fallback;
}

/** Resolve public https URL from file-server upload response (prefer viewImage for inline display). */
function publicUrlFromUpload(data: unknown): string | null {
  const body = (data ?? {}) as Record<string, unknown>;
  const nested =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : {};
  const candidates = [
    nested.viewImage,
    body.viewImage,
    nested.image,
    body.image,
  ];
  const raw = candidates.find(
    (v): v is string => typeof v === 'string' && Boolean(v.trim()),
  );
  if (!raw) return null;
  let url = raw.trim();
  if (/^http:\/\//i.test(url)) url = url.replace(/^http:/i, 'https:');
  if (!/^https:\/\//i.test(url)) return null;
  return rewriteSignatureResourceUrl(url);
}

function normalizeImageHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'https://' || trimmed === 'http://') return null;
  if (/^data:/i.test(trimmed)) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Validate that a URL is a loadable image (format + browser Image probe).
 */
function validateRemoteImageUrl(
  raw: string,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (/^data:/i.test(raw.trim())) {
    return Promise.resolve({
      ok: false,
      message: 'Data URLs are not allowed — use an https:// image URL',
    });
  }
  const normalized = normalizeImageHttpUrl(raw);
  if (!normalized) {
    return Promise.resolve({
      ok: false,
      message: 'Enter a valid image URL (https://…)',
    });
  }
  if (!/^https:/i.test(normalized)) {
    return Promise.resolve({
      ok: false,
      message: 'Image URL must use https://',
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve({
        ok: false,
        message: 'Image URL timed out — check the link and try again',
      });
    }, 8000);
    img.onload = () => {
      window.clearTimeout(timer);
      if (img.naturalWidth > 0) {
        resolve({ ok: true, url: normalized });
      } else {
        resolve({
          ok: false,
          message: 'Image URL is invalid — no image data found',
        });
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve({
        ok: false,
        message:
          'Image URL is invalid — could not load an image from this link',
      });
    };
    img.referrerPolicy = 'no-referrer';
    img.src = normalized;
  });
}

function isReplyDefault(sig: CrmEmailSignature): boolean {
  return sig.providerMetadata?.isDefaultForReply === true;
}

function isReplyNone(signatures: CrmEmailSignature[]): boolean {
  return signatures.some((s) => s.providerMetadata?.replyDefaultNone === true);
}

function isGmailSynced(sig: CrmEmailSignature): boolean {
  return sig.providerMetadata?.syncedWithGmail === true;
}

function omitsSignatureSeparator(signatures: CrmEmailSignature[]): boolean {
  return signatures.some(
    (s) => s.providerMetadata?.omitSignatureSeparator === true,
  );
}

function FormatBtn({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-brand-muted text-brand',
      )}
    >
      {icon}
    </button>
  );
}

export function SignatureManagementModal({
  open,
  onClose,
  accounts,
  initialAccountId,
}: {
  open: boolean;
  onClose: () => void;
  accounts: EmailAccount[];
  initialAccountId?: string | null;
}) {
  const [accountId, setAccountId] = useState(
    initialAccountId || accounts[0]?.id || '',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('https://');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);
  const [imageUrlValidating, setImageUrlValidating] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [activeFontLabel, setActiveFontLabel] = useState('Sans Serif');
  const [activeSizeLabel, setActiveSizeLabel] = useState('Normal');
  const [imageUploading, setImageUploading] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');
  const [editorIsEmpty, setEditorIsEmpty] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [importHtmlOpen, setImportHtmlOpen] = useState(false);
  const [importHtmlRaw, setImportHtmlRaw] = useState('');
  const [importHtmlAutoClean, setImportHtmlAutoClean] = useState(true);
  const [selectedEditorImg, setSelectedEditorImg] =
    useState<HTMLImageElement | null>(null);
  const [imgChrome, setImgChrome] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamePromptSig, setRenamePromptSig] =
    useState<CrmEmailSignature | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletePromptSig, setDeletePromptSig] =
    useState<CrmEmailSignature | null>(null);
  const syncedOnceRef = useRef<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const savedSelection = useRef<Range | null>(null);

  const activeAccount =
    accounts.find((a) => a.id === accountId) || accounts[0] || null;
  const isGmail = activeAccount?.provider === 'gmail';

  const {
    data: signatures = [],
    isLoading,
    isFetching,
  } = useGetEmailSignatures(accountId || null, open && Boolean(accountId));
  const signaturesPending =
    isLoading || (isFetching && signatures.length === 0);
  const createMutation = useCreateEmailSignature();
  const updateMutation = useUpdateEmailSignature();
  const deleteMutation = useDeleteEmailSignature();
  const importMutation = useImportGmailSignature();
  const pushMutation = usePushSignatureToGmail();
  const defaultsMutation = useSetSignatureDefaults();

  const sorted = useMemo(
    () =>
      [...signatures].sort((a, b) => {
        if (a.isDefault === b.isDefault) {
          return (a.name || '').localeCompare(b.name || '');
        }
        return a.isDefault ? -1 : 1;
      }),
    [signatures],
  );

  const selected = sorted.find((s) => s.id === selectedId) || sorted[0] || null;

  const newDefaultId =
    sorted.find((s) => s.isDefault)?.id || (sorted[0]?.id ?? '');
  const replyDefaultId = isReplyNone(sorted)
    ? ''
    : sorted.find((s) => isReplyDefault(s))?.id || newDefaultId || '';

  useEffect(() => {
    if (!open) return;
    setAccountId(initialAccountId || accounts[0]?.id || '');
    setSelectedId(null);
    setDirty(false);
    setLinkOpen(false);
    setNamePromptOpen(false);
    setNewName('');
    setRenamePromptSig(null);
    setRenameValue('');
    setDeletePromptSig(null);
    setFontMenuOpen(false);
    setSizeMenuOpen(false);
    setSourceMode(false);
    setImportHtmlOpen(false);
    setImportHtmlRaw('');
    setSelectedEditorImg(null);
    setImgChrome(null);
    syncedOnceRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset UI when modal opens
  }, [open, initialAccountId, accounts]);

  // Auto-sync Gmail mailbox signature into CRM when the modal opens.
  useEffect(() => {
    if (!open || !isGmail || !accountId) return;
    if (syncedOnceRef.current === accountId) return;
    syncedOnceRef.current = accountId;
    void importMutation
      .mutateAsync({ accountId, sync: true })
      .then((result) => {
        if (result.imported && result.signature?.id) {
          setSelectedId(result.signature.id);
        }
      })
      .catch(() => {
        // Soft-fail: user can still manage CRM signatures offline from Gmail.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per open/account
  }, [open, isGmail, accountId]);

  useEffect(() => {
    if (!open || !sorted.length) {
      if (open && !sorted.length) setSelectedId(null);
      return;
    }
    if (!selectedId || !sorted.some((s) => s.id === selectedId)) {
      setSelectedId(sorted[0].id);
    }
  }, [open, sorted, selectedId]);

  useEffect(() => {
    if (!open || !editorRef.current || !selected) return;
    if (dirty) return;
    const html = normalizeSignatureHtmlForEmail(selected.bodyHtml || '');
    editorRef.current.innerHTML = html;
    setSourceHtml(html);
    setSourceMode(false);
    const empty = isSignatureEditorEmpty(html);
    setEditorIsEmpty(empty);
    setEditorReady(true);
    setSelectedEditorImg(null);
    setImgChrome(null);
    if (empty) {
      const editor = editorRef.current;
      requestAnimationFrame(() => {
        if (editor && document.body.contains(editor)) {
          focusEditorAtStart(editor);
        }
      });
    }
    return () => {
      setEditorReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh editor when selection/body changes, not every selected object identity
  }, [open, selected?.id, selected?.bodyHtml, dirty]);

  // Esc cancels create / rename / delete overlays (same as Cancel).
  useEffect(() => {
    if (!namePromptOpen && !renamePromptSig && !deletePromptSig) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setNamePromptOpen(false);
      setNewName('');
      setRenamePromptSig(null);
      setRenameValue('');
      setDeletePromptSig(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [namePromptOpen, renamePromptSig, deletePromptSig]);

  const importHtmlPreview = useMemo(
    () =>
      cleanImportedSignatureHtml(importHtmlRaw, {
        autoClean: importHtmlAutoClean,
      }),
    [importHtmlRaw, importHtmlAutoClean],
  );

  if (!open) return null;

  const busy =
    createMutation.isLoading ||
    updateMutation.isLoading ||
    deleteMutation.isLoading ||
    importMutation.isLoading ||
    pushMutation.isLoading ||
    defaultsMutation.isLoading ||
    imageUploading;

  const readEditorHtml = () => {
    // Drop transient selection chrome before persist.
    editorRef.current
      ?.querySelectorAll(`.${CRM_SIG_IMG_SELECTED}`)
      .forEach((el) => el.classList.remove(CRM_SIG_IMG_SELECTED));
    if (sourceMode) {
      return normalizeSignatureHtmlForEmail(sanitizePreviewHtml(sourceHtml));
    }
    return normalizeSignatureHtmlForEmail(
      sanitizePreviewHtml(editorRef.current?.innerHTML || ''),
    );
  };

  const setEditorHtmlContent = (
    html: string,
    options?: { autoClean?: boolean },
  ) => {
    const imported = options?.autoClean
      ? cleanImportedSignatureHtml(html, { autoClean: true })
      : html;
    const cleaned = normalizeSignatureHtmlForEmail(imported);
    if (editorRef.current) {
      editorRef.current.innerHTML = cleaned;
    }
    setSourceHtml(cleaned);
    setEditorIsEmpty(isSignatureEditorEmpty(cleaned));
    setDirty(true);
    setSelectedEditorImg(null);
    setImgChrome(null);
  };

  const toggleSourceMode = () => {
    if (sourceMode) {
      // Leaving source → apply HTML; auto-clean Outlook/browser junk from paste.
      setEditorHtmlContent(sourceHtml, { autoClean: true });
      setSourceMode(false);
      return;
    }
    const current = sanitizePreviewHtml(editorRef.current?.innerHTML || '');
    setSourceHtml(current);
    setSourceMode(true);
    setSelectedEditorImg(null);
    setImgChrome(null);
  };

  const openImportHtmlDialog = () => {
    if (!selected) {
      toast.message('Create or select a signature first');
      return;
    }
    setImportHtmlRaw('');
    setImportHtmlAutoClean(true);
    setImportHtmlOpen(true);
  };

  const insertImportedHtml = async () => {
    const cleaned = cleanImportedSignatureHtml(importHtmlRaw, {
      autoClean: importHtmlAutoClean,
    });
    if (!cleaned.trim()) {
      toast.error('Paste some HTML first');
      return;
    }
    setImageUploading(true);
    try {
      const normalized = normalizeSignatureHtmlForEmail(cleaned);
      const { html, hosted, failed } =
        await rehostExternalSignatureImages(normalized);
      if (sourceMode) {
        setSourceHtml(html);
        setDirty(true);
      } else {
        setEditorHtmlContent(html, { autoClean: false });
      }
      setImportHtmlOpen(false);
      setImportHtmlRaw('');
      if (failed.length && hosted === 0) {
        toast.message(
          'HTML inserted — some icons could not be rehosted (dead CDN). Working fallbacks were applied.',
        );
      } else if (hosted > 0) {
        toast.success(
          `HTML signature inserted (${hosted} image${hosted === 1 ? '' : 's'} rehosted)`,
        );
      } else {
        toast.success('HTML signature inserted');
      }
    } catch {
      toast.error('Failed to insert HTML signature');
    } finally {
      setImageUploading(false);
    }
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelection.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    editorRef.current?.focus();
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
  };

  const execFormat = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    setDirty(true);
  };

  const applyFontSize = (sizeKey: string) => {
    const px = SIGNATURE_FONT_SIZES[sizeKey] || SIGNATURE_FONT_SIZES['3'];
    restoreSelection();
    wrapSelectionWithSpan(`font-size:${px};line-height:1.4`);
    setActiveSizeLabel(
      SIGNATURE_SIZE_OPTIONS.find((o) => o.key === sizeKey)?.label || 'Normal',
    );
    setSizeMenuOpen(false);
    setDirty(true);
  };

  const applyFontFamily = (label: string, css: string) => {
    restoreSelection();
    wrapSelectionWithSpan(`font-family:${css}`);
    setActiveFontLabel(label);
    setFontMenuOpen(false);
    setDirty(true);
  };

  const applyAlign = (align: 'left' | 'center' | 'right') => {
    restoreSelection();
    document.execCommand(
      align === 'left'
        ? 'justifyLeft'
        : align === 'center'
          ? 'justifyCenter'
          : 'justifyRight',
    );
    // Prefer inline style over align= for Gmail — merge via attribute string
    // so we never rewrite CSSOM (!important-safe).
    if (editorRef.current) {
      editorRef.current.querySelectorAll('[align]').forEach((el) => {
        const a = el.getAttribute('align');
        if (!a) return;
        const prev = (el.getAttribute('style') || '').trim();
        const filtered = prev
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean)
          .filter((p) => !p.toLowerCase().startsWith('text-align:'));
        filtered.push(`text-align: ${a}`);
        el.setAttribute('style', filtered.join('; '));
        el.removeAttribute('align');
      });
    }
    setDirty(true);
  };

  const applyForeColor = (color: string) => {
    restoreSelection();
    wrapSelectionWithSpan(`color:${color}`);
    setDirty(true);
  };

  const applyHighlight = (color: string) => {
    restoreSelection();
    wrapSelectionWithSpan(`background-color:${color}`);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setImageUploading(true);
    try {
      const raw = readEditorHtml();
      const {
        html: bodyHtml,
        hosted,
        failed,
      } = await rehostExternalSignatureImages(raw);
      if (editorRef.current && !sourceMode) {
        editorRef.current.innerHTML = bodyHtml;
      }
      setSourceHtml(bodyHtml);
      await updateMutation.mutateAsync({
        id: selected.id,
        patch: {
          name: selected.name,
          bodyHtml,
          accountId: selected.accountId ?? accountId,
        },
      });
      setDirty(false);
      if (failed.length && hosted === 0) {
        toast.success('Signature saved (some icons use fallbacks)');
      } else if (hosted > 0) {
        toast.success(
          `Signature saved (${hosted} image${hosted === 1 ? '' : 's'} on file server)`,
        );
      } else {
        toast.success('Signature saved');
      }
    } catch (error: unknown) {
      toast.error(
        (error as { message?: string })?.message || 'Failed to save signature',
      );
    } finally {
      setImageUploading(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Enter a signature name');
      return;
    }
    try {
      const created = (await createMutation.mutateAsync({
        name,
        bodyHtml: '<div><br/></div>',
        accountId: accountId || null,
        isDefault: sorted.length === 0,
      })) as CrmEmailSignature;
      setSelectedId(created?.id || null);
      setDirty(false);
      closeNamePrompts();
      toast.success('Signature created');
    } catch (error: unknown) {
      toast.error(
        (error as { message?: string })?.message ||
          'Failed to create signature',
      );
    }
  };

  const openCreatePrompt = () => {
    setRenamePromptSig(null);
    setDeletePromptSig(null);
    setNewName('');
    setNamePromptOpen(true);
  };

  const openRenamePrompt = (sig: CrmEmailSignature) => {
    setNamePromptOpen(false);
    setDeletePromptSig(null);
    setRenamePromptSig(sig);
    setRenameValue(sig.name || '');
  };

  const openDeletePrompt = (sig: CrmEmailSignature) => {
    setNamePromptOpen(false);
    setRenamePromptSig(null);
    setDeletePromptSig(sig);
  };

  const closeNamePrompts = () => {
    setNamePromptOpen(false);
    setNewName('');
    setRenamePromptSig(null);
    setRenameValue('');
    setDeletePromptSig(null);
  };

  const resetEditorChrome = () => {
    setLinkOpen(false);
    setImageOpen(false);
    setFontMenuOpen(false);
    setSizeMenuOpen(false);
    setSourceMode(false);
    setSourceHtml('');
    setEditorIsEmpty(true);
    setEditorReady(false);
    setSelectedEditorImg(null);
    setImgChrome(null);
    closeNamePrompts();
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleAccountChange = (value: string) => {
    if (value === accountId) return;
    setAccountId(value);
    setSelectedId(null);
    setDirty(false);
    resetEditorChrome();
  };

  const handleRename = async () => {
    if (!renamePromptSig) return;
    const next = renameValue.trim();
    if (!next) {
      toast.error('Enter a signature name');
      return;
    }
    if (next === renamePromptSig.name) {
      closeNamePrompts();
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: renamePromptSig.id,
        patch: { name: next, accountId: renamePromptSig.accountId },
      });
      closeNamePrompts();
      toast.success('Renamed');
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleDelete = async () => {
    if (!deletePromptSig) return;
    try {
      await deleteMutation.mutateAsync({
        id: deletePromptSig.id,
        accountId: deletePromptSig.accountId,
      });
      if (selectedId === deletePromptSig.id) {
        setSelectedId(null);
        setDirty(false);
      }
      closeNamePrompts();
      toast.success('Signature deleted');
    } catch {
      toast.error('Failed to delete signature');
    }
  };

  const handleImport = async () => {
    if (!accountId) return;
    try {
      const result = await importMutation.mutateAsync({
        accountId,
        sync: true,
      });
      if (result.imported) {
        setDirty(false);
        if (result.signature?.id) setSelectedId(result.signature.id);
        // Force editor to show freshly pulled HTML (bypass dirty guard).
        const html = normalizeSignatureHtmlForEmail(
          result.signature?.bodyHtml || '',
        );
        requestAnimationFrame(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = html;
          }
        });
        toast.success(
          result.reason === 'synced'
            ? 'Pulled signature from Gmail'
            : 'Imported signature from Gmail',
        );
      } else if (result.reason === 'existing_crm_signature') {
        toast.message(
          'CRM already has signatures — use Pull from Gmail to refresh the Gmail-linked one',
        );
      } else if (result.reason === 'no_gmail_signature') {
        toast.message('No Gmail signature found on this mailbox');
      }
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'Import failed'));
    }
  };

  const handlePush = async () => {
    if (!selected) return;
    try {
      const html = dirty ? readEditorHtml() : selected.bodyHtml || '';
      if (html.length > GMAIL_SIGNATURE_MAX_CHARS) {
        toast.error(
          `Gmail allows max ${GMAIL_SIGNATURE_MAX_CHARS} characters (yours is ${html.length}). Use an https:// image URL instead of uploading a file.`,
        );
        return;
      }
      if (dirty) {
        await updateMutation.mutateAsync({
          id: selected.id,
          patch: {
            name: selected.name,
            bodyHtml: html,
            accountId: selected.accountId ?? accountId,
          },
        });
        setDirty(false);
      }
      await pushMutation.mutateAsync({
        signatureId: selected.id,
        accountId: selected.accountId ?? accountId,
      });
      toast.success('Pushed to Gmail');
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'Failed to push signature to Gmail'));
    }
  };

  const handleDefaultChange = async (kind: 'new' | 'reply', value: string) => {
    if (!accountId) return;
    try {
      await defaultsMutation.mutateAsync({
        accountId,
        ...(kind === 'new'
          ? { newSignatureId: value || null }
          : { replySignatureId: value || null }),
      });
      toast.success('Defaults updated');
    } catch {
      toast.error('Failed to update defaults');
    }
  };

  const handleOmitSeparatorChange = async (checked: boolean) => {
    if (!accountId) return;
    try {
      await defaultsMutation.mutateAsync({
        accountId,
        omitSignatureSeparator: checked,
      });
      toast.success('Signature preference updated');
    } catch {
      toast.error('Failed to update preference');
    }
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url || url === 'https://') {
      setLinkOpen(false);
      return;
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    execFormat('createLink', href);
    setLinkOpen(false);
    setLinkUrl('https://');
  };

  const clearEditorImageSelection = () => {
    if (selectedEditorImg) {
      selectedEditorImg.classList.remove(CRM_SIG_IMG_SELECTED);
    }
    setSelectedEditorImg(null);
    setImgChrome(null);
  };

  const refreshImgChrome = (img: HTMLImageElement | null) => {
    const shell = editorShellRef.current;
    if (!img || !shell || !editorRef.current?.contains(img)) {
      setImgChrome(null);
      return;
    }
    const shellRect = shell.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    setImgChrome({
      top: r.top - shellRect.top,
      left: r.left - shellRect.left,
      width: r.width,
      height: r.height,
    });
  };

  const selectEditorImage = (img: HTMLImageElement) => {
    if (selectedEditorImg && selectedEditorImg !== img) {
      selectedEditorImg.classList.remove(CRM_SIG_IMG_SELECTED);
    }
    img.classList.add(CRM_SIG_IMG_SELECTED);
    setSelectedEditorImg(img);
    requestAnimationFrame(() => refreshImgChrome(img));
  };

  const removeSelectedEditorImage = () => {
    if (!selectedEditorImg) return;
    selectedEditorImg.remove();
    clearEditorImageSelection();
    setDirty(true);
    setEditorIsEmpty(
      isSignatureEditorEmpty(editorRef.current?.innerHTML || ''),
    );
  };

  const resizeSelectedEditorImage = (delta: number) => {
    if (!selectedEditorImg) return;
    const next = applyImgDisplayWidth(
      selectedEditorImg,
      readImgDisplayWidth(selectedEditorImg) + delta,
    );
    selectedEditorImg.classList.add(CRM_SIG_IMG_SELECTED);
    setDirty(true);
    requestAnimationFrame(() => refreshImgChrome(selectedEditorImg));
    return next;
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target;
    if (target instanceof HTMLImageElement) {
      e.preventDefault();
      selectEditorImage(target);
      return;
    }
    clearEditorImageSelection();
  };

  const insertImageSrc = (src: string) => {
    const cleaned = rewriteSignatureResourceUrl(src.trim());
    if (!cleaned) return;
    if (/^data:/i.test(cleaned)) {
      toast.error(
        'Embedded images are not allowed — upload via File Server or paste an https:// URL',
      );
      return;
    }
    if (!/^https?:\/\//i.test(cleaned)) {
      toast.error('Image must use an http(s) URL');
      return;
    }
    const safeSrc = cleaned.replace(/"/g, '%22');
    restoreSelection();
    document.execCommand(
      'insertHTML',
      false,
      `<img src="${safeSrc}" alt="Signature Image" width="${SIGNATURE_IMG_DEFAULT_PX}" style="width: ${SIGNATURE_IMG_DEFAULT_PX}px; max-width: ${SIGNATURE_IMG_DEFAULT_PX}px; height: auto;" />`,
    );
    setDirty(true);
    requestAnimationFrame(() => {
      const imgs = editorRef.current?.querySelectorAll('img');
      const last = imgs?.[imgs.length - 1] as HTMLImageElement | undefined;
      if (last) selectEditorImage(last);
    });
  };

  const applyImageUrl = () => {
    const url = imageUrl.trim();
    if (!url || url === 'https://') {
      setImageUrlError('Enter an image URL');
      return;
    }
    void (async () => {
      setImageUrlValidating(true);
      setImageUrlError(null);
      try {
        const result = await validateRemoteImageUrl(url);
        if (!result.ok) {
          setImageUrlError(result.message);
          return;
        }
        insertImageSrc(result.url);
        setImageOpen(false);
        setImageUrl('https://');
        setImageUrlError(null);
      } finally {
        setImageUrlValidating(false);
      }
    })();
  };

  const handleImageFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    void (async () => {
      setImageUploading(true);
      try {
        const response = await fileUpload(file);
        if (response.status !== 200 && response.status !== 201) {
          throw new Error('File server upload failed');
        }
        const url = publicUrlFromUpload(response.data);
        if (!url) {
          throw new Error('File server did not return a public https URL');
        }
        insertImageSrc(url);
        setImageOpen(false);
        toast.success('Image uploaded and inserted');
      } catch (error: unknown) {
        toast.error(apiErrorMessage(error, 'Image upload failed'));
      } finally {
        setImageUploading(false);
        if (imageFileRef.current) imageFileRef.current.value = '';
      }
    })();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
        aria-label="Close signature settings"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Email signatures"
        className="relative z-10 flex h-[min(640px,90vh)] max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface-card shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-lg font-semibold leading-none text-foreground">
              Email signatures
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage signatures for this mailbox.
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 pt-0.5">
            <Select value={accountId} onValueChange={handleAccountChange}>
              <SelectTrigger
                className={cn(SELECT_TRIGGER_CLASS, 'max-w-[220px]')}
                aria-label="Email account"
              >
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className={SELECT_CONTENT_CLASS}>
                {accounts.map((a) => (
                  <SelectItem
                    key={a.id}
                    value={a.id}
                    className={SELECT_ITEM_BRAND}
                  >
                    {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[220px_1fr]">
          {/* Left: signature list */}
          <div className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {signaturesPending ? (
                <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Loading…
                </div>
              ) : sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted">
                    <PenLine size={16} className="text-brand" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    No signatures yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create one to use in new emails and replies.
                  </p>
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {sorted.map((sig) => {
                    const active = selected?.id === sig.id;
                    return (
                      <li key={sig.id}>
                        <div
                          className={cn(
                            'group flex items-center gap-1 rounded-md px-2 py-1.5',
                            active
                              ? 'bg-brand-muted text-brand'
                              : 'hover:bg-surface-elevated',
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 truncate text-left"
                            title={sig.name}
                            onClick={() => {
                              if (sig.id === selectedId) return;
                              if (dirty && selected && selected.id !== sig.id) {
                                void handleSave().then(() => {
                                  setEditorReady(false);
                                  setSelectedId(sig.id);
                                  setDirty(false);
                                });
                                return;
                              }
                              setEditorReady(false);
                              setSelectedId(sig.id);
                              setDirty(false);
                            }}
                          >
                            <span className="flex min-w-0 items-center gap-1">
                              <span
                                className={cn(
                                  'truncate text-sm font-medium',
                                  active ? 'text-brand' : 'text-foreground',
                                )}
                              >
                                {sig.name || 'Untitled signature'}
                              </span>
                              {sig.isDefault ? (
                                <span className="flex-shrink-0 rounded bg-brand/10 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                                  Default
                                </span>
                              ) : null}
                            </span>
                            {isGmailSynced(sig) ? (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                Synced with Gmail
                              </span>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            title="Rename"
                            className="rounded p-1 text-muted-foreground opacity-70 hover:bg-surface-card hover:opacity-100"
                            onClick={() => openRenamePrompt(sig)}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            className="rounded p-1 text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                            onClick={() => openDeletePrompt(sig)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-border p-2">
              <button
                type="button"
                disabled={busy}
                onClick={openCreatePrompt}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated disabled:opacity-50"
              >
                <Plus size={14} />
                Create new
              </button>
            </div>
          </div>

          {/* Right: rich editor */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            {signaturesPending ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <Loader2 size={18} className="animate-spin text-brand" />
                <p className="text-sm text-muted-foreground">
                  Loading signatures…
                </p>
              </div>
            ) : selected ? (
              <>
                <div
                  ref={editorShellRef}
                  className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
                >
                  <div
                    key={`${accountId}:${selected.id}`}
                    ref={editorRef}
                    contentEditable={!sourceMode}
                    suppressContentEditableWarning
                    dir="ltr"
                    onInput={() => {
                      const html = editorRef.current?.innerHTML || '';
                      setDirty(true);
                      setEditorIsEmpty(isSignatureEditorEmpty(html));
                      if (selectedEditorImg) {
                        requestAnimationFrame(() =>
                          refreshImgChrome(selectedEditorImg),
                        );
                      }
                    }}
                    onClick={handleEditorClick}
                    onScroll={() => {
                      if (selectedEditorImg)
                        refreshImgChrome(selectedEditorImg);
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Delete' || e.key === 'Backspace') &&
                        selectedEditorImg
                      ) {
                        e.preventDefault();
                        removeSelectedEditorImage();
                      }
                    }}
                    onBlur={saveSelection}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                    className={cn(
                      'h-full min-h-0 overflow-y-auto px-4 py-3 text-[16px] leading-relaxed text-foreground outline-none [&_font]:leading-normal [&_img]:cursor-pointer [&_span]:leading-normal',
                      // Preserve authored link colors / decorations from inline styles.
                      '[&_a]:no-underline',
                      // Selection ring via class — never written into img style attrs.
                      `[&_img.${CRM_SIG_IMG_SELECTED}]:outline [&_img.${CRM_SIG_IMG_SELECTED}]:outline-2 [&_img.${CRM_SIG_IMG_SELECTED}]:outline-brand [&_img.${CRM_SIG_IMG_SELECTED}]:outline-offset-2`,
                      sourceMode && 'hidden',
                    )}
                  />
                  {!sourceMode && editorReady && editorIsEmpty ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                      aria-hidden
                      onMouseDown={(e) => {
                        // Keep focus/caret in the editor on first line.
                        e.preventDefault();
                        if (editorRef.current) {
                          focusEditorAtStart(editorRef.current);
                        }
                      }}
                    >
                      <div className="pointer-events-none mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                        <PenLine size={20} className="text-brand" />
                      </div>
                      <p className="pointer-events-none text-sm font-semibold text-foreground">
                        Write your signature
                      </p>
                      <p className="pointer-events-none mt-1 max-w-xs text-xs text-muted-foreground">
                        Add your name, title, and contact details. Use the
                        toolbar for formatting, links, and images.
                      </p>
                    </div>
                  ) : null}
                  {sourceMode ? (
                    <textarea
                      value={sourceHtml}
                      onChange={(e) => {
                        setSourceHtml(e.target.value);
                        setDirty(true);
                      }}
                      spellCheck={false}
                      className="h-full min-h-0 w-full resize-none overflow-y-auto border-0 bg-surface-page px-4 py-3 font-mono text-xs leading-relaxed text-foreground outline-none"
                      placeholder="Raw HTML source…"
                    />
                  ) : null}
                  {!sourceMode && selectedEditorImg && imgChrome ? (
                    <div
                      className="absolute z-20 flex items-center gap-0.5 rounded-full border border-border bg-surface-card p-0.5 shadow-md"
                      style={{
                        top: Math.max(4, imgChrome.top - 10),
                        left: Math.min(
                          Math.max(4, imgChrome.left + imgChrome.width - 96),
                          (editorShellRef.current?.clientWidth || 0) - 100,
                        ),
                      }}
                    >
                      <button
                        type="button"
                        title="Smaller"
                        aria-label="Make image smaller"
                        disabled={
                          readImgDisplayWidth(selectedEditorImg) <=
                          SIGNATURE_IMG_MIN_PX
                        }
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          resizeSelectedEditorImage(-SIGNATURE_IMG_STEP_PX)
                        }
                        className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-surface-elevated disabled:opacity-40"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button
                        type="button"
                        title="Larger"
                        aria-label="Make image larger"
                        disabled={
                          readImgDisplayWidth(selectedEditorImg) >=
                          SIGNATURE_IMG_MAX_PX
                        }
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          resizeSelectedEditorImage(SIGNATURE_IMG_STEP_PX)
                        }
                        className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-surface-elevated disabled:opacity-40"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        type="button"
                        title="Remove image"
                        aria-label="Remove image"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={removeSelectedEditorImage}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="relative flex shrink-0 flex-wrap items-center gap-0.5 border-t border-border px-2 py-1.5">
                  <FormatBtn
                    icon={<Code2 size={14} />}
                    label={sourceMode ? 'Rich text view' : 'HTML source'}
                    active={sourceMode}
                    onClick={toggleSourceMode}
                  />
                  <FormatBtn
                    icon={<FileCode2 size={14} />}
                    label="Import HTML"
                    onClick={openImportHtmlDialog}
                  />
                  <div className="mx-1 h-4 w-px bg-border" />
                  {/* Gmail-style font family */}
                  <div className="relative">
                    <button
                      type="button"
                      title="Font"
                      aria-label="Font"
                      aria-expanded={fontMenuOpen}
                      disabled={sourceMode}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        saveSelection();
                        setSizeMenuOpen(false);
                        setLinkOpen(false);
                        setImageOpen(false);
                        setFontMenuOpen((p) => !p);
                      }}
                      className={cn(
                        'inline-flex h-7 max-w-[120px] items-center gap-0.5 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-surface-elevated hover:text-foreground disabled:opacity-40',
                        fontMenuOpen && 'bg-brand-muted text-brand',
                      )}
                    >
                      <span className="truncate">{activeFontLabel}</span>
                      <ChevronDown size={12} className="shrink-0 opacity-70" />
                    </button>
                    {fontMenuOpen ? (
                      <div className="absolute bottom-full left-0 z-30 mb-1 max-h-56 w-44 overflow-y-auto rounded-lg border border-border bg-surface-card py-1 shadow-md">
                        {SIGNATURE_FONT_OPTIONS.map((font) => (
                          <button
                            key={font.label}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              applyFontFamily(font.label, font.css)
                            }
                            className={cn(
                              'flex w-full px-3 py-1.5 text-left text-xs hover:bg-surface-elevated',
                              activeFontLabel === font.label &&
                                'font-semibold text-brand',
                            )}
                            style={{ fontFamily: font.css }}
                          >
                            {font.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Gmail-style size */}
                  <div className="relative">
                    <button
                      type="button"
                      title="Size"
                      aria-label="Size"
                      aria-expanded={sizeMenuOpen}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        saveSelection();
                        setFontMenuOpen(false);
                        setLinkOpen(false);
                        setImageOpen(false);
                        setSizeMenuOpen((p) => !p);
                      }}
                      className={cn(
                        'inline-flex h-7 items-center gap-0.5 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
                        sizeMenuOpen && 'bg-brand-muted text-brand',
                      )}
                    >
                      <span>{activeSizeLabel}</span>
                      <ChevronDown size={12} className="shrink-0 opacity-70" />
                    </button>
                    {sizeMenuOpen ? (
                      <div className="absolute bottom-full left-0 z-30 mb-1 w-32 overflow-hidden rounded-lg border border-border bg-surface-card py-1 shadow-md">
                        {SIGNATURE_SIZE_OPTIONS.map((size) => (
                          <button
                            key={size.key}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyFontSize(size.key)}
                            className={cn(
                              'flex w-full px-3 py-1.5 text-left hover:bg-surface-elevated',
                              activeSizeLabel === size.label &&
                                'font-semibold text-brand',
                              size.key === '2' && 'text-[11px]',
                              size.key === '3' && 'text-[13px]',
                              size.key === '4' && 'text-[15px]',
                              size.key === '5' && 'text-[17px]',
                            )}
                          >
                            {size.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mx-1 h-4 w-px bg-border" />
                  <FormatBtn
                    icon={<Bold size={14} />}
                    label="Bold"
                    onClick={() => execFormat('bold')}
                  />
                  <FormatBtn
                    icon={<Italic size={14} />}
                    label="Italic"
                    onClick={() => execFormat('italic')}
                  />
                  <FormatBtn
                    icon={<Underline size={14} />}
                    label="Underline"
                    onClick={() => execFormat('underline')}
                  />
                  <FormatBtn
                    icon={<Strikethrough size={14} />}
                    label="Strikethrough"
                    onClick={() => execFormat('strikeThrough')}
                  />
                  <div className="mx-1 h-4 w-px bg-border" />
                  <FormatBtn
                    icon={<AlignLeft size={14} />}
                    label="Align left"
                    onClick={() => applyAlign('left')}
                  />
                  <FormatBtn
                    icon={<AlignCenter size={14} />}
                    label="Align center"
                    onClick={() => applyAlign('center')}
                  />
                  <FormatBtn
                    icon={<AlignRight size={14} />}
                    label="Align right"
                    onClick={() => applyAlign('right')}
                  />
                  <div className="mx-1 h-4 w-px bg-border" />
                  <label
                    className="inline-flex cursor-pointer items-center gap-1 rounded p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                    title="Text color"
                  >
                    <span className="text-[11px] font-bold leading-none">
                      A
                    </span>
                    <input
                      type="color"
                      className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
                      defaultValue="#111827"
                      onMouseDown={(e) => e.preventDefault()}
                      onChange={(e) => applyForeColor(e.target.value)}
                    />
                  </label>
                  <label
                    className="inline-flex cursor-pointer items-center gap-0.5 rounded p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                    title="Highlight"
                  >
                    <Highlighter size={14} />
                    <input
                      type="color"
                      className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
                      defaultValue="#fef08a"
                      onMouseDown={(e) => e.preventDefault()}
                      onChange={(e) => applyHighlight(e.target.value)}
                    />
                  </label>
                  <div className="mx-1 h-4 w-px bg-border" />
                  <FormatBtn
                    icon={<Link2 size={14} />}
                    label="Link"
                    onClick={() => {
                      saveSelection();
                      setFontMenuOpen(false);
                      setSizeMenuOpen(false);
                      setImageOpen(false);
                      setLinkOpen((p) => !p);
                    }}
                  />
                  <FormatBtn
                    icon={<ImageIcon size={14} />}
                    label="Insert image"
                    onClick={() => {
                      saveSelection();
                      setFontMenuOpen(false);
                      setSizeMenuOpen(false);
                      setLinkOpen(false);
                      setImageUrlError(null);
                      setImageOpen((p) => !p);
                    }}
                  />
                  <FormatBtn
                    icon={<List size={14} />}
                    label="Bullet list"
                    onClick={() => execFormat('insertUnorderedList')}
                  />
                  <FormatBtn
                    icon={<ListOrdered size={14} />}
                    label="Numbered list"
                    onClick={() => execFormat('insertOrderedList')}
                  />
                  <FormatBtn
                    icon={<RemoveFormatting size={14} />}
                    label="Clear formatting"
                    onClick={() => execFormat('removeFormat')}
                  />
                  {isGmail ? (
                    <>
                      <div className="mx-1 h-4 w-px bg-border" />
                      <div
                        className="inline-flex items-center gap-0.5 rounded-md border border-brand/20 bg-brand-muted/70 p-0.5"
                        role="group"
                        aria-label="Gmail sync"
                      >
                        <button
                          type="button"
                          title="Pull from Gmail"
                          aria-label="Pull from Gmail"
                          disabled={busy || !accountId}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void handleImport()}
                          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-brand transition-colors hover:bg-surface-card disabled:pointer-events-none disabled:opacity-40"
                        >
                          {importMutation.isLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CloudDownload size={13} />
                          )}
                          Pull
                        </button>
                        <button
                          type="button"
                          title="Push to Gmail"
                          aria-label="Push to Gmail"
                          disabled={busy || !selected}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void handlePush()}
                          className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-brand transition-colors hover:bg-surface-card disabled:pointer-events-none disabled:opacity-40"
                        >
                          {pushMutation.isLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CloudUpload size={13} />
                          )}
                          Push
                        </button>
                      </div>
                    </>
                  ) : null}
                  {linkOpen ? (
                    <div className="absolute bottom-full left-2 right-2 mb-1 flex items-center gap-2 rounded-lg border border-border bg-surface-card p-2 shadow-md">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            applyLink();
                          }
                          if (e.key === 'Escape') setLinkOpen(false);
                        }}
                        placeholder="https://example.com"
                        className="h-8 min-w-0 flex-1 rounded-md border border-border px-2 text-sm outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={applyLink}
                        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkOpen(false)}
                        className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                  {imageOpen ? (
                    <div className="absolute bottom-full left-2 right-2 mb-1 flex flex-col gap-1.5 rounded-lg border border-border bg-surface-card p-2 shadow-md">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            if (imageUrlError) setImageUrlError(null);
                          }}
                          onBlur={() => {
                            const raw = imageUrl.trim();
                            if (!raw || raw === 'https://') return;
                            void (async () => {
                              setImageUrlValidating(true);
                              const result = await validateRemoteImageUrl(raw);
                              setImageUrlValidating(false);
                              if (!result.ok) setImageUrlError(result.message);
                            })();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyImageUrl();
                            }
                            if (e.key === 'Escape') {
                              setImageOpen(false);
                              setImageUrlError(null);
                            }
                          }}
                          placeholder="Or paste image URL (https://…)"
                          aria-invalid={Boolean(imageUrlError)}
                          className={cn(
                            'h-8 min-w-0 flex-1 rounded-md border bg-surface-page px-2 text-sm outline-none',
                            imageUrlError
                              ? 'border-destructive focus:border-destructive'
                              : 'border-border',
                          )}
                          autoFocus
                          disabled={imageUploading || imageUrlValidating}
                        />
                        <button
                          type="button"
                          onClick={applyImageUrl}
                          disabled={imageUploading || imageUrlValidating}
                          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground disabled:opacity-60"
                        >
                          {imageUrlValidating ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : null}
                          {imageUrlValidating ? 'Checking…' : 'Insert URL'}
                        </button>
                        <button
                          type="button"
                          onClick={() => imageFileRef.current?.click()}
                          disabled={imageUploading || imageUrlValidating}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-elevated disabled:opacity-60"
                          title="Upload to File Server and insert the public https URL"
                        >
                          {imageUploading ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : null}
                          {imageUploading ? 'Uploading…' : 'Upload'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageOpen(false);
                            setImageUrlError(null);
                          }}
                          disabled={imageUploading || imageUrlValidating}
                          className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <input
                          ref={imageFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={imageUploading}
                          onChange={(e) => handleImageFile(e.target.files)}
                        />
                      </div>
                      {imageUrlError ? (
                        <p className="px-0.5 text-[11px] text-destructive">
                          {imageUrlError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
                  <PenLine size={20} className="text-brand" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  No signature selected
                </p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Choose a signature from the list, or create a new one to start
                  editing.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={openCreatePrompt}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                >
                  <Plus size={14} />
                  Create new
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-t border-border px-5 py-4">
          <div>
            <p className="mb-2.5 text-sm font-semibold text-foreground">
              Signature defaults
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">
                  For new emails
                </span>
                <Select
                  value={newDefaultId || NO_SIGNATURE_VALUE}
                  disabled={busy || !sorted.length}
                  onValueChange={(value) =>
                    void handleDefaultChange(
                      'new',
                      value === NO_SIGNATURE_VALUE ? '' : value,
                    )
                  }
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="No signature" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLASS}>
                    <SelectItem
                      value={NO_SIGNATURE_VALUE}
                      className={SELECT_ITEM_BRAND}
                    >
                      No signature
                    </SelectItem>
                    {sorted.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className={SELECT_ITEM_BRAND}
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="block text-xs text-muted-foreground">
                  On reply / forward
                </span>
                <Select
                  value={replyDefaultId || NO_SIGNATURE_VALUE}
                  disabled={busy || !sorted.length}
                  onValueChange={(value) =>
                    void handleDefaultChange(
                      'reply',
                      value === NO_SIGNATURE_VALUE ? '' : value,
                    )
                  }
                >
                  <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="No signature" />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLASS}>
                    <SelectItem
                      value={NO_SIGNATURE_VALUE}
                      className={SELECT_ITEM_BRAND}
                    >
                      No signature
                    </SelectItem>
                    {sorted.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className={SELECT_ITEM_BRAND}
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-foreground">
              <Checkbox
                className="mt-0.5"
                checked={omitsSignatureSeparator(sorted)}
                disabled={busy || !accountId || !sorted.length}
                onCheckedChange={(checked) =>
                  void handleOmitSeparatorChange(checked === true)
                }
              />
              <span className="text-muted-foreground">
                Insert signature before quoted text in replies and omit the
                &quot;--&quot; separator.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {isGmail
                ? 'Save stores in CRM. Pull / Push syncs with Gmail.'
                : 'Outlook signatures are CRM-managed and applied when you send.'}
            </p>
            <button
              type="button"
              disabled={busy || !selected || !dirty}
              onClick={() => void handleSave()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {updateMutation.isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              Save
            </button>
          </div>
        </div>
      </div>

      {namePromptOpen ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/20 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface-card p-4 shadow-lg">
            <h3 className="text-lg font-semibold text-foreground">
              New signature
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a name for this signature. You can edit the content next.
            </p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreate();
                }
                if (e.key === 'Escape') closeNamePrompts();
              }}
              placeholder="e.g. Primary Signature, Sales Promo"
              maxLength={320}
              className="mt-3 h-9 w-full rounded-md border border-border bg-surface-page px-3 text-sm outline-none focus:border-brand/40"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNamePrompts}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !newName.trim()}
                onClick={() => void handleCreate()}
                className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {renamePromptSig ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/20 p-4">
          <div
            role="dialog"
            aria-label="Edit signature name"
            className="w-full max-w-sm rounded-xl border border-border bg-surface-card p-4 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-foreground">
              Edit signature name
            </h3>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleRename();
                }
                if (e.key === 'Escape') closeNamePrompts();
              }}
              maxLength={320}
              placeholder="Signature name"
              className="mt-3 h-9 w-full rounded-md border border-border bg-surface-page px-3 text-sm outline-none focus:border-brand/40"
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              {renameValue.length}/320
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNamePrompts}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !renameValue.trim()}
                onClick={() => void handleRename()}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                {updateMutation.isLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletePromptSig ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/20 p-4">
          <div
            role="dialog"
            aria-label="Delete signature"
            className="w-full max-w-sm rounded-xl border border-border bg-surface-card p-4 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-foreground">
              Delete &quot;{deletePromptSig.name || 'Untitled signature'}&quot;?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you sure you want to delete the signature &quot;
              {deletePromptSig.name || 'Untitled signature'}&quot;?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={closeNamePrompts}
                className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                {deleteMutation.isLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importHtmlOpen ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-foreground/30 p-3 sm:p-4">
          <div
            role="dialog"
            aria-label="Import Signature HTML"
            className="flex max-h-[min(860px,92vh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface-card shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-lg font-semibold leading-none text-foreground">
                  Import Signature HTML
                </h3>
                <p className="text-sm text-muted-foreground">
                  Paste HTML from Outlook or a web template. Auto-clean removes
                  Outlook UI chrome.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportHtmlOpen(false);
                  setImportHtmlRaw('');
                }}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
                aria-label="Close import dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={importHtmlAutoClean}
                  onCheckedChange={(checked) =>
                    setImportHtmlAutoClean(checked === true)
                  }
                />
                Auto-clean Outlook / browser junk
              </label>

              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">HTML</p>
                <textarea
                  value={importHtmlRaw}
                  onChange={(e) => setImportHtmlRaw(e.target.value)}
                  spellCheck={false}
                  placeholder="Paste raw HTML here…"
                  className="h-40 w-full resize-y rounded-md border border-border bg-surface-page px-3 py-2 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-brand/40"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  Live preview
                </p>
                <div
                  className="max-h-56 min-h-[120px] overflow-auto rounded-md border border-border bg-surface-page px-3 py-3 text-sm text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: sanitizePreviewHtml(importHtmlPreview),
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setImportHtmlOpen(false);
                  setImportHtmlRaw('');
                }}
                className="h-9 rounded-md px-4 text-sm text-muted-foreground hover:bg-surface-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !importHtmlRaw.trim()}
                onClick={() => void insertImportedHtml()}
                className="h-9 rounded-md bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                Insert Signature
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
