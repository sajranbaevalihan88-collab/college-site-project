import sys
import pandas as pd
import json

# парсинг экселек
try:
    fp = sys.argv[1]
    xl = pd.ExcelFile(fp)
    html_output = ""
    for sheet_name in xl.sheet_names:
        df = pd.read_excel(fp, sheet_name=sheet_name)
        df = df.fillna('') # убираем nan
        html_table = df.to_html(index=False, classes=['table', 'excel-table'], border=0)
        html_output += "<div class='excel-sheet-title'>" + sheet_name + "</div>"
        html_output += "<div class='excel-table-container'>" + html_table + "</div>"
    print(json.dumps({"status": "success", "html": html_output}))
except Exception as e:
    # print("error:", e)
    print(json.dumps({"status": "error", "message": str(e)}))
