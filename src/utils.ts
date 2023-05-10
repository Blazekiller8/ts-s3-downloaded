// Function to format Date.now() to YYYY_MM_DD-HH_MM_SS format
export function formatDate(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const formattedDate = `${year}_${month < 10 ? '0' + month : month}_${
    day < 10 ? '0' + day : day
  }`;
  return formattedDate;
}

export function formatPrint(info: any): string {
  const message = info?.message || '';
  const meta = info?.meta || {};
  const level = info?.level || '';
  const timestamp = info?.timestamp || '';
  const context = meta?.context || '';
  const stack = meta?.stack || '';
  let output = `${timestamp} [${level}]`;
  if (context) {
    output += ` [${context}]`;
  }
  output += ` ${message}`;
  if (stack) {
    output += `\n${stack}`;
  }
  return output;
}
