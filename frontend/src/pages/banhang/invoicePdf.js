/**
 * Xuất hóa đơn ra file PDF (1 click, không qua popup in).
 *
 * Cách làm:
 *  1. Build HTML chuẩn A5 portrait từ buildInvoiceHtml() — đã có sẵn
 *  2. Nhúng vào iframe ẩn để browser load đầy đủ font + chạy @page CSS
 *  3. html2canvas chụp DOM thành canvas → jsPDF ghép thành file PDF A5
 *  4. Download file `hoa-don-<MaHD>.pdf`
 *
 * Lưu ý:
 *  - Dùng iframe thay vì newWindow để không bị popup blocker chặn
 *  - Chờ iframe `onload` rồi thêm 1 tick để font/ảnh kịp render
 *  - Nếu html2canvas fail (CSP chặn font ngoài chẳng hạn) → fallback mở print dialog
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { buildInvoiceHtml } from './invoiceDocument';

export async function exportInvoicePdf(invoice) {
  if (!invoice || !invoice.MaHD) {
    throw new Error('Thiếu dữ liệu hóa đơn');
  }

  // Tạo iframe ẩn, load HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';   // ~ A5 width @ 96dpi
  iframe.style.height = '1123px';  // ~ A5 height @ 96dpi
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.title = `invoice-pdf-frame-${invoice.MaHD}`;

  document.body.appendChild(iframe);

  try {
    const html = buildInvoiceHtml(invoice);

    // Ghi HTML vào iframe rồi chờ onload
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Không truy cập được nội dung iframe');
    doc.open();
    doc.write(html);
    doc.close();

    await new Promise((resolve) => {
      if (iframe.contentWindow?.document.readyState === 'complete') {
        resolve();
      } else {
        iframe.addEventListener('load', resolve, { once: true });
      }
    });

    // Đợi thêm 1 tick để font/webfont kịp vẽ
    await new Promise(r => setTimeout(r, 200));

    const target = doc.body;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');

    // jsPDF: A5 portrait, đơn vị mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();   // 148mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm

    // Tính tỉ lệ để ảnh vừa khít trang (giữ nguyên tỉ lệ)
    const imgRatio = canvas.height / canvas.width;
    const targetWidth = pdfWidth;
    const targetHeight = targetWidth * imgRatio;

    // Nếu ảnh cao hơn 1 trang A5 → chia trang
    if (targetHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, targetWidth, targetHeight);
    } else {
      // Ảnh dài hơn 1 trang → cắt theo trang
      const pageHeightInCanvasPx = (pdfHeight / targetHeight) * canvas.height;
      let position = 0;
      let pageIndex = 0;
      while (position < canvas.height) {
        const sliceHeight = Math.min(pageHeightInCanvasPx, canvas.height - position);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, position, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight,
        );
        const pageImg = pageCanvas.toDataURL('image/png');
        if (pageIndex > 0) pdf.addPage();
        const sliceRatio = sliceHeight / canvas.width;
        pdf.addImage(pageImg, 'PNG', 0, 0, pdfWidth, pdfWidth * sliceRatio);
        position += sliceHeight;
        pageIndex += 1;
      }
    }

    pdf.save(`hoa-don-${invoice.MaHD}.pdf`);
  } catch (err) {
    // Fallback: mở print dialog để user chọn "Save as PDF"
    console.warn('exportInvoicePdf failed, fallback to print:', err);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.opener = null;
      printWindow.document.open();
      printWindow.document.write(buildInvoiceHtml(invoice));
      printWindow.document.close();
      printWindow.addEventListener('load', () => printWindow.print(), { once: true });
    }
    throw err;
  } finally {
    document.body.removeChild(iframe);
  }
}
