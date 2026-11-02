// Seed data for the records request and release desk. Every date is built
// with rel() / addBusinessDays() and every value comes from the kit's
// deterministic generators, so the same demo always renders the same rows.

import {
  addBusinessDays,
  businessDaysBetween,
  createNameGenerator,
  fakeMrn,
  fakePhone,
  pickOne,
  pickWeighted,
  randomInt,
  rel,
  rng,
  CPT_CODES,
} from "@kit";

export interface LedgerLine {
  id: string;
  request_id: string;
  mrn: string;
  date_of_service: Date;
  cpt_code: string;
  service_label: string;
  charge: number;
  payment: number;
  payer_type: string;
}

export interface RequestEvent {
  id: string;
  request_id: string;
  author: string;
  timestamp: Date;
  event_text: string;
}

export interface RecordsRequest {
  request_id: string;
  patient_name: string;
  mrn: string;
  chart_dob: Date;
  authorization_dob: Date;
  same_name_charts: number;
  date_of_injury: Date;
  requesting_firm: string;
  requester_contact: string;
  received_via: string;
  request_type: string;
  date_range_requested: string;
  received_date: Date;
  due_date: Date;
  authorization_status: string;
  request_status: string;
  exception_reason: string;
  pages_count: number;
  billed_total: number;
  payments_posted: number;
  balance_due: number;
  clinical_summary: string;
  released_date: Date | null;
}

/** What a visitor changes on a request. Everything else stays as seeded. */
export interface RequestOverride {
  attached?: boolean;
  attachedAt?: string;
  movedToReview?: boolean;
  movedAt?: string;
  released?: boolean;
  releasedAt?: string;
  sentBack?: boolean;
  sentBackAt?: string;
  sentBackReason?: string;
}
export type RequestOverrides = Record<string, RequestOverride>;

export interface SameNameChart {
  mrn: string;
  dob: Date;
  note: string;
  matchesAuthorization: boolean;
}

const rand = rng("records-request-release-queue-v1");
const patientNames = createNameGenerator(rand);
const contactNames = createNameGenerator(rand);

export const FIRMS = [
  "Fenwright & Sallow Injury Law",
  "Marrow Creek Trial Lawyers",
  "Harlan & Petty",
  "Oakline Legal Group",
  "Beaumont Injury Counsel",
  "Ridgeline Claim Partners",
];

const CHANNELS: [string, number][] = [
  ["Retrieval portal", 60],
  ["Fax", 25],
  ["Email", 15],
];

const REQUEST_TYPES: [string, number][] = [
  ["Records and itemized bill", 45],
  ["Records only", 25],
  ["Itemized bill and final balance", 20],
  ["Updated records since last request", 10],
];

const STATUSES: [string, number][] = [
  ["released", 55],
  ["in progress", 20],
  ["received", 10],
  ["exception", 8],
  ["in release review", 7],
];

const EXCEPTION_REASONS = [
  "Authorization date of birth does not match chart",
  "Authorization expired",
  "Authorization not signed by patient",
  "Date range outside treatment dates",
  "Balance quoted by firm differs from ledger",
];

// Every request that is held for an authorization problem shows the same
// status on Requests and on Exceptions. A balance question is not an
// authorization problem, so it keeps the checked status.
const AUTH_STATUS_BY_REASON: Record<string, string> = {
  "Authorization date of birth does not match chart": "Birth date mismatch",
  "Authorization expired": "Expired before the release date",
  "Authorization not signed by patient": "Not signed by the patient",
  "Date range outside treatment dates": "Date range outside treatment dates",
};

const SUMMARIES = [
  "Lumbar strain after rear-end collision, 14 therapy visits, one epidural injection",
  "Cervical strain and headaches after a sideswipe, 9 therapy visits",
  "Knee sprain from a fall at work, MRI and 6 therapy visits",
  "Rotator cuff tear after a loading injury, 12 therapy visits",
  "Herniated disc with leg pain after a rear-end collision, two epidural injections",
  "Wrist sprain after a slip, 4 therapy visits and a shoulder X-ray",
];

const PAYER_TYPES: [string, number][] = [
  ["LOP", 45],
  ["PIP", 35],
  ["workers' comp", 20],
];

const SERVICES: [string, number][] = [
  ["72148", 14],
  ["73721", 8],
  ["73030", 10],
  ["29881", 4],
  ["97110", 40],
  ["64483", 12],
  ["20610", 12],
];

const SERVICE_CHARGE: Record<string, number> = {
  "72148": 1650,
  "73721": 1580,
  "73030": 140,
  "29881": 6800,
  "97110": 110,
  "64483": 2400,
  "20610": 640,
};

const HIGH_VALUE_SERVICES: [string, number][] = [
  ["72148", 24],
  ["73721", 20],
  ["29881", 10],
  ["64483", 34],
  ["20610", 12],
];

const CPT_LABEL: Record<string, string> = {};
for (const entry of CPT_CODES) CPT_LABEL[entry.code] = entry.label;

const mrnFor = (): string => fakeMrn(rand);

function usd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function makeLedger(requestId: string, mrn: string, injury: Date): LedgerLine[] {
  // Request 5208 is the lumbar strain in its clinical summary: three
  // therapeutic exercise visits and one epidural injection, all inside the
  // date range the firm asked for.
  if (requestId === "5208") {
    const treatments = [
      { code: "97110", offset: 24 },
      { code: "97110", offset: 58 },
      { code: "64483", offset: 96 },
      { code: "97110", offset: 140 },
    ];
    return treatments.map((t, i) => ({
      id: `${requestId}-l${i + 1}`,
      request_id: requestId,
      mrn,
      date_of_service: new Date(injury.getTime() + t.offset * 86400000),
      cpt_code: t.code,
      service_label: CPT_LABEL[t.code] ?? "Office visit",
      charge: SERVICE_CHARGE[t.code] ?? 200,
      payment: 0,
      payer_type: "LOP",
    }));
  }

  const codes: string[] = [pickWeighted(rand, HIGH_VALUE_SERVICES)];
  codes.push(pickWeighted(rand, SERVICES));
  codes.push(pickWeighted(rand, SERVICES));
  const payer = pickWeighted(rand, PAYER_TYPES);
  const lines: LedgerLine[] = [];
  // A date of service can never fall after today, and never before the injury.
  const daysSinceInjury = Math.max(6, Math.floor((Date.now() - injury.getTime()) / 86400000));
  codes.forEach((code, i) => {
    const charge = SERVICE_CHARGE[code] ?? 200;
    let payment = 0;
    if (payer === "PIP") payment = Math.round(charge * (0.4 + rand() * 0.35));
    else if (payer === "workers' comp") payment = Math.round(charge * (0.5 + rand() * 0.4));
    const offset = randomInt(rand, 5, Math.min(240, daysSinceInjury));
    const dos = new Date(injury.getTime() + offset * 86400000);
    lines.push({
      id: `${requestId}-l${i + 1}`,
      request_id: requestId,
      mrn,
      date_of_service: dos,
      cpt_code: code,
      service_label: CPT_LABEL[code] ?? "Office visit",
      charge,
      payment,
      payer_type: payer,
    });
  });
  return lines;
}

/** The two charts that share the name Andre Salcedo. */
const sameNameChartExport: Record<string, SameNameChart[]> = {};

function buildRecord(idNum: number, isEdgeCase: boolean): { request: RecordsRequest; ledger: LedgerLine[] } {
  const requestId = String(idNum);
  const yearsAgo = randomInt(rand, 20, 70);
  let chartDob = rel(-(yearsAgo * 365 + randomInt(rand, 0, 364)), "00:00");
  if (isEdgeCase) {
    // Fixed calendar shape (March 7) so the swapped form is a valid date.
    chartDob = new Date(chartDob.getFullYear(), 2, 7);
  }
  const receivedAt = isEdgeCase ? rel(-3, "08:05") : rel(-randomInt(rand, 0, 13), "09:00");
  const dueAt = isEdgeCase
    ? rel(2, "17:00")
    : new Date(receivedAt.getTime() + randomInt(rand, 10, 30) * 86400000);
  const status = isEdgeCase ? "exception" : pickWeighted(rand, STATUSES);
  const reason = isEdgeCase
    ? "Authorization date of birth does not match chart"
    : status === "exception"
      ? pickOne(rand, EXCEPTION_REASONS)
      : "";

  const injury = isEdgeCase ? rel(-420, "00:00") : rel(-randomInt(rand, 60, 900), "00:00");
  const mrn = isEdgeCase ? "DEMO-204417" : mrnFor();
  const patientName = isEdgeCase ? "Andre Salcedo" : patientNames.next();
  const ledger = makeLedger(requestId, mrn, injury);
  const billed = ledger.reduce((sum, line) => sum + line.charge, 0);
  const paid = ledger.reduce((sum, line) => sum + line.payment, 0);

  let authorizationDob = new Date(chartDob);
  let sameNameCharts = 1;
  if (isEdgeCase) {
    // Day and month swapped: March 7 becomes July 3 of the same year.
    authorizationDob = new Date(chartDob.getFullYear(), 6, 3);
    sameNameCharts = 2;
  }

  const releaseStatus = status === "released";
  const releaseAt = releaseStatus ? addBusinessDays(receivedAt, randomInt(rand, 2, 6)) : null;
  const authorizationStatus = isEdgeCase
    ? "Birth date mismatch"
    : status === "exception"
      ? AUTH_STATUS_BY_REASON[reason] ?? "Signed, in date range"
      : "Signed, in date range";
  const request: RecordsRequest = {
    request_id: requestId,
    patient_name: patientName,
    mrn,
    chart_dob: chartDob,
    authorization_dob: authorizationDob,
    same_name_charts: sameNameCharts,
    date_of_injury: injury,
    requesting_firm: isEdgeCase ? "Fenwright & Sallow Injury Law" : pickOne(rand, FIRMS),
    requester_contact: `Paralegal ${contactNames.next()}, ${fakePhone(rand)}`,
    received_via: isEdgeCase ? "Retrieval portal" : pickWeighted(rand, CHANNELS),
    request_type: isEdgeCase ? "Records and itemized bill" : pickWeighted(rand, REQUEST_TYPES),
    date_range_requested: `${longDate(injury)} through ${longDate(rel(0))}`,
    received_date: receivedAt,
    due_date: dueAt,
    authorization_status: authorizationStatus,
    request_status: status,
    exception_reason: reason,
    pages_count: isEdgeCase ? 46 : randomInt(rand, 12, 340),
    billed_total: billed,
    payments_posted: paid,
    balance_due: billed - paid,
    clinical_summary: isEdgeCase ? SUMMARIES[0] : pickOne(rand, SUMMARIES),
    // A release can never be dated in the future, even for a request that
    // arrived this morning.
    released_date: releaseAt && releaseAt.getTime() > Date.now() ? new Date() : releaseAt,
  };

  if (isEdgeCase) {
    const otherDob = new Date(chartDob.getFullYear() - 9, 1, 11);
    sameNameChartExport[requestId] = [
      {
        mrn,
        dob: chartDob,
        note: "Chart on file for the request. The signed authorization lists the day and month swapped.",
        matchesAuthorization: false,
      },
      {
        mrn: "DEMO-483920",
        dob: otherDob,
        note: "Second patient with the same name. The authorization birth date does not match this chart either.",
        matchesAuthorization: false,
      },
    ];
  }

  return { request, ledger };
}

const REQUESTS: RecordsRequest[] = [];
const LEDGER_LINES: LedgerLine[] = [];

// Request 5208 comes first so its exception row is always among the first
// five rows of the Exceptions table (the table never reorders seed data).
const edge = buildRecord(5208, true);
REQUESTS.push(edge.request);
LEDGER_LINES.push(...edge.ledger);

for (let id = 5100; id <= 5239; id++) {
  if (id === 5208) continue;
  const built = buildRecord(id, false);
  REQUESTS.push(built.request);
  LEDGER_LINES.push(...built.ledger);
}

export { REQUESTS, LEDGER_LINES };
export const SAME_NAME_CHARTS = sameNameChartExport;

// Make sure the release review queue always has work in it, even if the
// deterministic weight roll happens to come up short.
{
  const inReview = REQUESTS.filter((r) => r.request_status === "in release review").length;
  if (inReview < 4) {
    let added = 0;
    for (const r of REQUESTS) {
      if (added >= 4 - inReview) break;
      if (r.request_status === "received" || r.request_status === "in progress") {
        r.request_status = "in release review";
        added++;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Request events

const TESSA = "Tessa Brannigan";
const BILLING = "Joaquin Reyes (PI billing lead)";

function atTime(day: Date, hours: number, minutes: number): Date {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function eventsFor(request: RecordsRequest): RequestEvent[] {
  const events: RequestEvent[] = [];
  let n = 0;
  const add = (author: string, timestamp: Date, text: string) => {
    // A request history never contains a step that has not happened yet.
    if (timestamp.getTime() > Date.now()) return;
    n++;
    events.push({ id: `${request.request_id}-e${n}`, request_id: request.request_id, author, timestamp, event_text: text });
  };

  add(TESSA, atTime(request.received_date, 8, 5), `Request received through the ${request.received_via.toLowerCase()}.`);

  if (request.request_id === "5208") {
    add(TESSA, rel(-3, "11:20"), "Two charts found for this name; authorization birth date matches neither.");
    add(TESSA, rel(-3, "11:26"), "Corrected authorization requested from the firm.");
    return events;
  }

  if (request.request_status === "exception") {
    add(TESSA, atTime(addBusinessDays(request.received_date, 1), 11, 20), `Flagged: ${request.exception_reason}.`);
    return events;
  }

  add(TESSA, atTime(addBusinessDays(request.received_date, 1), 10, 15), `Authorization checked: ${request.authorization_status}.`);

  if (request.request_status === "in release review") {
    add(TESSA, atTime(addBusinessDays(request.received_date, 2), 14, 40), "Packet assembled and moved to release review.");
  } else if (request.request_status === "released" && request.released_date) {
    add(TESSA, atTime(request.released_date, 15, 10), `Packet released to ${request.requesting_firm}.`);
  } else if (request.request_status === "in progress") {
    add(TESSA, atTime(addBusinessDays(request.received_date, 2), 13, 5), `Pages pulled from the chart: ${request.pages_count} pages.`);
  }

  return events;
}

export const REQUEST_EVENTS: RequestEvent[] = [];
for (const request of REQUESTS) {
  if (request.request_id === "5208") {
    REQUEST_EVENTS.push(...eventsFor(request));
  } else {
    REQUEST_EVENTS.push(...eventsFor(request));
    // A third of the requests get one more step, for a fuller history.
    const reviewedAt = atTime(addBusinessDays(request.received_date, 1), 16, 25);
    if (Number(request.request_id) % 3 === 0 && reviewedAt.getTime() <= Date.now()) {
      REQUEST_EVENTS.push({
        id: `${request.request_id}-e-review`,
        request_id: request.request_id,
        author: BILLING,
        timestamp: reviewedAt,
        event_text: `Itemized bill and balance confirmed from the ledger: billed ${usd(request.billed_total)}, balance ${usd(request.balance_due)}.`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Derived views and metrics

export function effectiveStatus(request: RecordsRequest, override?: RequestOverride): string {
  if (override?.released) return "released";
  if (override?.sentBack) return "exception";
  if (override?.movedToReview) return "in release review";
  return request.request_status;
}

export function effectiveReleasedDate(request: RecordsRequest, override?: RequestOverride): Date | null {
  if (override?.released) return override.releasedAt ? new Date(override.releasedAt) : new Date();
  return request.released_date;
}

/** The reason a request is held, including a note when release review sends it back. */
export function effectiveExceptionReason(request: RecordsRequest, override?: RequestOverride): string {
  if (override?.sentBack) return override.sentBackReason ?? "Sent back from release review";
  return request.exception_reason;
}

/** The authorization status shown on Requests and on Request, after the visitor's changes. */
export function effectiveAuthorizationStatus(
  request: RecordsRequest,
  override?: RequestOverride,
  attached = false
): string {
  if (request.request_id === "5208" && attached) return "Corrected, matches chart DEMO-204417";
  if (effectiveStatus(request, override) === "released") return "Checked, in date range";
  return request.authorization_status;
}

/** One countdown unit on every screen: business days until the firm's due date. */
export function businessDayCountdown(due: Date): string {
  const days = businessDaysBetween(new Date(), due);
  if (days <= 0) return "Due today or overdue";
  return `${days} business day${days === 1 ? "" : "s"} left`;
}

/** Released rows show the release date instead of a countdown. */
export function releasedLabel(d: Date | null): string {
  return d ? `Released ${longDate(d)}` : "Released";
}

export function eventsForRequest(requestId: string): RequestEvent[] {
  return REQUEST_EVENTS.filter((e) => e.request_id === requestId).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
}

export function ledgerForRequest(requestId: string): LedgerLine[] {
  return LEDGER_LINES.filter((line) => line.request_id === requestId);
}

export interface MetricValue {
  label: string;
  value: string;
  hint?: string;
}

export function computeMetrics(requests: RecordsRequest[], overrides: RequestOverrides): MetricValue[] {
  const today = new Date();
  const open = requests.filter((r) => effectiveStatus(r, overrides[r.request_id]) !== "released");
  const dueSoon = open.filter((r) => {
    const days = Math.round((r.due_date.getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 3;
  });
  const exceptions = requests.filter((r) => effectiveStatus(r, overrides[r.request_id]) === "exception");
  const released = requests.filter((r) => effectiveStatus(r, overrides[r.request_id]) === "released");
  const releaseDays = released
    .map((r) => {
      const releasedAt = effectiveReleasedDate(r, overrides[r.request_id]);
      if (!releasedAt) return null;
      return (releasedAt.getTime() - r.received_date.getTime()) / 86400000;
    })
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const avg = releaseDays.length
    ? releaseDays.reduce((sum, v) => sum + v, 0) / releaseDays.length
    : 0;

  return [
    { label: "Open records requests", value: String(open.length), hint: "Not yet released to the firm" },
    { label: "Open requests due within 3 days", value: String(dueSoon.length), hint: "Firm due dates coming up" },
    { label: "Exceptions waiting on the firm", value: String(exceptions.length), hint: "Held for an authorization or balance problem" },
    {
      label: "Average days to release",
      value: released.length ? `${avg.toFixed(1)} days` : "No releases yet",
      hint: "From request received to packet released",
    },
  ];
}

export { usd };
