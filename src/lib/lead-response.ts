/** Only a successful server response with a persisted lead ID can be shown as a lead. */
export async function readCreatedLead(response: Response): Promise<{ leadId: number; replayed: boolean }> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Gửi yêu cầu thất bại (HTTP ${response.status}).`);
  }
  const body = await response.json().catch(() => null);
  if (body?.ok !== true || !Number.isSafeInteger(body.leadId) || body.leadId < 1) {
    throw new Error("Máy chủ chưa xác nhận mã yêu cầu hợp lệ.");
  }
  return { leadId: body.leadId, replayed: body.replayed === true };
}
