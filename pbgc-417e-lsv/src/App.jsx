import { useMemo, useState } from "react";
import ratesByMonth from "./data/rates/segment_rates.json";
import mort2024 from "./data/mortality/417e_2024_unisex.json";
import { parseISODate, ymKeyFromISODate } from "./domain/dates.js";
import { computeCase } from "./domain/engine.js";
import { FORMS } from "./domain/forms.js";

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
  const [n, setN] = useState("3");

  const [applyLateRetAdj, setApplyLateRetAdj] = useState(true);
  const [threshold, setThreshold] = useState("5000");

  const ym = ymKeyFromISODate(DOPT);
  const rates = ratesByMonth[ym] || null;
  const qx = mort2024.qx;

  const result = useMemo(() => {
    const dob = parseISODate(DOB);
    const dote = parseISODate(DOTE);
    const freezeDate = parseISODate(FreezeDate);
    const nrd = parseISODate(NRD);
    const dor = parseISODate(DOR);
    const dopt = parseISODate(DOPT);

    if (!dob || !dote || !nrd || !dor || !dopt)
      return { ok: false, msg: "Invalid date input(s)." };
    if (!rates)
      return { ok: false, msg: `No segment rates found for DOPT month ${ym}.` };

    const Bnrd = num(benefitAtNRD, NaN);
    if (!Number.isFinite(Bnrd) || Bnrd < 0)
      return { ok: false, msg: "Benefit at NRD must be a nonnegative number." };

    const nYears = num(n, NaN);
    const needsN =
      form === FORMS.CERTAIN_N_CONTINUOUS ||
      form === FORMS.CERTAIN_N_AND_LIFE_DUE_MTHLY;
    if (needsN && !(nYears > 0))
      return { ok: false, msg: "n must be > 0 for this form." };

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
  ]);

  const needsN =
    form === FORMS.CERTAIN_N_CONTINUOUS ||
    form === FORMS.CERTAIN_N_AND_LIFE_DUE_MTHLY;

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2>PBGC §417(e) Lump-Sum Value (Browser Only)</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          DOB
          <input
            type="date"
            value={DOB}
            onChange={(e) => setDOB(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          DOPT (Plan Termination Date)
          <input
            type="date"
            value={DOPT}
            onChange={(e) => setDOPT(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          DOTE (Termination of Employment)
          <input
            type="date"
            value={DOTE}
            onChange={(e) => setDOTE(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Freeze Date (Benefit Freeze)
          <input
            type="date"
            value={FreezeDate}
            onChange={(e) => setFreezeDate(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          NRD (Normal Retirement Date)
          <input
            type="date"
            value={NRD}
            onChange={(e) => setNRD(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          DOR (Requested Retirement Date / ASD)
          <input
            type="date"
            value={DOR}
            onChange={(e) => setDOR(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Benefit at NRD (monthly)
          <input
            type="number"
            step="0.01"
            value={benefitAtNRD}
            onChange={(e) => setBenefitAtNRD(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Normal Single Form
          <select
            value={form}
            onChange={(e) => setForm(e.target.value)}
            style={{ width: "100%" }}
          >
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
        </label>

        {needsN && (
          <label>
            n (certain period, years)
            <input
              type="number"
              step="0.01"
              value={n}
              onChange={(e) => setN(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        )}

        <label>
          Apply late retirement adj (PV ratio)
          <select
            value={applyLateRetAdj ? "YES" : "NO"}
            onChange={(e) => setApplyLateRetAdj(e.target.value === "YES")}
            style={{ width: "100%" }}
          >
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </label>

        <label>
          De minimis threshold
          <input
            type="number"
            step="1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <h3>Assumptions (from DOPT month)</h3>
      {rates ? (
        <div>
          <div>
            <b>DOPT month:</b> {ym}
          </div>
          <div>
            <b>Segment rates:</b> i1={rates.i1}, i2={rates.i2}, i3={rates.i3}
          </div>
          <div>
            <b>Mortality:</b> {mort2024.basisId}
          </div>
        </div>
      ) : (
        <div style={{ color: "crimson" }}>
          No rates found for {ym}. Add to src/data/rates/segment_rates.json
        </div>
      )}

      <hr style={{ margin: "16px 0" }} />

      <h3>Results</h3>
      {!result.ok ? (
        <div style={{ color: "crimson" }}>{result.msg}</div>
      ) : (
        <Results out={result.out} />
      )}

      <hr style={{ margin: "16px 0" }} />
      <details>
        <summary>Copyable JSON output</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {result.ok ? JSON.stringify(result.out, null, 2) : ""}
        </pre>
      </details>
    </div>
  );
}

function Results({ out }) {
  const { ages, pvPer1, benefit, lumpSum, eligible, threshold } = out;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>
        <b>Age at NRD:</b> {ages.ageNRD.toFixed(6)}
      </div>
      <div>
        <b>Age at DOR:</b> {ages.ageDOR.toFixed(6)}
      </div>

      <div>
        <b>PV per $1 at ASD (NRD):</b> {pvPer1.pv1_atASD_NRD.toFixed(8)}
      </div>
      <div>
        <b>PV per $1 at ASD (DOR):</b> {pvPer1.pv1_atASD_DOR.toFixed(8)}
      </div>
      <div>
        <b>PV per $1 valued at DOPT (NRD):</b>{" "}
        {pvPer1.pv1_atDOPT_NRD.toFixed(8)}
      </div>
      <div>
        <b>PV per $1 valued at DOPT (DOR):</b>{" "}
        {pvPer1.pv1_atDOPT_DOR.toFixed(8)}
      </div>

      <div>
        <b>Benefit at NRD (monthly):</b>{" "}
        {benefit.benefitAtNRD_monthly.toFixed(2)}
      </div>
      <div>
        <b>Benefit at DOR (monthly):</b> {benefit.benefitAtDOR.toFixed(6)}
      </div>

      <div style={{ fontSize: 18 }}>
        <b>Lump Sum Value:</b> ${lumpSum.toFixed(2)}
      </div>
      <div>
        <b>De minimis:</b> {eligible ? "YES" : "NO"} (threshold $
        {Number(threshold).toFixed(2)})
      </div>
    </div>
  );
}
