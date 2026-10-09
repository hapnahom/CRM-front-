'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Share2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { stageBadgeStyles } from '@/lib/stage-presets';
import { getCategory } from '../definitions';
import {
  exportGeneratedReportPdf,
  printGeneratedReportPdf,
} from '../export-report-pdf';
import { exportGeneratedReportExcel } from '../export-report-xlsx';
import type { GeneratedReport, ReportSection } from '../types';
import { ReportChartsGrid } from './ReportCharts';

type ReportResultProps = {
  report: GeneratedReport;
  onBack: () => void;
  onShare: () => void;
  onSchedule: () => void;
};

type ExportFormat = 'excel' | 'pdf';

const OVERVIEW_SECTION_ID = 'overview';

export function ExportActions({
  onExport,
  exporting = false,
}: {
  onExport: (format: ExportFormat) => void | Promise<void>;
  exporting?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const show = () => {
    clearCloseTimer();
    if (!exporting) setOpen(true);
  };

  const hideSoon = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const pick = (format: ExportFormat) => {
    setOpen(false);
    void onExport(format);
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
    >
      <Button
        type="button"
        size="sm"
        disabled={exporting}
        aria-expanded={open}
        aria-haspopup="menu"
        className="h-8 gap-1.5 bg-brand px-3 text-[11px] font-semibold text-white hover:bg-brand-hover disabled:opacity-70"
        onClick={() => {
          if (exporting) return;
          setOpen((prev) => !prev);
        }}
      >
        <Download size={13} />
        {exporting ? 'Downloading…' : 'Export'}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[200] mt-1 flex items-center gap-0.5 rounded-md border border-[#e5e7eb] bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={exporting}
            onClick={() => pick('pdf')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fef2f2] disabled:opacity-60"
          >
            <FileText size={13} />
            PDF
          </button>
          <span className="h-4 w-px bg-[#e5e7eb]" aria-hidden />
          <button
            type="button"
            role="menuitem"
            disabled={exporting}
            onClick={() => pick('excel')}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold text-[#047857] transition-colors hover:bg-[#ecfdf5] disabled:opacity-60"
          >
            <FileSpreadsheet size={13} />
            Excel
          </button>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  trend,
  accentColor,
  valueColor,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  accentColor?: string;
  valueColor?: string;
}) {
  const down = trend?.startsWith('-');
  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accentColor || '#ed6925' }}
      />
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold tracking-wide text-[#9ca3af] uppercase">
          {label}
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p
            className="text-[18px] font-semibold tracking-tight tabular-nums whitespace-pre-line"
            style={{ color: valueColor || '#111827' }}
          >
            {value}
          </p>
          {trend ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                down
                  ? 'bg-[#fef2f2] text-[#dc2626]'
                  : 'bg-[#ecfdf5] text-[#059669]',
              )}
            >
              {down ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {trend}
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className="mt-1 text-[11px] text-[#9ca3af] whitespace-pre-line">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Stage / Type: text uses that row's stage color (e.g. Converted → Converted stage color). */
function StageLikeCell({ label, color }: { label: string; color?: string }) {
  if (!label || label === '—') {
    return <span className="text-foreground">—</span>;
  }
  if (!color) {
    return <span className="text-foreground">{label}</span>;
  }
  const badge = stageBadgeStyles(color);
  return (
    <span
      className="inline-flex max-w-full items-center rounded-md px-2 py-1 text-[10px] font-medium"
      style={badge}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function stageColorLookupFromCharts(
  charts: GeneratedReport['charts'],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const chart of charts) {
    if (!String(chart.id).startsWith('pipeline-stages')) continue;
    for (const slice of chart.slices) {
      const key = String(slice.label || '')
        .trim()
        .toLowerCase();
      if (!key || !slice.color) continue;
      if (!map.has(key)) map.set(key, slice.color);
    }
  }
  return map;
}

function ResultTable({
  section,
  stageColorByLabel,
}: {
  section: ReportSection;
  stageColorByLabel?: Map<string, string>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-brand-border bg-brand-muted">
              {section.columns.map((col) => (
                <th
                  key={col.id}
                  className="px-3 py-2.5 text-[10px] font-bold tracking-wide text-brand uppercase"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, index) => {
              const showGroup =
                index === 0 ||
                section.rows[index - 1]?.groupLabel !== row.groupLabel;
              const stripe = index % 2 === 0;
              const stageValue = String(row.cells.stage ?? '')
                .trim()
                .toLowerCase();
              const fallbackStageColor =
                stageValue && stageColorByLabel
                  ? stageColorByLabel.get(stageValue)
                  : undefined;
              return (
                <Fragment key={row.id}>
                  {showGroup ? (
                    <tr className="bg-brand-muted/70">
                      <td
                        colSpan={section.columns.length}
                        className="px-3 py-1.5 text-[11px] font-semibold text-brand"
                      >
                        {row.groupLabel}
                      </td>
                    </tr>
                  ) : null}
                  <tr
                    className={cn(
                      'border-b border-border last:border-0',
                      stripe ? 'bg-[#f9fafb]' : 'bg-white',
                    )}
                  >
                    {section.columns.map((col) => {
                      const raw = row.cells[col.id];
                      const text =
                        raw == null || raw === '' ? '—' : String(raw);
                      const isStageLike =
                        col.id === 'stage' || col.id === 'opportunityType';
                      // Always resolve from the Stage cell value (e.g. Converted),
                      // so Type inherits that same stage color — not from "Lead"/"Deal" text.
                      const color = isStageLike
                        ? row.cellColors?.stage ||
                          row.cellColors?.[col.id] ||
                          fallbackStageColor
                        : row.cellColors?.[col.id];
                      return (
                        <td
                          key={col.id}
                          className="px-3 py-2.5 text-[11px] text-foreground tabular-nums whitespace-pre-line"
                        >
                          {isStageLike ? (
                            <StageLikeCell label={text} color={color} />
                          ) : (
                            text
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionNavButton({
  selected,
  title,
  subtitle,
  onClick,
  onRemove,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        'relative mb-0.5 flex w-full items-start gap-0.5 rounded-lg transition-colors',
        selected ? 'bg-brand-muted' : 'hover:bg-[#f8fafc]',
      )}
    >
      {selected ? (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand" />
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 px-3 py-2 text-left"
      >
        <span className="block text-[12px] font-semibold text-[#111827]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[10px] text-[#9ca3af]">
            {subtitle}
          </span>
        ) : null}
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="mt-1 mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-[#9ca3af] transition-colors hover:bg-[#fef2f2] hover:text-[#dc2626]"
          aria-label={`Remove ${title}`}
          title="Remove section"
        >
          <X size={14} strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}

function SortableSectionNavItem({
  id,
  selected,
  title,
  subtitle,
  onClick,
  onRemove,
}: {
  id: string;
  selected: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'relative mb-0.5 flex w-full items-start rounded-lg transition-colors',
        selected ? 'bg-brand-muted' : 'hover:bg-[#f8fafc]',
        isDragging
          ? 'z-20 cursor-grabbing bg-white shadow-md ring-1 ring-[#e5e7eb]'
          : 'cursor-grab',
      )}
      {...attributes}
      {...listeners}
    >
      {selected ? (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand" />
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 px-3 py-2 text-left"
      >
        <span className="block text-[12px] font-semibold text-[#111827]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[10px] text-[#9ca3af]">
            {subtitle}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="mt-1 mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#9ca3af] transition-colors hover:bg-[#fef2f2] hover:text-[#dc2626]"
        aria-label={`Remove ${title}`}
        title="Remove section"
      >
        <X size={14} strokeWidth={2.25} />
      </button>
    </div>
  );
}

function ReportContentSection({
  section,
  index,
  setSectionRef,
  stageColorByLabel,
}: {
  section: ReportSection;
  index: number;
  setSectionRef: (id: string, node: HTMLElement | null) => void;
  stageColorByLabel: Map<string, string>;
}) {
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      setSectionRef(section.id, node);
    },
    [section.id, setSectionRef],
  );

  return (
    <section
      ref={setRefs}
      id={section.id}
      className={cn('scroll-mt-4', index === 0 ? 'mt-2' : 'mt-10')}
    >
      <div className="mb-3">
        <h2 className="text-[14px] font-bold text-foreground">
          {section.title}
        </h2>
        <div className="mt-1.5 h-0.5 w-9 bg-brand" />
        <p className="mt-2 text-[12px] text-muted-foreground">
          {section.description}
        </p>
      </div>
      <ResultTable section={section} stageColorByLabel={stageColorByLabel} />
    </section>
  );
}

export function ReportResult({
  report,
  onBack,
  onShare,
  onSchedule,
}: ReportResultProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollLockRef = useRef(false);
  const scrollLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sections, setSections] = useState<ReportSection[]>(report.sections);
  const [showOverview, setShowOverview] = useState(true);
  const [activeId, setActiveId] = useState(
    report.sections[0]?.id ?? OVERVIEW_SECTION_ID,
  );
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    setSections(report.sections);
    setShowOverview(true);
    setActiveId(
      report.sections[0]?.id ??
        (report.kpis.length || report.charts.length ? OVERVIEW_SECTION_ID : ''),
    );
  }, [report]);

  const displayReport = useMemo(
    () => ({
      ...report,
      sections,
      kpis: showOverview ? report.kpis : [],
      charts: showOverview ? report.charts : [],
    }),
    [report, sections, showOverview],
  );

  const stageColorByLabel = useMemo(
    () => stageColorLookupFromCharts(report.charts),
    [report.charts],
  );

  const sortableIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const setSectionRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(id, node);
    else sectionRefs.current.delete(id);
  }, []);

  const removeSection = useCallback(
    (id: string) => {
      if (id === OVERVIEW_SECTION_ID) {
        setShowOverview(false);
        setActiveId((current) =>
          current === OVERVIEW_SECTION_ID ? (sections[0]?.id ?? '') : current,
        );
        toast.message('Overview removed from this report');
        return;
      }
      setSections((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setActiveId((current) => {
          if (current !== id) return current;
          if (showOverview) return OVERVIEW_SECTION_ID;
          return next[0]?.id ?? '';
        });
        return next;
      });
      sectionRefs.current.delete(id);
      toast.message('Section removed from this report');
    },
    [sections, showOverview],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const container = scrollRef.current;
    const target = sectionRefs.current.get(id);
    if (!container || !target) return;

    scrollLockRef.current = true;
    if (scrollLockTimerRef.current) clearTimeout(scrollLockTimerRef.current);

    setActiveId(id);
    container.scrollTo({
      top: target.offsetTop - container.offsetTop - 16,
      behavior: 'smooth',
    });

    scrollLockTimerRef.current = setTimeout(() => {
      scrollLockRef.current = false;
    }, 700);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const ids = [
      ...(showOverview ? [OVERVIEW_SECTION_ID] : []),
      ...sections.map((s) => s.id),
    ];

    const updateActiveSection = () => {
      if (scrollLockRef.current) return;

      const scrollTop = container.scrollTop;
      const viewportMid = scrollTop + container.clientHeight * 0.28;

      let nextActive = ids[0] ?? '';
      for (const id of ids) {
        const el = sectionRefs.current.get(id);
        if (!el) continue;
        const sectionTop = el.offsetTop - container.offsetTop;
        if (sectionTop <= viewportMid) {
          nextActive = id;
        }
      }

      setActiveId(nextActive);
    };

    updateActiveSection();
    container.addEventListener('scroll', updateActiveSection, {
      passive: true,
    });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      container.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
      if (scrollLockTimerRef.current) clearTimeout(scrollLockTimerRef.current);
    };
  }, [sections, showOverview]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const filename =
        format === 'pdf'
          ? await exportGeneratedReportPdf(displayReport)
          : await exportGeneratedReportExcel(displayReport);
      toast.success(`Downloaded ${filename}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Export failed';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printGeneratedReportPdf(displayReport);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Print failed';
      toast.error(message);
    } finally {
      setPrinting(false);
    }
  };

  const sectionNavItems = sections.map((section) => {
    const cat = getCategory(section.categoryId);
    return {
      id: section.id,
      title: section.title,
      subtitle: `${cat?.shortName ?? section.categoryId} · ${section.rows.length} rows`,
    };
  });

  const mobileNavItems = [
    ...(showOverview
      ? [
          {
            id: OVERVIEW_SECTION_ID,
            title: 'Overview',
          },
        ]
      : []),
    ...sectionNavItems.map(({ id, title }) => ({ id, title })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f8fa]">
      <header className="relative z-30 shrink-0 border-b border-[#e5e7eb] bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Back to report builder"
                title="Back to report builder"
              >
                <ArrowLeft className="size-5" strokeWidth={2.25} />
              </Button>
              <div className="min-w-0">
                <h2 className="m-0 text-[18px] font-semibold text-foreground">
                  {report.name}
                </h2>
                <p className="m-0 mt-1 text-[13px] text-muted-foreground">
                  {report.periodLabel}
                  {report.periodLabel ? ' · ' : ''}
                  Generated {report.generatedAt} by {report.generatedBy}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-[#e5e7eb] text-[11px]"
              onClick={onShare}
            >
              <Share2 size={13} />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-[#e5e7eb] text-[11px]"
              onClick={onSchedule}
            >
              <CalendarClock size={13} />
              Schedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-[#e5e7eb] text-[11px]"
              disabled={printing || exporting}
              onClick={() => void handlePrint()}
            >
              <Printer size={13} />
              {printing ? 'Preparing…' : 'Print'}
            </Button>
            <ExportActions onExport={handleExport} exporting={exporting} />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0">
          <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#e5e7eb] bg-white lg:flex">
            <p className="shrink-0 px-4 pt-4 pb-1 text-[10px] font-semibold tracking-wide text-[#9ca3af] uppercase">
              Sections
            </p>
            <p className="shrink-0 px-4 pb-2 text-[10px] text-[#9ca3af]">
              Hold a section to reorder · X to remove
            </p>
            <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {showOverview ? (
                <SectionNavButton
                  selected={activeId === OVERVIEW_SECTION_ID}
                  title="Overview"
                  subtitle="KPIs & charts"
                  onClick={() => scrollToSection(OVERVIEW_SECTION_ID)}
                  onRemove={() => removeSection(OVERVIEW_SECTION_ID)}
                />
              ) : null}
              {sectionNavItems.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortableIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {sectionNavItems.map((item) => (
                      <SortableSectionNavItem
                        key={item.id}
                        id={item.id}
                        selected={activeId === item.id}
                        title={item.title}
                        subtitle={item.subtitle}
                        onClick={() => scrollToSection(item.id)}
                        onRemove={() => removeSection(item.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : null}
            </nav>
          </aside>

          <main
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
          >
            <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-[#e5e7eb] bg-[#f7f8fa]/95 px-4 py-2 backdrop-blur-sm lg:hidden">
              <div className="flex gap-1 overflow-x-auto">
                {mobileNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                      activeId === item.id
                        ? 'bg-brand text-white'
                        : 'bg-white text-[#6b7280] ring-1 ring-[#e5e7eb]',
                    )}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>

            {showOverview ? (
              <section
                ref={(node) => setSectionRef(OVERVIEW_SECTION_ID, node)}
                id={OVERVIEW_SECTION_ID}
                className="scroll-mt-4"
              >
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {displayReport.filterTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#6b7280] ring-1 ring-[#e5e7eb]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {displayReport.kpis.length > 0 ? (
                  <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                    {displayReport.kpis.map((kpi) => (
                      <KpiCard key={kpi.id} {...kpi} />
                    ))}
                  </div>
                ) : null}

                <ReportChartsGrid charts={displayReport.charts} />
              </section>
            ) : null}

            {sections.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-[#9ca3af]">
                {showOverview
                  ? 'No table sections left. Remove was applied to all sections, or none were generated.'
                  : 'All sections removed from this report.'}
              </p>
            ) : (
              displayReport.sections.map((section, index) => (
                <ReportContentSection
                  key={section.id}
                  section={section}
                  index={index}
                  setSectionRef={setSectionRef}
                  stageColorByLabel={stageColorByLabel}
                />
              ))
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
