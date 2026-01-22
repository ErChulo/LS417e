import { useMemo, useState } from "react";
import "./App.css";

import ratesByMonth from "./data/rates/segment_rates.json";
import mort2024 from "./data/mortality/417e_2024_unisex.json";
import { parseISODate, ymKeyFromISODate } from "./domain/dates.js";
import { computeCase } from "./domain/engine.js";
import { FORMS } from "./domain/forms.js";

/**
 * Display rules (per your instructions):
 * 1) Monthly amounts: 2 decimals
 * 2) Present values + lump sums: 0 decimals
 * 3) Currency: commas (grouping)
 */
const USD_2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUM_0 = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const PCT_2 = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function num(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export default function App() {
  // Defaults = your worked example
  const [DOB, setDOB] = useState("1959-12-05");
  const [DOTE, setDOTE] = useState("2024-05-31");
  const [FreezeDate, setFreezeDate] = useState("2020-07-31");
  const [NRD, setNRD] = useState("2025-01-01");
  const [DOR, setDOR] = useState("2026-04-01");
  const [DOPT, setDOPT] = useState("2024-06-30");

  const [benefitAtNRD, setBenefitAtNRD] = useState("73.79");

  const [form, setForm] = useState(FORMS.CERTAIN_N_AND_LIFE_DUE_MTHLY);
  const [n, setN] = useState("3"); // NOW allowed to be 0 for term-certain forms

  const [applyLateRetAdj, setApplyLateRetAdj] = useState(true);
  const [threshold, setThreshold] = useState("5000");

  const ym = ymKeyFromISODate(DOPT);
  const rates = ratesByMonth[ym] || null;
  const qx = mort2024.qx;

  const needsN =
    form === FORMS.CERTAIN_N_CONTINUOUS ||
    form === FORMS.CERTAIN_N_AND_LIFE_DUE_MTHLY;

  const result = useMemo(() => {
    const dob = parseISODate(DOB);
    const dote = parseISODate(DOTE);
    const freezeDate = parseISODate(FreezeDate);
    const nrd = parseISODate(NRD);
    const dor = parseISODate(DOR);
    const dopt = parseISODate(DOPT);

    if (!dob || !dote || !nrd || !dor || !dopt) {
      return { ok: false, msg: "Invalid date input(s)." };
    }
    if (!rates) {
      return { ok: false, msg: `No segment rates found for DOPT month ${ym}.` };
    }

    const Bnrd = num(benefitAtNRD, NaN);
    if (!Number.isFinite(Bnrd) || Bnrd < 0) {
      return { ok: false, msg: "Benefit at NRD must be a nonnegative number." };
    }

    // IMPORTANT UPDATE: allow n = 0
    const nYears = num(n, NaN);
    if (needsN && !(nYears >= 0)) {
      return { ok: false, msg: "n must be >= 0 for this form." };
    }

    try {
      const out = computeCase({
        dob,
        dote,
        freezeDate,
        nrd,
        dor,
        dopt,
        benefitAtNRD_monthly: Bnrd,
        form,
        n: nYears,
        rates,
        qxByAge: qx,
        applyLateRetAdj,
        deMinimisThreshold: num(threshold, 5000),
      });
      return { ok: true, out };
    } catch (e) {
      return { ok: false, msg: String(e?.message ?? e) };
    }
  }, [
    DOB,
    DOTE,
    FreezeDate,
    NRD,
    DOR,
    DOPT,
    benefitAtNRD,
    form,
    n,
    applyLateRetAdj,
    threshold,
    ym,
    rates,
    qx,
    needsN,
  ]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="h-title">§417(e) Lump-Sum Calculator</div>
          <div className="h-sub">
            Dark theme. Native date pickers. PBGC rounding conventions.
          </div>
        </div>
        <div
          className="pill"
          title="DOPT month key used to select segment rates"
        >
          <span className="dot" />
          <span>DOPT month: {ym || "—"}</span>
        </div>
      </header>

      <hr className="sep" />

      <section className="card">
        <h3>
          <span className="bar" />
          Inputs
        </h3>

        <div className="grid">
          <div className="field">
            <label>DOB</label>
            <input
              type="date"
              value={DOB}
              onChange={(e) => setDOB(e.target.value)}
            />
          </div>

          <div className="field">
            <label>DOPT (Plan Termination Date)</label>
            <input
              type="date"
              value={DOPT}
              onChange={(e) => setDOPT(e.target.value)}
            />
          </div>

          <div className="field">
            <label>DOTE (Termination of Employment)</label>
            <input
              type="date"
              value={DOTE}
              onChange={(e) => setDOTE(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Freeze Date (Benefit Freeze)</label>
            <input
              type="date"
              value={FreezeDate}
              onChange={(e) => setFreezeDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label>NRD (Normal Retirement Date)</label>
            <input
              type="date"
              value={NRD}
              onChange={(e) => setNRD(e.target.value)}
            />
          </div>

          <div className="field">
            <label>DOR (Requested Retirement Date / ASD)</label>
            <input
              type="date"
              value={DOR}
              onChange={(e) => setDOR(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Benefit at NRD (monthly)</label>
            <input
              type="number"
              step="0.01"
              value={benefitAtNRD}
              onChange={(e) => setBenefitAtNRD(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Normal Single Form</label>
            <select value={form} onChange={(e) => setForm(e.target.value)}>
              <option value={FORMS.LIFE_DUE_MTHLY}>
                Straight life annuity due (monthly)
              </option>
              <option value={FORMS.CERTAIN_N_CONTINUOUS}>
                N-year certain (continuous)
              </option>
              <option value={FORMS.CERTAIN_N_AND_LIFE_DUE_MTHLY}>
                N-year certain &amp; life (due, monthly)
              </option>
            </select>
          </div>

          {needsN && (
            <div className="field">
              <label>n (certain period, years) — allow 0</label>
              <input
                type="number"
                step="0.01"
                value={n}
                onChange={(e) => setN(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label>Apply late retirement adj (PV ratio)</label>
            <select
              value={applyLateRetAdj ? "YES" : "NO"}
              onChange={(e) => setApplyLateRetAdj(e.target.value === "YES")}
            >
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>

          <div className="field">
            <label>De minimis threshold</label>
            <input
              type="number"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        </div>
      </section>

      <hr className="sep" />

      <section className="card">
        <h3>
          <span className="bar" />
          Assumptions (from DOPT month)
        </h3>

        {!rates ? (
          <div className="alert error">
            No segment rates found for <b>{ym}</b>. Add it to{" "}
            <code>src/data/rates/segment_rates.json</code>.
          </div>
        ) : (
          <div className="kv">
            <div className="row">
              <div className="key">Segment rates</div>
              <div className="val">
                i1={PCT_2.format(rates.i1)} &nbsp; i2={PCT_2.format(rates.i2)}{" "}
                &nbsp; i3={PCT_2.format(rates.i3)}
              </div>
            </div>
            <div className="row">
              <div className="key">Mortality basis</div>
              <div className="val">{mort2024.basisId}</div>
            </div>
          </div>
        )}
      </section>

      <hr className="sep" />

      <section className="card">
        <h3>
          <span className="bar" />
          Results
        </h3>

        {!result.ok ? (
          <div className="alert error">{result.msg}</div>
        ) : (
          <Results out={result.out} />
        )}
      </section>

      <hr className="sep" />

      <details className="card">
        <summary>Copyable JSON output</summary>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>
          {result.ok ? JSON.stringify(result.out, null, 2) : ""}
        </pre>
      </details>
    </div>
  );
}

function Results({ out }) {
  const { ages, pvPer1, benefit, lumpSum, eligible, threshold } = out;

  // Monthly amounts: 2 decimals
  const benefitNRD = USD_2.format(benefit.benefitAtNRD_monthly);
  const benefitDOR = USD_2.format(benefit.benefitAtDOR);

  // PV factors: 0 decimals (per your instruction)
  const pvASD_NRD = NUM_0.format(pvPer1.pv1_atASD_NRD);
  const pvASD_DOR = NUM_0.format(pvPer1.pv1_atASD_DOR);
  const pvDOPT_NRD = NUM_0.format(pvPer1.pv1_atDOPT_NRD);
  const pvDOPT_DOR = NUM_0.format(pvPer1.pv1_atDOPT_DOR);

  // Lump sum: currency, 0 decimals
  const lsv = USD_0.format(lumpSum);
  const th = USD_0.format(Number(threshold));

  return (
    <div className="kv">
      <div className="row">
        <div className="key">Age at NRD</div>
        <div className="val">{ages.ageNRD.toFixed(6)}</div>
      </div>
      <div className="row">
        <div className="key">Age at DOR</div>
        <div className="val">{ages.ageDOR.toFixed(6)}</div>
      </div>

      <div className="row">
        <div className="key">PV per $1 at ASD (NRD)</div>
        <div className="val">{pvASD_NRD}</div>
      </div>
      <div className="row">
        <div className="key">PV per $1 at ASD (DOR)</div>
        <div className="val">{pvASD_DOR}</div>
      </div>
      <div className="row">
        <div className="key">PV per $1 valued at DOPT (NRD)</div>
        <div className="val">{pvDOPT_NRD}</div>
      </div>
      <div className="row">
        <div className="key">PV per $1 valued at DOPT (DOR)</div>
        <div className="val">{pvDOPT_DOR}</div>
      </div>

      <div className="row">
        <div className="key">Benefit at NRD (monthly)</div>
        <div className="val">{benefitNRD}</div>
      </div>
      <div className="row">
        <div className="key">Benefit at DOR (monthly)</div>
        <div className="val">{benefitDOR}</div>
      </div>

      <div className="row">
        <div className="key">Lump Sum Value</div>
        <div className="val big">{lsv}</div>
      </div>

      <div className={`alert ${eligible ? "success" : "info"}`}>
        <b>De minimis:</b> {eligible ? "YES" : "NO"} &nbsp; (threshold {th})
      </div>
    </div>
  );
}
