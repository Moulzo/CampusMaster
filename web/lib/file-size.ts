export function formatFileSize(size?: number | null) {
  if (typeof size !== "number" || Number.isNaN(size) || size < 0) {
    return null;
  }

  if (size < 1024) {
    return `${size} o`;
  }

  const units = ["Ko", "Mo", "Go"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formatted =
    value >= 10
      ? Math.round(value).toString()
      : value.toFixed(1).replace(".", ",");

  return `${formatted} ${units[unitIndex]}`;
}
