import { ageAt, yearsBetween } from "./dates.js";
import { vSeg } from "./discount.js";
import { pvPerDollar } from "./forms.js";

export function computeCase({
    dob, dote, freezeDate, nrd, dor, dopt,
    benefitAtNRD_monthly,
    form,
    n,
    rates,
    qxByAge,
    applyLateRetAdj,
    deMinimisThreshold = 5000,
}) {
    const ageNRD = ageAt(dob, nrd);
    const ageDOR = ageAt(dob, dor);

    // PV per $1/month at the ANNUITY START DATE (ASD), not yet discounted to DOPT
    const pv1_atASD_NRD = pvPerDollar({ form, n, rates, qxByAge, ageAtASD: ageNRD });
    const pv1_atASD_DOR = pvPerDollar({ form, n, rates, qxByAge, ageAtASD: ageDOR });

    // Discount from ASD back to DOPT (ignore pre-commencement mortality; conditional-on-survival convention)
    const defNRD = yearsBetween(dopt, nrd);
    const defDOR = yearsBetween(dopt, dor);

    const pv1_atDOPT_NRD = vSeg(defNRD, rates) * pv1_atASD_NRD;
    const pv1_atDOPT_DOR = vSeg(defDOR, rates) * pv1_atASD_DOR;

    let benefitAtDOR = benefitAtNRD_monthly;
    if (applyLateRetAdj) {
        // Actuarial equivalence at DOPT
        benefitAtDOR = benefitAtNRD_monthly * (pv1_atDOPT_NRD / pv1_atDOPT_DOR);
    }

    // IMPORTANT: NO "*12" here. pvPerDollar already sums monthly payments.
    const lumpSum = benefitAtDOR * pv1_atDOPT_DOR;

    return {
        ages: { ageNRD, ageDOR },
        pvPer1: {
            pv1_atASD_NRD,
            pv1_atASD_DOR,
            pv1_atDOPT_NRD,
            pv1_atDOPT_DOR,
        },
        benefit: { benefitAtNRD_monthly, benefitAtDOR },
        lumpSum,
        threshold: deMinimisThreshold,
        eligible: lumpSum < deMinimisThreshold,
        meta: { form, n, applyLateRetAdj, dob, dote, freezeDate, nrd, dor, dopt },
    };
}
