export async function readJsonResponse<T = any>(response: Response): Promise<T> {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : ({} as T);
  } catch {
    if (response.status === 413 || /request entity too large/i.test(body)) {
      throw new Error("The selected attachment exceeds the maximum upload limit (4.5MB). Please compress or choose a smaller file and try again.");
    }
    throw new Error("The submission service returned an invalid response. Please try again.");
  }
}
