import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import requests
import re
import csv
import threading
import os

API_KEY = os.environ.get("GOOGLE_DRIVE_API_KEY", "")

class GDriveExtractorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Google Drive URL Extractor")
        self.root.geometry("600x500")
        
        # URL Input
        ttk.Label(root, text="Public Google Drive Folder URL:").pack(pady=(10, 0), padx=10, anchor='w')
        self.url_entry = ttk.Entry(root, width=70)
        self.url_entry.pack(pady=5, padx=10, fill='x')
        
        # Recursive Checkbox
        self.recursive_var = tk.BooleanVar(value=False)
        self.recursive_check = ttk.Checkbutton(root, text="Extract recursively (search inside subfolders)", variable=self.recursive_var)
        self.recursive_check.pack(pady=5, padx=10, anchor='w')
        
        # Extract Button
        self.extract_btn = ttk.Button(root, text="Extract URLs", command=self.start_extraction)
        self.extract_btn.pack(pady=10)
        
        # Output Area
        ttk.Label(root, text="Log Output:").pack(pady=(5, 0), padx=10, anchor='w')
        self.log_text = tk.Text(root, height=15, state='disabled')
        self.log_text.pack(pady=5, padx=10, fill='both', expand=True)
        
        # Save Button
        self.save_btn = ttk.Button(root, text="Save Results", command=self.save_results, state='disabled')
        self.save_btn.pack(pady=10)
        
        self.extracted_files = []

    def log(self, message):
        self.log_text.config(state='normal')
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state='disabled')
        self.root.update()

    def extract_folder_id(self, url):
        # Match common Google Drive folder URL patterns
        match = re.search(r'folder[s]?\/([a-zA-Z0-9-_]+)', url)
        if match:
            return match.group(1)
        match = re.search(r'id=([a-zA-Z0-9-_]+)', url)
        if match:
            return match.group(1)
        return url.strip() # Fallback to using the input as the ID directly

    def get_files_in_folder(self, folder_id, recursive, path=""):
        url = "https://www.googleapis.com/drive/v3/files"
        files_data = []
        page_token = None
        
        while True:
            params = {
                'q': f"'{folder_id}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'",
                'key': API_KEY,
                'fields': 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink)',
                'pageSize': 1000
            }
            if page_token:
                params['pageToken'] = page_token
                
            try:
                response = requests.get(url, params=params)
                if response.status_code != 200:
                    self.log(f"Error accessing folder {folder_id}: {response.text}")
                    break
                    
                data = response.json()
                items = data.get('files', [])
                
                for item in items:
                    item['path'] = f"{path}/{item['name']}" if path else item['name']
                    files_data.append(item)
                    self.log(f"Found: {item['path']}")
                    
                    if recursive and item['mimeType'] == 'application/vnd.google-apps.folder':
                        sub_files = self.get_files_in_folder(item['id'], recursive, item['path'])
                        files_data.extend(sub_files)
                        
                page_token = data.get('nextPageToken')
                if not page_token:
                    break
            except Exception as e:
                self.log(f"Exception: {e}")
                break
                
        return files_data

    def _extract_thread(self, folder_id, recursive):
        self.log(f"Starting extraction for folder ID: {folder_id}")
        self.extracted_files = self.get_files_in_folder(folder_id, recursive)
        
        self.log(f"\nExtraction complete. Found {len(self.extracted_files)} items.")
        self.extract_btn.config(state='normal')
        
        if self.extracted_files:
            self.save_btn.config(state='normal')
        
    def start_extraction(self):
        if not API_KEY:
            messagebox.showwarning("Configuration Error", "Set GOOGLE_DRIVE_API_KEY before running this tool.")
            return

        url = self.url_entry.get()
        if not url:
            messagebox.showwarning("Input Error", "Please enter a Google Drive folder URL.")
            return
            
        folder_id = self.extract_folder_id(url)
        recursive = self.recursive_var.get()
        
        self.extracted_files = []
        self.log_text.config(state='normal')
        self.log_text.delete(1.0, tk.END)
        self.log_text.config(state='disabled')
        
        self.extract_btn.config(state='disabled')
        self.save_btn.config(state='disabled')
        
        # Run in a separate thread to keep GUI responsive
        threading.Thread(target=self._extract_thread, args=(folder_id, recursive), daemon=True).start()

    def save_results(self):
        if not self.extracted_files:
            return
            
        filepath = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV Files", "*.csv"), ("Text Files", "*.txt"), ("Markdown Files", "*.md"), ("All Files", "*.*")],
            title="Save URLs"
        )
        
        if not filepath:
            return
            
        try:
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                if filepath.endswith('.csv'):
                    writer = csv.writer(f)
                    writer.writerow(["Name", "Path", "Type", "View Link", "Download Link"])
                    for item in self.extracted_files:
                        is_folder = item['mimeType'] == 'application/vnd.google-apps.folder'
                        type_str = "Folder" if is_folder else "File"
                        writer.writerow([
                            item['name'],
                            item['path'],
                            type_str,
                            item.get('webViewLink', ''),
                            item.get('webContentLink', '')
                        ])
                elif filepath.endswith('.md'):
                    f.write("# Extracted Google Drive URLs\n\n")
                    for item in self.extracted_files:
                        f.write(f"### {item['name']}\n")
                        f.write(f"- **Path**: {item['path']}\n")
                        f.write(f"- **View Link**: {item.get('webViewLink', 'N/A')}\n\n")
                else: # Default to txt
                    for item in self.extracted_files:
                        f.write(f"Name: {item['name']}\n")
                        f.write(f"Path: {item['path']}\n")
                        f.write(f"View Link: {item.get('webViewLink', 'N/A')}\n\n")
            messagebox.showinfo("Success", f"Successfully saved to {filepath}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save file: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = GDriveExtractorApp(root)
    root.mainloop()
