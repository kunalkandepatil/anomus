export interface GenerateReportRequest {
  internshipDomain: string;
  companyName: string;
  studentName: string;
  classDiv: string;
  rollNumber: string;
  program: string;
  schoolName: string;
  facultyGuideName: string;
  industryGuideName: string; // empty string if none
  internshipStartDate: string;
  internshipEndDate: string;
  semester: string;
}

export async function generateReport(data: GenerateReportRequest): Promise<Blob> {
  const response = await fetch('/api/jspm/internship-report-creator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
