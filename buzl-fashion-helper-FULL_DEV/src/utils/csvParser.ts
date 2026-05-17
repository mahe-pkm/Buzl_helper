import Papa from 'papaparse';

export const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        const data = results.data as any[];
        const rows = data
          .filter((row) => {
            const name = row['product_name'] || row['Name'] || '';
            return name.trim() !== '';
          })
          .map((row) => ({
            product_name: (row['product_name'] || row['Name'] || '').trim(),
            drive_folder: (row['drive_folder'] || row['View Link'] || row['Path'] || '').trim(),
            reference_link: (row['reference_link'] || row['Reference Link'] || '').trim() || null,
          }));
        resolve(rows);
      },
      error: reject,
    });
  });
};

export const exportCSV = (products: any[]): void => {
  const rows = products.map((p) => ({
    'Product Name': p.product_name,
    'Drive Folder': p.drive_folder,
    'Reference Link': p.reference_link || '',
    'Status': p.status,
    'Assigned To': p.assignee?.username || '',
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
