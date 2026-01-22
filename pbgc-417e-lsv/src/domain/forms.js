import { vSeg, intVSeg0n } from "./discount.js";
import { buildMonthlySurvival } from "./survival.js";

export const FORMS = {
    LIFE_DUE_MTHLY: "LIFE_DUE_MTHLY",
    CERTAIN_N_CONTINUOUS: "CERTAIN_N_CONTINUOUS",
    CERTAIN_N_AND_LIFE_DUE_MTHLY: "CERTAIN_N_AND_LIFE_DUE_MTHLY",
};

/**
 * PV factor per $1 of USER-ENTERED benefit.
 * Conventions:
 * - LIFE_DUE_MTHLY and CERTAIN_N_AND_LIFE_DUE_MTHLY:
 *      user benefit is $/month, PV factor returns PV per $1/month.
 * - CERTAIN_N_CONTINUOUS:
 *      user benefit is $/month-equivalent. Internally annual rate = 12*$1.
 *      PV factor returns PV per $1/month-equivalent.
 *
 * IMPORTANT UPDATE:
 * - Allow n = 0 for "certain & life". When n = 0, it collapses to straight life due.
 * - Allow n = 0 for "certain continuous" (PV = 0).
 */
export function pvPerDollar({
    form,
    n,
    rates,
    qxByAge,
    ageAtASD,
    m = 12,
    maxAge = 120,
}) {
    if (m !== 12) throw new Error("This implementation assumes m=12.");

    if (form === FORMS.LIFE_DUE_MTHLY) {
        return pvLifeDueMonthly({ rates, qxByAge, ageAtASD, maxAge });
    }

    if (form === FORMS.CERTAIN_N_CONTINUOUS) {
        return pvCertainContinuous({ n, rates });
    }

    if (form === FORMS.CERTAIN_N_AND_LIFE_DUE_MTHLY) {
        return pvCertainAndLifeDueMonthly({ n, rates, qxByAge, ageAtASD, maxAge });
    }

    throw new Error(`Unknown form: ${form}`);
}

// ä_x^(12) per $1/month, due
export function pvLifeDueMonthly({ rates, qxByAge, ageAtASD, maxAge }) {
    const monthsToMax = Math.max(
        0,
        Math.ceil(12 * ((maxAge + 1) - Math.floor(ageAtASD)))
    );

    const surv = buildMonthlySurvival({
        qxByAge,
        ageAt0: ageAtASD,
        nMonths: monthsToMax,
        maxAge,
    });

    let pv = 0;
    for (let k = 0; k <= monthsToMax; k++) {
        pv += surv[k] * vSeg(k / 12, rates);
    }
    return pv;
}

// PV per $1/month-equivalent where payment is continuous for n years
// If user enters $1/month, annual intensity is 12.
// Allow n = 0 => PV = 0
export function pvCertainContinuous({ n, rates }) {
    if (!(n > 0)) return 0;
    return 12 * intVSeg0n(n, rates);
}

// ä_{x:⟨n⟩}^(12) per $1/month, due
// IMPORTANT UPDATE: allow n = 0 => collapse to straight life due
export function pvCertainAndLifeDueMonthly({ n, rates, qxByAge, ageAtASD, maxAge }) {
    if (!(n > 0)) {
        return pvLifeDueMonthly({ rates, qxByAge, ageAtASD, maxAge });
    }

    const nMonthsCertain = Math.round(12 * n);

    // term-certain due: k = 0..12n-1
    let aCertain = 0;
    for (let k = 0; k <= nMonthsCertain - 1; k++) {
        aCertain += vSeg(k / 12, rates);
    }

    // E_x(n) = _np_x * v(n)
    const survToN = buildMonthlySurvival({
        qxByAge,
        ageAt0: ageAtASD,
        nMonths: nMonthsCertain,
        maxAge,
    })[nMonthsCertain];

    const En = survToN * vSeg(n, rates);

    // deferred life due at age x+n
    const aLifeDeferred = pvLifeDueMonthly({
        rates,
        qxByAge,
        ageAtASD: ageAtASD + n,
        maxAge,
    });

    return aCertain + En * aLifeDeferred;
}
