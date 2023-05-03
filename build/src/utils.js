// Function to format Date.now() to YYYY_MM_DD-HH_MM_SS format
export function formatDate(date = new Date()) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    const formattedDate = `${year}_${month < 10 ? '0' + month : month}_${day < 10 ? '0' + day : day}-${hours < 10 ? '0' + hours : hours}_${minutes < 10 ? '0' + minutes : minutes}_${seconds < 10 ? '0' + seconds : seconds}`;
    return formattedDate;
}
//# sourceMappingURL=utils.js.map