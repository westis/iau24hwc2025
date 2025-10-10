#!/usr/bin/env python3
import PyPDF2
import sys

pdf_path = sys.argv[1] if len(sys.argv) > 1 else 'data/entrylist.pdf'

with open(pdf_path, 'rb') as file:
    reader = PyPDF2.PdfReader(file)
    # Get first page with DEN entries
    for page_num in range(len(reader.pages)):
        text = reader.pages[page_num].extract_text()
        if 'DEN MEN' in text:
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if 'DEN MEN' in line:
                    # Print next 10 lines
                    for j in range(i, min(i+15, len(lines))):
                        print(f"{j-i:2d}: [{lines[j]}]")
                    break
            break
