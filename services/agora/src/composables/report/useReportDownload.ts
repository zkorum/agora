import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { type MaybeRefOrGetter, ref, toValue } from "vue";

interface UseReportDownloadParams {
  fileName: MaybeRefOrGetter<string>;
}

interface ImageCapture {
  element: HTMLElement;
  name: string;
}

async function captureElement({
  element,
  showCaptureHeaders = false,
  showCaptureFooters = false,
}: {
  element: HTMLElement;
  showCaptureHeaders?: boolean;
  showCaptureFooters?: boolean;
}): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: (showCaptureHeaders || showCaptureFooters)
      ? (clonedDoc) => {
          if (showCaptureHeaders) {
            clonedDoc.querySelectorAll(".capture-only").forEach((el) => {
              (el as HTMLElement).style.display = "block";
            });
          }
          if (showCaptureFooters) {
            clonedDoc.querySelectorAll(".capture-footer").forEach((el) => {
              (el as HTMLElement).style.display = "block";
            });
          }
        }
      : undefined,
  });
}

function canvasToBlob({
  canvas,
  type = "image/jpeg",
  quality = 0.95,
}: {
  canvas: HTMLCanvasElement;
  type?: string;
  quality?: number;
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      type,
      quality,
    );
  });
}

export function useReportDownload({
  fileName,
}: UseReportDownloadParams) {
  const isGeneratingZip = ref(false);
  const isGeneratingPdf = ref(false);

  async function downloadAsZip({
    captures,
  }: {
    captures: ImageCapture[];
  }): Promise<void> {
    isGeneratingZip.value = true;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const capture of captures) {
        const canvas = await captureElement({
          element: capture.element,
          showCaptureHeaders: true,
          showCaptureFooters: true,
        });
        const blob = await canvasToBlob({ canvas });
        zip.file(`${capture.name}.jpg`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.download = `${toValue(fileName)}.zip`;
      link.href = URL.createObjectURL(content);
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      isGeneratingZip.value = false;
    }
  }

  async function downloadAsPdf({
    captures,
    footerElement,
  }: {
    captures: ImageCapture[];
    footerElement?: HTMLElement;
  }): Promise<void> {
    isGeneratingPdf.value = true;
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < captures.length; i++) {
        if (i > 0) pdf.addPage();

        const isFirst = i === 0;

        const canvas = await captureElement({
          element: captures[i].element,
          showCaptureHeaders: !isFirst,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const aspectRatio = canvas.width / canvas.height;

        const scaledWidth = pageWidth;
        const scaledHeight = pageWidth / aspectRatio;

        pdf.addImage(imgData, "JPEG", 0, 0, scaledWidth, Math.min(scaledHeight, pageHeight));
      }

      // Place footer at the absolute bottom of the last page
      if (footerElement) {
        const footerCanvas = await captureElement({ element: footerElement });
        const footerImgData = footerCanvas.toDataURL("image/jpeg", 0.95);
        const footerAspectRatio = footerCanvas.width / footerCanvas.height;
        const footerWidth = pageWidth;
        const footerHeight = pageWidth / footerAspectRatio;

        const footerY = pageHeight - footerHeight;
        pdf.addImage(
          footerImgData,
          "JPEG",
          0,
          footerY,
          footerWidth,
          footerHeight,
        );
      }

      pdf.save(`${toValue(fileName)}.pdf`);
    } finally {
      isGeneratingPdf.value = false;
    }
  }

  return { downloadAsZip, downloadAsPdf, isGeneratingZip, isGeneratingPdf };
}
