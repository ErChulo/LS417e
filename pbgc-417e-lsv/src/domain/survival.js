function clamp01(x) {
    return Math.min(1, Math.max(0, x));
}

// UDD monthly survival: p_month = 1 - qx/12
function pMonthUDD(qx) {
    const q = clamp01(qx);
    return 1 - q / 12;
}

// surv[k] = P(alive at t = k/12) approx
export function buildMonthlySurvival({ qxByAge, ageAt0, nMonths, maxAge = 120 }) {
    const surv = new Array(nMonths + 1);
    surv[0] = 1;

    let s = 1;
    for (let k = 1; k <= nMonths; k++) {
        const ageNow = ageAt0 + (k - 1) / 12;
        const aInt = Math.min(maxAge, Math.max(0, Math.floor(ageNow)));
        const qx = qxByAge[aInt] ?? 1;
        s *= pMonthUDD(qx);
        surv[k] = s;
    }
    return surv;
}
