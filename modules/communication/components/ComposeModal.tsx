'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Paperclip,
  PenLine,
  Send,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCommunicationStore } from '@/store/uistate/features/communication/communicationStore';
import { useSendEmail } from '@/store/server/features/communication/mutations';
import {
  useGetEmailFolders,
  useGetEmailSignatures,
  useSearchMailboxPeople,
} from '@/store/server/features/communication/queries';
import type { CrmEmailSignature } from '@/store/server/features/communication/types';
import { EmailAddress } from '@/modules/communication/data/mockData';
import { CommunicationAvatar } from '@/modules/communication/hooks/useCommunicationAvatar';
import { normalizeSignatureHtmlForEmail } from '@/modules/communication/utils/signature-import-html.util';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const CRM_SIGNATURE_ATTR = 'data-crm-email-signature';

type SignatureChoice = 'default' | 'none' | string;

/** Remove previously injected CRM signature block(s) from the editor. */
function stripInjectedSignature(editor: HTMLElement) {
  editor
    .querySelectorAll(`[${CRM_SIGNATURE_ATTR}="1"]`)
    .forEach((node) => node.remove());
}

/** Trim trailing empty text / <br> left after stripping the preview signature. */
function trimTrailingComposeSpacer(editor: HTMLElement) {
  while (editor.lastChild) {
    const last = editor.lastChild;
    if (last.nodeType === Node.TEXT_NODE && !last.textContent?.trim()) {
      editor.removeChild(last);
      continue;
    }
    if (
      last.nodeType === Node.ELEMENT_NODE &&
      (last as HTMLElement).tagName === 'BR'
    ) {
      editor.removeChild(last);
      continue;
    }
    if (
      last.nodeType === Node.ELEMENT_NODE &&
      !(last as HTMLElement).textContent?.trim() &&
      !(last as HTMLElement).querySelector('img')
    ) {
      editor.removeChild(last);
      continue;
    }
    break;
  }
}

/**
 * Inject CRM signature at the end of the editor (above any quote the provider adds).
 * Leaves one blank line above the signature. Optionally includes Gmail-style "--".
 */
function injectCrmSignature(
  editor: HTMLElement,
  signatureHtml: string,
  options?: { omitSeparator?: boolean },
) {
  stripInjectedSignature(editor);

  const cleaned = normalizeSignatureHtmlForEmail(signatureHtml).trim();
  if (!cleaned) {
    return;
  }

  while (editor.lastChild) {
    const last = editor.lastChild;
    if (last.nodeType === Node.TEXT_NODE && !last.textContent?.trim()) {
      editor.removeChild(last);
      continue;
    }
    if (
      last.nodeType === Node.ELEMENT_NODE &&
      (last as HTMLElement).tagName === 'BR'
    ) {
      editor.removeChild(last);
      continue;
    }
    break;
  }

  // One blank line above "--" / signature.
  editor.appendChild(document.createElement('br'));

  const wrap = document.createElement('div');
  wrap.setAttribute(CRM_SIGNATURE_ATTR, '1');

  if (!options?.omitSeparator) {
    const sep = document.createElement('div');
    sep.setAttribute('data-crm-signature-sep', '1');
    sep.textContent = '--';
    wrap.appendChild(sep);
  }

  const body = document.createElement('div');
  body.innerHTML = cleaned;
  wrap.appendChild(body);

  editor.appendChild(wrap);
}

function shouldOmitSignatureSeparator(
  signatures: CrmEmailSignature[],
): boolean {
  return signatures.some(
    (s) => s.providerMetadata?.omitSignatureSeparator === true,
  );
}

/** Resolve which signature id (or none) is the mailbox default for this compose mode. */
function resolveAccountDefaultChoice(
  signatures: CrmEmailSignature[],
  mode: 'new' | 'reply' | 'replyAll' | 'forward' = 'new',
): SignatureChoice {
  const isReply = mode === 'reply' || mode === 'replyAll' || mode === 'forward';
  if (isReply) {
    if (signatures.some((s) => s.providerMetadata?.replyDefaultNone === true)) {
      return 'none';
    }
    const reply = signatures.find(
      (s) => s.providerMetadata?.isDefaultForReply === true,
    );
    if (reply) return reply.id;
  }
  const def = signatures.find((s) => s.isDefault) || signatures[0] || null;
  return def?.id || 'none';
}

function isModeDefaultSignature(
  sig: CrmEmailSignature,
  signatures: CrmEmailSignature[],
  mode: 'new' | 'reply' | 'replyAll' | 'forward',
): boolean {
  return resolveAccountDefaultChoice(signatures, mode) === sig.id;
}

function resolveSignatureHtml(
  choice: SignatureChoice,
  signatures: CrmEmailSignature[],
  mode: 'new' | 'reply' | 'replyAll' | 'forward' = 'new',
): string {
  if (choice === 'none') return '';
  // Legacy 'default' still resolves to the account default for this mode.
  const resolved =
    choice === 'default'
      ? resolveAccountDefaultChoice(signatures, mode)
      : choice;
  if (resolved === 'none') return '';
  const exact = signatures.find((s) => s.id === resolved);
  return exact?.bodyHtml || '';
}

function resolveSendSignature(
  choice: SignatureChoice,
  signatures: CrmEmailSignature[],
  mode: 'new' | 'reply' | 'replyAll' | 'forward' = 'new',
): { includeSignature: boolean; signatureId?: string } {
  if (choice === 'none') {
    return { includeSignature: false };
  }
  const resolved =
    choice === 'default'
      ? resolveAccountDefaultChoice(signatures, mode)
      : choice;
  if (resolved === 'none') {
    return { includeSignature: false };
  }
  return { includeSignature: true, signatureId: resolved };
}

function isPlausibleSuggestionEmail(email: string): boolean {
  if (!EMAIL_RE.test(email)) return false;
  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  if (local.length < 3) return false;
  if (/^\d+$/.test(local)) return false;
  return true;
}

function pruneSuggestionFragments(items: EmailAddress[]): EmailAddress[] {
  const byEmail = new Map(items.map((h) => [h.email, { ...h }]));

  for (const hit of items) {
    const at = hit.email.lastIndexOf('@');
    const local = hit.email.slice(0, at);
    const domain = hit.email.slice(at + 1);

    const parent = items.find((other) => {
      if (other.email === hit.email) return false;
      const oAt = other.email.lastIndexOf('@');
      const oLocal = other.email.slice(0, oAt);
      const oDomain = other.email.slice(oAt + 1);
      return (
        oDomain === domain &&
        oLocal.length > local.length &&
        oLocal.endsWith(local)
      );
    });

    if (!parent) continue;

    const parentCopy = byEmail.get(parent.email);
    if (parentCopy) {
      const hitIsBetterName =
        hit.name !== hit.email &&
        (parentCopy.name === parentCopy.email || parentCopy.name.includes('@'));
      if (hitIsBetterName) {
        parentCopy.name = hit.name;
      }
    }
    byEmail.delete(hit.email);
  }

  return Array.from(byEmail.values());
}
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

type PendingAttachment = {
  id: string;
  name: string;
  contentType: string;
  contentBytes: string;
  size: number;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File): Promise<PendingAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const contentBytes = result.replace(/^data:[^;]+;base64,/, '');
      if (!contentBytes) {
        reject(new Error(`Could not read ${file.name}`));
        return;
      }
      resolve({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        contentBytes,
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function parseRecipients(value: string): EmailAddress[] {
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.*?)\s*<([^>]+)>$/);
      if (match) {
        return { name: match[1].trim() || match[2], email: match[2].trim() };
      }
      return { name: entry, email: entry };
    });
}

function formatRecipients(list: EmailAddress[]): string {
  return list.map((r) => r.email).join(', ');
}

function SuggestionAvatar({
  name,
  email,
  accountId,
}: {
  name: string;
  email: string;
  accountId?: string | null;
}) {
  return (
    <CommunicationAvatar
      accountId={accountId}
      email={email}
      name={name}
      className="h-7 w-7 flex-shrink-0 rounded-full"
      fallbackClassName="h-7 w-7 flex-shrink-0 rounded-full bg-brand-muted text-[10px] font-semibold text-brand"
    />
  );
}

function RecipientField({
  label,
  value,
  onChange,
  placeholder,
  trailing,
  autoFocus,
  accountId,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  trailing?: React.ReactNode;
  autoFocus?: boolean;
  accountId?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => parseRecipients(value), [value]);
  const selectedEmails = useMemo(
    () => new Set(selected.map((s) => s.email.toLowerCase())),
    [selected],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: people = [], isFetching } = useSearchMailboxPeople(
    accountId,
    debouncedQuery,
  );

  const suggestions = useMemo(() => {
    const byEmail = new Map<string, EmailAddress>();

    for (const c of people) {
      const email = String(c.email || '')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
      if (!email || !EMAIL_RE.test(email) || selectedEmails.has(email)) {
        continue;
      }

      let name = String(c.name || '').trim();
      // Strip "Name <email…>" even when the closing ">" is missing / email has spaces
      name = name.replace(/\s*<[^>]*>?\s*$/g, '').trim();
      name = name.replace(/\s+[^\s<>]+@[^\s<>]+\.[^\s<>]+\s*$/gi, '').trim();
      if (!name || name.includes('@') || name.includes('<')) {
        name = email;
      }

      const existing = byEmail.get(email);
      const betterName =
        !existing ||
        (existing.name === existing.email && name !== email) ||
        (existing.name.includes('@') && !name.includes('@'));
      if (!existing || betterName) {
        byEmail.set(email, { name, email });
      }
    }

    return pruneSuggestionFragments(Array.from(byEmail.values()))
      .filter((h) => isPlausibleSuggestionEmail(h.email))
      .slice(0, 8);
  }, [people, selectedEmails]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions]);

  const addRecipient = (contact: EmailAddress) => {
    if (selectedEmails.has(contact.email.toLowerCase())) return;
    const next = [...selected, contact];
    onChange(formatRecipients(next));
    setQuery('');
    setOpen(false);
    setHighlight(0);
    inputRef.current?.focus();
  };

  const removeRecipient = (email: string) => {
    onChange(
      formatRecipients(
        selected.filter((s) => s.email.toLowerCase() !== email.toLowerCase()),
      ),
    );
  };

  const tryCommitTyped = () => {
    const typed = query.trim().replace(/,$/, '');
    if (!typed) return false;
    if (EMAIL_RE.test(typed)) {
      addRecipient({ name: typed, email: typed });
      return true;
    }
    const exact = suggestions.find(
      (c) =>
        c.email.toLowerCase() === typed.toLowerCase() ||
        c.name.toLowerCase() === typed.toLowerCase(),
    );
    if (exact) {
      addRecipient(exact);
      return true;
    }
    return false;
  };

  return (
    <div ref={rootRef} className="relative flex items-start gap-3 px-4 py-2">
      <label className="mt-1.5 w-14 flex-shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {selected.map((r) => (
            <span
              key={r.email}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs',
                EMAIL_RE.test(r.email)
                  ? 'border-border bg-surface-elevated text-foreground'
                  : 'border-destructive/30 bg-destructive/10 text-destructive',
              )}
              title={r.email}
            >
              <span className="truncate">{r.name || r.email}</span>
              <button
                type="button"
                onClick={() => removeRecipient(r.email)}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${r.email}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            dir="ltr"
            autoFocus={autoFocus}
            value={query}
            placeholder={selected.length === 0 ? placeholder : 'Add another…'}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => {
              if (query.trim()) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !query && selected.length > 0) {
                removeRecipient(selected[selected.length - 1].email);
                return;
              }
              if (e.key === 'ArrowDown' && suggestions.length > 0) {
                e.preventDefault();
                setOpen(true);
                setHighlight((h) => (h + 1) % suggestions.length);
                return;
              }
              if (e.key === 'ArrowUp' && suggestions.length > 0) {
                e.preventDefault();
                setHighlight(
                  (h) => (h - 1 + suggestions.length) % suggestions.length,
                );
                return;
              }
              if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
                if (suggestions.length > 0 && open) {
                  e.preventDefault();
                  addRecipient(suggestions[highlight] ?? suggestions[0]);
                  return;
                }
                if (tryCommitTyped()) {
                  e.preventDefault();
                }
              }
              if (e.key === 'Escape') setOpen(false);
            }}
            onBlur={() => {
              // allow click on suggestion first
              window.setTimeout(() => tryCommitTyped(), 120);
            }}
            className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />
          {trailing}
        </div>

        {open &&
          (suggestions.length > 0 ||
            (isFetching && debouncedQuery.length >= 2)) && (
            <div className="absolute left-16 right-4 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-surface-card shadow-md">
              {isFetching && suggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Searching directory…
                </p>
              ) : (
                suggestions.map((c, idx) => (
                  <button
                    key={c.email}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addRecipient(c);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                      idx === highlight
                        ? 'bg-brand-muted'
                        : 'hover:bg-surface-elevated',
                    )}
                  >
                    <SuggestionAvatar
                      name={c.name}
                      email={c.email}
                      accountId={accountId}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
      </div>
    </div>
  );
}

export default function ComposeModal() {
  const {
    compose,
    closeCompose,
    updateCompose,
    saveDraft,
    activeAccountId,
    setActiveFolder,
    setActiveFolderId,
    setSelectedEmailId,
  } = useCommunicationStore();
  const sendEmailMutation = useSendEmail();
  const { data: folders = [] } = useGetEmailFolders(activeAccountId);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showCc, setShowCc] = useState(!!compose.cc);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [signatureChoice, setSignatureChoice] =
    useState<SignatureChoice>('none');
  const [signatureMenuOpen, setSignatureMenuOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSelection = useRef<Range | null>(null);
  const signatureInjectKeyRef = useRef<string | null>(null);

  const composeMode =
    compose.composeMode || (compose.replyTo ? 'reply' : 'new');

  const { data: crmSignatures = [], isFetched: signaturesFetched } =
    useGetEmailSignatures(
      compose.isOpen ? activeAccountId : null,
      compose.isOpen && Boolean(activeAccountId),
    );

  const signatureDefaultsKey = useMemo(
    () =>
      crmSignatures
        .map(
          (s) =>
            `${s.id}:${s.isDefault ? 1 : 0}:${s.providerMetadata?.isDefaultForReply ? 1 : 0}:${s.providerMetadata?.replyDefaultNone ? 1 : 0}`,
        )
        .join('|'),
    [crmSignatures],
  );

  useEffect(() => {
    if (!compose.isOpen) {
      signatureInjectKeyRef.current = null;
      setSignatureChoice('none');
      setSignatureMenuOpen(false);
      setEditorEpoch(0);
      return;
    }
    setShowCc(!!compose.cc);
    setIsExpanded(false);
    setShowLinkInput(false);
    setAttachments([]);
    signatureInjectKeyRef.current = null;
    // Initialize editor HTML once when opening — avoid re-binding via
    // dangerouslySetInnerHTML which breaks list/link commands.
    // Clear inject key AFTER wipe so signature injection re-runs (otherwise
    // a prior inject is wiped by this rAF and the inject effect early-returns).
    requestAnimationFrame(() => {
      if (!bodyRef.current) return;
      bodyRef.current.innerHTML = compose.body || '';
      bodyRef.current.focus();
      signatureInjectKeyRef.current = null;
      setEditorEpoch((n) => n + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-init on open
  }, [compose.isOpen]);

  // When mailbox / mode / open is ready, select that account's default signature.
  useEffect(() => {
    if (!compose.isOpen || !signaturesFetched) return;
    const next = resolveAccountDefaultChoice(crmSignatures, composeMode);
    setSignatureChoice(next);
    signatureInjectKeyRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signatureDefaultsKey tracks list/default changes
  }, [
    compose.isOpen,
    activeAccountId,
    composeMode,
    signaturesFetched,
    signatureDefaultsKey,
  ]);

  // If the selected id disappeared (e.g. deleted), fall back to account default.
  useEffect(() => {
    if (!compose.isOpen || !signaturesFetched) return;
    if (signatureChoice === 'none' || signatureChoice === 'default') return;
    if (crmSignatures.some((s) => s.id === signatureChoice)) return;
    setSignatureChoice(resolveAccountDefaultChoice(crmSignatures, composeMode));
  }, [
    compose.isOpen,
    signaturesFetched,
    crmSignatures,
    signatureChoice,
    composeMode,
  ]);

  useEffect(() => {
    if (
      !compose.isOpen ||
      !signaturesFetched ||
      !editorEpoch ||
      !bodyRef.current
    ) {
      return;
    }

    const html = resolveSignatureHtml(
      signatureChoice,
      crmSignatures,
      composeMode,
    );
    // If we expect a signature but the editor was wiped (open rAF), force re-inject.
    const hasSig = Boolean(
      bodyRef.current.querySelector(`[${CRM_SIGNATURE_ATTR}="1"]`),
    );
    if (html && !hasSig) {
      signatureInjectKeyRef.current = null;
    }

    const injectKey = `${activeAccountId || ''}:${composeMode}:${signatureChoice}:${html}:${shouldOmitSignatureSeparator(crmSignatures) ? '1' : '0'}:${editorEpoch}`;
    if (signatureInjectKeyRef.current === injectKey) {
      return;
    }

    injectCrmSignature(bodyRef.current, html, {
      omitSeparator: shouldOmitSignatureSeparator(crmSignatures),
    });
    signatureInjectKeyRef.current = injectKey;
    updateCompose({ body: bodyRef.current.innerHTML });
  }, [
    compose.isOpen,
    signaturesFetched,
    crmSignatures,
    signatureChoice,
    activeAccountId,
    editorEpoch,
    composeMode,
    updateCompose,
  ]);

  if (!compose.isOpen) return null;

  const hasValidTo = parseRecipients(compose.to).some((r) =>
    EMAIL_RE.test(r.email),
  );
  const isSending = sendEmailMutation.isLoading;

  const handlePickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    if (attachments.length + incoming.length > MAX_ATTACHMENTS) {
      toast.error(`You can attach at most ${MAX_ATTACHMENTS} files`);
      return;
    }

    try {
      const next: PendingAttachment[] = [];
      for (const file of incoming) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`${file.name} exceeds the 3 MB limit`);
          continue;
        }
        next.push(await readFileAsBase64(file));
      }
      if (next.length) {
        setAttachments((prev) => [...prev, ...next]);
      }
    } catch (error: unknown) {
      toast.error(
        (error as { message?: string })?.message || 'Failed to attach file',
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const to = parseRecipients(compose.to).filter((r) =>
      EMAIL_RE.test(r.email),
    );
    const cc = parseRecipients(compose.cc).filter((r) =>
      EMAIL_RE.test(r.email),
    );
    if (to.length === 0) return;

    if (!activeAccountId) {
      toast.error('Connect a mailbox before sending');
      return;
    }

    const rawBody = bodyRef.current?.innerHTML || compose.body || '';
    // Strip preview signature; backend applies CRM signature once.
    const stripHost = document.createElement('div');
    stripHost.innerHTML = rawBody;
    stripInjectedSignature(stripHost);
    trimTrailingComposeSpacer(stripHost);
    const bodyHtml = stripHost.innerHTML;
    const sendMode =
      composeMode === 'reply' ||
      composeMode === 'replyAll' ||
      composeMode === 'forward'
        ? composeMode
        : 'new';
    const sendSig = resolveSendSignature(
      signatureChoice,
      crmSignatures,
      sendMode,
    );

    try {
      await sendEmailMutation.mutateAsync({
        accountId: activeAccountId,
        payload: {
          subject: compose.subject || '(No Subject)',
          bodyHtml,
          to,
          includeSignature: sendSig.includeSignature,
          ...(sendSig.signatureId ? { signatureId: sendSig.signatureId } : {}),
          ...(cc.length ? { cc } : {}),
          ...(compose.replyTo?.id && sendMode !== 'new'
            ? {
                replyToMessageId: compose.replyTo.id,
                sendMode,
              }
            : { sendMode: 'new' }),
          ...(attachments.length
            ? {
                attachments: attachments.map((a) => ({
                  name: a.name,
                  contentType: a.contentType,
                  contentBytes: a.contentBytes,
                })),
              }
            : {}),
        },
      });

      const sentFolder = folders.find((f) => f.wellKnownType === 'sent');
      if (sentFolder) {
        setActiveFolder('sent');
        setActiveFolderId(sentFolder.id);
        setSelectedEmailId(null);
      }

      toast.success('Email sent');
      closeCompose();
    } catch (error: unknown) {
      const message =
        (error as { message?: string })?.message || 'Failed to send email';
      toast.error(message);
    }
  };

  const handleSaveDraft = () => {
    saveDraft({
      subject: compose.subject,
      to: parseRecipients(compose.to),
      body: bodyRef.current?.innerHTML || compose.body,
    });
    closeCompose();
  };

  const focusEditor = () => {
    bodyRef.current?.focus();
  };

  const execFormat = (command: string, value?: string) => {
    focusEditor();
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
    document.execCommand(command, false, value);
    updateCompose({ body: bodyRef.current?.innerHTML || '' });
    focusEditor();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (bodyRef.current?.contains(range.commonAncestorContainer)) {
        savedSelection.current = range.cloneRange();
      }
    }
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url || url === 'https://') {
      setShowLinkInput(false);
      return;
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    execFormat('createLink', href);
    setShowLinkInput(false);
    setLinkUrl('https://');
  };

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border border-border bg-surface-card shadow-lg transition-all duration-200',
          isExpanded
            ? 'inset-4 rounded-xl sm:inset-6'
            : 'bottom-0 right-0 h-[min(760px,100vh)] w-full rounded-t-xl border-b-0 sm:bottom-4 sm:right-6 sm:h-[720px] sm:w-[680px] sm:rounded-xl sm:border-b',
        )}
        role="dialog"
        aria-label="Compose email"
        dir="ltr"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface-page px-4 py-2.5">
          <span className="text-sm font-semibold text-foreground">
            {composeMode === 'reply'
              ? 'Reply'
              : composeMode === 'replyAll'
                ? 'Reply all'
                : composeMode === 'forward'
                  ? 'Forward'
                  : 'New message'}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsExpanded((p) => !p)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              aria-label={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              onClick={closeCompose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 divide-y divide-border border-b border-border">
          <RecipientField
            label="To"
            value={compose.to}
            onChange={(to) => updateCompose({ to })}
            placeholder="Search contacts or type an email"
            autoFocus
            accountId={activeAccountId}
            trailing={
              <button
                type="button"
                onClick={() => setShowCc((p) => !p)}
                className={cn(
                  'ml-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors',
                  showCc
                    ? 'text-brand'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Cc
              </button>
            }
          />

          {showCc && (
            <RecipientField
              label="Cc"
              value={compose.cc}
              onChange={(cc) => updateCompose({ cc })}
              placeholder="Search contacts or type an email"
              accountId={activeAccountId}
            />
          )}

          <div className="flex items-center gap-3 px-4 py-2.5">
            <label className="w-14 flex-shrink-0 text-xs font-medium text-muted-foreground">
              Subject
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="Subject"
              value={compose.subject}
              onChange={(e) => updateCompose({ subject: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
          </div>
        </div>

        <div className="relative flex flex-shrink-0 flex-wrap items-center gap-0.5 border-b border-border px-3 py-1.5">
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
            icon={<List size={14} />}
            label="Bullet list"
            onClick={() => execFormat('insertUnorderedList')}
          />
          <FormatBtn
            icon={<ListOrdered size={14} />}
            label="Numbered list"
            onClick={() => execFormat('insertOrderedList')}
          />
          <div className="mx-1 h-4 w-px bg-border" />
          <FormatBtn
            icon={<Link2 size={14} />}
            label="Link"
            onClick={() => {
              saveSelection();
              setShowLinkInput((p) => !p);
            }}
          />

          <div className="mx-1 h-4 w-px bg-border" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setSignatureMenuOpen((p) => !p)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                signatureMenuOpen || signatureChoice !== 'none'
                  ? 'bg-brand-muted text-brand'
                  : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
              )}
              title="Signature"
            >
              <PenLine size={14} />
              <span className="hidden sm:inline">
                {signatureChoice === 'none'
                  ? 'No signature'
                  : crmSignatures.find((s) => s.id === signatureChoice)?.name ||
                    'Signature'}
              </span>
            </button>
            {signatureMenuOpen ? (
              <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-surface-card py-1 shadow-md">
                {crmSignatures.map((sig) => (
                  <button
                    key={sig.id}
                    type="button"
                    className={cn(
                      'flex w-full px-3 py-1.5 text-left text-xs hover:bg-surface-elevated',
                      signatureChoice === sig.id && 'font-semibold text-brand',
                    )}
                    onClick={() => {
                      setSignatureChoice(sig.id);
                      setSignatureMenuOpen(false);
                    }}
                  >
                    {sig.name}
                    {isModeDefaultSignature(sig, crmSignatures, composeMode)
                      ? ' (default)'
                      : ''}
                  </button>
                ))}
                <button
                  type="button"
                  className={cn(
                    'flex w-full border-t border-border px-3 py-1.5 text-left text-xs hover:bg-surface-elevated',
                    signatureChoice === 'none' && 'font-semibold text-brand',
                  )}
                  onClick={() => {
                    setSignatureChoice('none');
                    setSignatureMenuOpen(false);
                  }}
                >
                  No signature
                </button>
              </div>
            ) : null}
          </div>

          {showLinkInput && (
            <div className="absolute left-3 right-3 top-full z-20 mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface-card p-2 shadow-md">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                  if (e.key === 'Escape') setShowLinkInput(false);
                }}
                placeholder="https://example.com"
                className="h-8 min-w-0 flex-1 rounded-md border border-border px-2 text-sm outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
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
                onClick={() => setShowLinkInput(false)}
                className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-elevated"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          dir="ltr"
          data-placeholder="Write your message…"
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onInput={() => {
            updateCompose({ body: bodyRef.current?.innerHTML || '' });
          }}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-4 py-3 text-left text-sm leading-relaxed text-foreground outline-none',
            '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
            '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
            '[&_li]:my-0.5',
            // Do not force link color/underline — signatures ship their own inline styles.
            'empty:before:pointer-events-none empty:before:text-muted-foreground/45 empty:before:content-[attr(data-placeholder)]',
          )}
          style={{
            direction: 'ltr',
            textAlign: 'left',
            unicodeBidi: 'plaintext',
          }}
        />

        {attachments.length > 0 && (
          <div className="flex flex-shrink-0 flex-wrap gap-2 border-t border-border px-4 py-2">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-xs text-foreground"
              >
                <Paperclip
                  size={12}
                  className="flex-shrink-0 text-muted-foreground"
                />
                <span className="truncate font-medium">{file.name}</span>
                <span className="flex-shrink-0 text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((a) => a.id !== file.id),
                    )
                  }
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-surface-card hover:text-foreground"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-shrink-0 items-center justify-between border-t border-border bg-surface-page px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!hasValidTo || isSending}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition-colors',
                hasValidTo && !isSending
                  ? 'bg-brand hover:bg-brand-hover'
                  : 'cursor-not-allowed bg-muted text-muted-foreground',
              )}
            >
              <Send size={13} />
              {isSending ? 'Sending…' : 'Send'}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              Save draft
            </button>
          </div>

          <div className="flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void handlePickFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_ATTACHMENTS || isSending}
              className={cn(
                'rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground',
                (attachments.length >= MAX_ATTACHMENTS || isSending) &&
                  'cursor-not-allowed opacity-50',
              )}
              aria-label="Attach file"
              title={
                attachments.length >= MAX_ATTACHMENTS
                  ? `Maximum ${MAX_ATTACHMENTS} attachments`
                  : 'Attach file (max 3 MB each)'
              }
            >
              <Paperclip size={15} />
            </button>
            <button
              type="button"
              onClick={closeCompose}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Discard"
              title="Discard"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FormatBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-surface-elevated hover:text-foreground"
    >
      {icon}
    </button>
  );
}
