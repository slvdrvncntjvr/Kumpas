import os
import shutil
import csv

mappings = {
    'marriage_license': ('105', 'MARRIAGE LICENSE', 'DOCUMENT'),
    'barangay_clearance': ('106', 'BARANGAY CLEARANCE', 'DOCUMENT'),
    'certificate_of_indigency': ('107', 'CERTIFICATE OF INDIGENCY', 'DOCUMENT'),
    'certificate_of_residency': ('108', 'CERTIFICATE OF RESIDENCY', 'DOCUMENT'),
    'cedula': ('109', 'CEDULA', 'DOCUMENT'),
    'blotter_report': ('110', 'BLOTTER REPORT', 'DOCUMENT'),
    'ayuda': ('111', 'AYUDA', 'DOCUMENT'),
    'drivers_license': ('113', 'DRIVERS LICENSE', 'DOCUMENT'),
    'land_deed': ('114', 'LAND DEED', 'DOCUMENT')
}

base_dir = r"c:\Users\Justin A Jose\COLLEGE\2ND YEAR\2nd sem\Kumpas\training\clips\clips"
train_csv_path = r"c:\Users\Justin A Jose\COLLEGE\2ND YEAR\2nd sem\Kumpas\training\train.csv"

new_rows = []

for folder, (id_label, label, category) in mappings.items():
    folder_path = os.path.join(base_dir, folder)
    if not os.path.exists(folder_path):
        print(f"Skipping {folder}, does not exist")
        continue
    
    # Find source videos (files that are not pure digits .mp4)
    all_files = os.listdir(folder_path)
    source_files = []
    for f in all_files:
        if f.endswith('.mp4'):
            name = f[:-4]
            if not name.isdigit():
                source_files.append(f)
    
    if not source_files:
        print(f"No source files found in {folder}")
        continue
        
    source_files.sort()
    
    for i in range(21, 41):
        target_name = f"{i}.mp4"
        target_path = os.path.join(folder_path, target_name)
        
        if not os.path.exists(target_path):
            source_file = source_files[(i - 21) % len(source_files)]
            src_path = os.path.join(folder_path, source_file)
            shutil.copy2(src_path, target_path)
            print(f"Copied {source_file} -> {target_path}")
        
        # Add to train.csv rows
        vid_path = f"clips\\{folder}\\{target_name}"
        new_rows.append([vid_path, id_label, label, category])

# Append to train.csv
if new_rows:
    with open(train_csv_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        for row in new_rows:
            writer.writerow(row)
            
print(f"Appended {len(new_rows)} rows to train.csv")
