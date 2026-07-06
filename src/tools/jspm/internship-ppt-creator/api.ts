export interface GenerateRequest {
  internshipTitle: string;
  studentName: string;
  prn: string;
  classDiv: string;
  program: string;
}

export async function generatePpt(data: GenerateRequest): Promise<Blob> {
  const clientId = localStorage.getItem('anomus_client_id') || '';
  const response = await fetch('/api/jspm/internship-ppt-creator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const raw = await response.text();
    let detail = raw;
    try {
      const json = JSON.parse(raw);
      detail = json.error ?? json.detail ?? raw;
    } catch { /* raw is not JSON, use as-is */ }
    throw new Error(detail || `Server error ${response.status}`);
  }

  return response.blob();
}
