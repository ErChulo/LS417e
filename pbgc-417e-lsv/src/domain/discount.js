// Segmented discount factor v(t) with annual effective segment rates i1,i2,i3.
// t is in YEARS (can be fractional).
export function vSeg(t, { i1, i2, i3 }) {
    if (t <= 5) return Math.pow(1 + i1, -t);
    if (t <= 20) return Math.pow(1 + i1, -5) * Math.pow(1 + i2, -(t - 5));
    return (
        Math.pow(1 + i1, -5) *
        Math.pow(1 + i2, -15) *
        Math.pow(1 + i3, -(t - 20))
    );
}

// ∫ (1+i)^(-t) dt from a to b
function intPowDisc(a, b, i) {
    const L = Math.log(1 + i);
    return (Math.pow(1 + i, -a) - Math.pow(1 + i, -b)) / L;
}

// ∫_0^n vSeg(t) dt (piecewise across 0–5, 5–20, 20+)
export function intVSeg0n(n, rates) {
    if (!(n > 0)) return 0;

    const { i1, i2, i3 } = rates;
    let out = 0;

    // 0..min(n,5)
    const b1 = Math.min(n, 5);
    out += intPowDisc(0, b1, i1);
    if (n <= 5) return out;

    // 5..min(n,20)
    const b2 = Math.min(n - 5, 15);
    out += Math.pow(1 + i1, -5) * intPowDisc(0, b2, i2);
    if (n <= 20) return out;

    // >20
    out +=
        Math.pow(1 + i1, -5) *
        Math.pow(1 + i2, -15) *
        intPowDisc(0, n - 20, i3);

    return out;
}
