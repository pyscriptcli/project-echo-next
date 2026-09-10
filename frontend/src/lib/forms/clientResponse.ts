export async function readJsonResponse<T = any>(response: Response): Promise<T> {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : ({} as T);
  } catch {
    if (/request entity too large/i.test(body)) {
      throw new Error("The selected attachment is too large to upload. Please use a smaller file and try again.");
    }
    throw new Error("The submission service returned an invalid response. Please try again.");
  }
}
