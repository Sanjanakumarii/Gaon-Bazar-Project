export const categories = [
    "Sabhi",
    "Sabzi & Phal",
    "Kirana",
    "Khana",
    "Doodh & Dairy",
    "Kapde",
    "Beauty",
    "Doosri dukaan",
];
export function distance(a, b, c, d) {
    const rad = Math.PI / 180, x = Math.sin(((c - a) * rad) / 2) ** 2 +
        Math.cos(a * rad) *
            Math.cos(c * rad) *
            Math.sin(((d - b) * rad) / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}
export function coordinates(lat, lng) {
    if (typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180)
        throw Error("Map par sahi location chunein.");
    return { lat, lng };
}
export function string(value, label, min = 1, max = 200) {
    if (typeof value !== "string" ||
        value.trim().length < min ||
        value.trim().length > max)
        throw Error(`${label}: ${min}–${max} characters zaroori hain.`);
    return value.trim();
}
export function money(value) {
    if (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100000)
        throw Error("Amount ₹0–₹1,00,000 ke beech rakhein.");
    return Math.round(value * 100);
}
export function phone(value) {
    const s = string(value, "Mobile number", 10, 10);
    if (!/^[6-9]\d{9}$/.test(s))
        throw Error("Sahi 10 digit Indian mobile number dein.");
    return s;
}
export const transitions = {
    Placed: ["Accepted", "Cancelled"],
    Accepted: ["Out for delivery", "Cancelled"],
    "Out for delivery": ["Delivered"],
    Delivered: [],
    Cancelled: [],
};
