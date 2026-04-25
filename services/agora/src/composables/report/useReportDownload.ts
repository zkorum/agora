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

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const cleanup = (): void => {
      image.removeEventListener("load", handleDone);
      image.removeEventListener("error", handleDone);
    };

    const handleDone = (): void => {
      cleanup();
      resolve();
    };

    image.addEventListener("load", handleDone, { once: true });
    image.addEventListener("error", handleDone, { once: true });
  });
}

async function waitForElementImages({
  element,
}: {
  element: HTMLElement;
}): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));

  for (const image of images) {
    await waitForImage(image);
  }
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
  const needsClone = showCaptureHeaders || showCaptureFooters;
  await waitForElementImages({ element });

  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    onclone: needsClone
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
  quality = 0.85,
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
      quality
    );
  });
}

export function useReportDownload({ fileName }: UseReportDownloadParams) {
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
      // link.click() triggers the download asynchronously — the browser needs
      // time to process the blob and show the save dialog. Without this delay,
      // the loading state clears before the dialog appears.
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
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
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      let isFirstPage = true;

      for (let i = 0; i < captures.length; i++) {
        const canvas = await captureElement({
          element: captures[i].element,
          showCaptureHeaders: !isFirstPage,
        });

        if (!isFirstPage) pdf.addPage();
        const imgData = canvas.toDataURL("image/jpeg", 0.8);
        const aspectRatio = canvas.width / canvas.height;
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageWidth / aspectRatio);
        isFirstPage = false;
      }

      // Place footer at the absolute bottom of the last page
      if (footerElement) {
        const footerCanvas = await captureElement({ element: footerElement });
        const footerImgData = footerCanvas.toDataURL("image/jpeg", 0.8);
        const footerAspectRatio = footerCanvas.width / footerCanvas.height;
        const footerWidth = pageWidth;
        const footerHeight = pageWidth / footerAspectRatio;

        const FOOTER_BOTTOM_MARGIN_MM = 10;
        const footerY = pageHeight - footerHeight - FOOTER_BOTTOM_MARGIN_MM;
        pdf.addImage(
          footerImgData,
          "JPEG",
          0,
          footerY,
          footerWidth,
          footerHeight
        );
      }

      pdf.save(`${toValue(fileName)}.pdf`);
      // pdf.save() triggers the download asynchronously — the browser needs
      // time to process the blob and show the save dialog. Without this delay,
      // the loading state clears before the dialog appears.
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    } finally {
      isGeneratingPdf.value = false;
    }
  }

  return { downloadAsZip, downloadAsPdf, isGeneratingZip, isGeneratingPdf };
}
