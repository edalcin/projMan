// Fuso do processo = TZ do container (#8). O Node traz ICU completo: resolve
// nomes de fuso mesmo sem tzdata no Alpine.
export const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
