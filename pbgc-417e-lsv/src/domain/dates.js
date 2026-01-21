export function parseISODate(s) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
}

export function yearsBetween(d0, d1) {
    return (d1.getTime() - d0.getTime()) / (365.25 * 24 * 3600 * 1000);
}

export function ageAt(dob, asof) {
    return yearsBetween(dob, asof);
}

// "YYYY-MM" key from an ISO date string "YYYY-MM-DD"
export function ymKeyFromISODate(iso) {
    return iso && iso.length >= 7 ? iso.slice(0, 7) : "";
}
