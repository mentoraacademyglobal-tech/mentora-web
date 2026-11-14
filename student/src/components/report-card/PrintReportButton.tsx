'use client';

export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="student-action student-action-primary print:hidden"
    >
      🖨️ Print / Save as PDF
    </button>
  );
}
