import toast from 'react-hot-toast';
import { FileSpreadsheet, Printer } from 'lucide-react';
import Button from '../ui/Button';
import { downloadReportCsv, printReport } from '../../utils/reportExport';
import { cn } from '../../utils/cn';

export default function ReportExportActions({ filename, title, subtitle, sections, disabled = false, className }) {
  const exportExcel = () => {
    downloadReportCsv(filename, sections);
    toast.success('Đã xuất file CSV tương thích Excel');
  };
  const exportPdf = () => {
    if (!printReport({ title, subtitle, sections })) {
      toast.error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up.');
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} aria-label="Xuất báo cáo">
      <Button variant="secondary" size="sm" icon={<FileSpreadsheet />} onClick={exportExcel} disabled={disabled}>
        Excel (CSV)
      </Button>
      <Button variant="secondary" size="sm" icon={<Printer />} onClick={exportPdf} disabled={disabled}>
        PDF
      </Button>
    </div>
  );
}
