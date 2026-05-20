import Papa from 'papaparse';
import type { Product } from '../types';

export const parseCSV = (file: File): Promise<Product[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // Trim whitespace from all headers and values
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        const data = results.data as any[];

        const products: Product[] = data
          .filter((row) => {
            // Skip rows that are completely empty
            const name = row['product_name'] || row['Name'] || '';
            return name.trim() !== '';
          })
          .map((row, index) => {
            // Support both CSV formats:
            // New format: Name, Path, Type, View Link, Download Link
            // Old format: product_name, drive_folder, reference_link
            const productName =
              (row['product_name'] || row['Name'] || `Unnamed Product ${index + 1}`).trim();
            const driveFolder =
              (row['drive_folder'] || row['View Link'] || '').trim();
            const referenceLink =
              (row['reference_link'] || '').trim();

            return {
              id: crypto.randomUUID(),
              product_name: productName,
              drive_folder: driveFolder,
              reference_link: referenceLink,
              status: 'pending',
              actionLogs: [],
              last_action: null,
              completed: false,
              nameCopied: false,
              driveCopied: false,
              referenceCopied: false,
              driveOpened: false,
              referenceOpened: false,
              notes: '',
            };
          });

        resolve(products);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

// Export current products back to a CSV file and trigger download
export const exportCSV = (products: Product[]): void => {
  const rows = products.map((p) => ({
    Name: p.product_name,
    'View Link': p.drive_folder,
    reference_link: p.reference_link,
    completed: p.completed ? 'Yes' : 'No',
    notes: p.notes,
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `buzl-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
