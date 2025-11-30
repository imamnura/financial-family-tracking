/**
 * Utility functions for exporting charts to images
 */

// Install required: npm install html2canvas

export const exportChartToImage = async (
  elementId: string,
  filename: string = "chart.png",
  options: {
    backgroundColor?: string;
    scale?: number;
  } = {}
): Promise<void> => {
  try {
    // Dynamically import html2canvas to avoid SSR issues
    const html2canvas = (await import("html2canvas")).default;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Create canvas from element
    const canvas = await html2canvas(element, {
      backgroundColor: options.backgroundColor || "#ffffff",
      scale: options.scale || 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
    });

    // Convert canvas to blob
    canvas.toBlob((blob: Blob | null) => {
      if (!blob) {
        throw new Error("Failed to create blob");
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch (error) {
    console.error("Failed to export chart:", error);
    throw error;
  }
};

export const exportMultipleCharts = async (
  charts: Array<{ elementId: string; filename: string }>,
  options?: { backgroundColor?: string; scale?: number }
): Promise<void> => {
  for (const chart of charts) {
    await exportChartToImage(chart.elementId, chart.filename, options);
    // Add small delay between exports to avoid overwhelming the browser
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

export const copyChartToClipboard = async (
  elementId: string,
  options?: { backgroundColor?: string; scale?: number }
): Promise<void> => {
  try {
    const html2canvas = (await import("html2canvas")).default;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      backgroundColor: options?.backgroundColor || "#ffffff",
      scale: options?.scale || 2,
      useCORS: true,
      logging: false,
    });

    // Convert canvas to blob
    canvas.toBlob(async (blob: Blob | null) => {
      if (!blob) {
        throw new Error("Failed to create blob");
      }

      // Copy to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        console.log("Chart copied to clipboard");
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
        throw err;
      }
    }, "image/png");
  } catch (error) {
    console.error("Failed to copy chart:", error);
    throw error;
  }
};
