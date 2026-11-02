import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  DataTable,
  MetricPanel,
  StatusPill,
  useActivity,
  useDemo,
  useDemoState,
  type DataTableColumn,
} from "@kit";
import { BRAND, NAV, PERSONA } from "../nav";
import {
  FIRMS,
  REQUESTS,
  businessDayCountdown,
  computeMetrics,
  effectiveAuthorizationStatus,
  effectiveReleasedDate,
  effectiveStatus,
  releasedLabel,
  type RecordsRequest,
  type RequestOverrides,
} from "../seed";
import { useScrollTop } from "./_shared";

function fullDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const TONE: Record<string, "primary" | "accent" | "muted"> = {
  released: "primary",
  "in release review": "accent",
  exception: "accent",
  "in progress": "muted",
  received: "muted",
};

export default function Requests() {
  const navigate = useNavigate();
  const { logAction } = useActivity();
  const { completed } = useDemo();
  const [overrides] = useDemoState<RequestOverrides>("requestOverrides", {});
  const [firm, setFirm] = useState(FIRMS[0]);
  const [appliedFirm, setAppliedFirm] = useState<string | null>(null);
  useScrollTop();

  const rows = useMemo(
    () => [...REQUESTS].sort((a, b) => b.received_date.getTime() - a.received_date.getTime()),
    []
  );
  const visible = appliedFirm ? rows.filter((r) => r.requesting_firm === appliedFirm) : rows;

  const columns: DataTableColumn<RecordsRequest>[] = [
    {
      key: "patient_name",
      header: "Patient",
      render: (r) => (
        <span>
          <span className="font-medium">{r.patient_name}</span>
          <span className="block text-xs text-[var(--pf-muted)]">Request {r.request_id}</span>
        </span>
      ),
    },
    { key: "request_id", header: "Request", render: (r) => `#${r.request_id}` },
    { key: "requesting_firm", header: "Law firm", render: (r) => r.requesting_firm },
    { key: "received_via", header: "Channel", render: (r) => r.received_via },
    { key: "request_type", header: "Request type", render: (r) => r.request_type },
    {
      key: "authorization_status",
      header: "Authorization",
      render: (r) => {
        const override = overrides[r.request_id];
        const attached =
          r.request_id === "5208" &&
          (Boolean(override?.attached) || completed.has("attach-corrected-authorization"));
        const label = effectiveAuthorizationStatus(r, override, attached);
        const checked =
          label === "Signed, in date range" || label === "Checked, in date range" || label.startsWith("Corrected");
        return <StatusPill label={label} tone={checked ? "muted" : "accent"} />;
      },
    },
    {
      key: "due_date",
      header: "Firm due date",
      render: (r) => {
        const override = overrides[r.request_id];
        const status = effectiveStatus(r, override);
        return (
          <span>
            {fullDate(r.due_date)}
            <span className="block text-xs text-[var(--pf-muted)]">
              {status === "released"
                ? releasedLabel(effectiveReleasedDate(r, override))
                : businessDayCountdown(r.due_date)}
            </span>
          </span>
        );
      },
    },
    {
      key: "request_status",
      header: "Status",
      render: (r) => {
        const status = effectiveStatus(r, overrides[r.request_id]);
        return <StatusPill label={status} tone={TONE[status] ?? "muted"} />;
      },
    },
  ];

  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA.name}
      personaRole={PERSONA.role}
      nav={NAV}
    >
      <div className="max-w-3xl">
        <h1 className="text-3xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
          Requests
        </h1>
        <p className="mt-2 text-[var(--pf-muted)]">
          Every records and itemized bill request from law firms, newest first, with the channel it arrived on and the
          firm&apos;s due date.
        </p>
      </div>

      <div className="mt-6">
        <MetricPanel metrics={computeMetrics(REQUESTS, overrides)} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--pf-muted)]/20 p-4">
        <label className="text-sm">
          <span className="block text-xs text-[var(--pf-muted)]">Law firm</span>
          <select
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            className="mt-1 rounded-lg border border-[var(--pf-muted)]/30 bg-[var(--pf-surface)] px-2 py-1.5 text-sm"
          >
            {FIRMS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-action="filter-by-firm"
          onClick={() => {
            setAppliedFirm(firm);
            logAction("Filtered requests by law firm", "filter-by-firm");
          }}
          className="rounded-lg bg-[var(--pf-primary)] px-3 py-1.5 text-sm font-medium text-[var(--pf-surface)]"
        >
          Filter by law firm
        </button>
        {appliedFirm && (
          <button
            type="button"
            onClick={() => setAppliedFirm(null)}
            className="rounded-lg border border-[var(--pf-muted)]/30 px-3 py-1.5 text-sm"
          >
            Show every firm
          </button>
        )}
        <p className="text-xs text-[var(--pf-muted)]">
          {appliedFirm
            ? `Showing ${visible.length} requests from ${appliedFirm}`
            : `Showing all ${visible.length} requests`}
        </p>
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.request_id}
          onRowClick={(r) => {
            logAction("Opened records request", "open-request");
            navigate(`/request?case=${r.request_id}`);
          }}
          dataTour="tracker-table"
          rowActionId="open-request"
          mobileStatusKey="request_status"
          mobileUrgencyKey="due_date"
        />
      </div>

      <p className="mt-4 text-xs text-[var(--pf-muted)]">
        Due dates are the firm&apos;s, not the practice&apos;s. A request stays on this list until its packet is
        released.
      </p>
    </AppShell>
  );
}
