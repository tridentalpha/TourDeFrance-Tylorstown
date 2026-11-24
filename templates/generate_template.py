"""Generates the walking-routes authoring template (xlsx + csv) from the
current data/walking-routes.geojson, so the spreadsheet starts pre-filled
with the real routes already on the site."""

import csv
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
GEOJSON_PATH = ROOT / "data" / "walking-routes.geojson"
XLSX_PATH = ROOT / "templates" / "walking-routes-template.xlsx"
CSV_PATH = ROOT / "templates" / "walking-routes-template.csv"

HEADERS = [
    "Route ID",
    "Route Name",
    "Distance (km)",
    "Difficulty",
    "Point Order",
    "Point Title",
    "Point Description",
    "Latitude",
    "Longitude",
]

FONT_NAME = "Arial"


def load_rows():
    geojson = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    rows = []
    for feature in geojson["features"]:
        p = feature["properties"]
        lng, lat = feature["geometry"]["coordinates"]
        rows.append(
            [
                p["routeId"],
                p["routeName"],
                p["distanceKm"],
                p["difficulty"],
                p["order"],
                p["title"],
                p.get("description", ""),
                lat,
                lng,
            ]
        )
    return rows


def build_csv(rows):
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(HEADERS)
        writer.writerows(rows)


def build_xlsx(rows):
    wb = Workbook()

    # ---- Instructions sheet ----
    info = wb.active
    info.title = "Instructions"
    info.sheet_view.showGridLines = False
    info.column_dimensions["A"].width = 95

    title_font = Font(name=FONT_NAME, size=14, bold=True, color="C8102E")
    heading_font = Font(name=FONT_NAME, size=11, bold=True)
    body_font = Font(name=FONT_NAME, size=10.5)

    lines = [
        ("Walking Routes Template — How to use this sheet", title_font),
        ("", body_font),
        (
            "Each row is one POINT OF INTEREST (a stop) along a walking route. "
            "Several rows that share the same Route ID make up a single route, "
            "shown in the order given by Point Order.",
            body_font,
        ),
        ("", body_font),
        ("Column reference", heading_font),
        (
            "Route ID — a short code, lowercase with hyphens (e.g. penrhys-loop). "
            "Must be EXACTLY the same on every row that belongs to this route.",
            body_font,
        ),
        ("Route Name — the name shown to visitors, e.g. “Penrhys Viewpoint Loop”.", body_font),
        ("Distance (km) — total route distance. Repeat the same number on every row of the route.", body_font),
        ("Difficulty — choose Easy, Moderate or Hard from the dropdown (same on every row of the route).", body_font),
        ("Point Order — 1, 2, 3… the order this stop appears in when walking the route.", body_font),
        ("Point Title — short name for this stop, e.g. “Our Lady of Penrhys Shrine”.", body_font),
        ("Point Description — one or two sentences shown when a visitor reaches this stop.", body_font),
        ("Latitude / Longitude — decimal degrees, e.g. 51.6610 / -3.4330.", body_font),
        ("", body_font),
        ("Finding latitude / longitude", heading_font),
        (
            "In Google Maps, right-click the exact spot on the map — the coordinates appear "
            "at the top of the menu; click them to copy. Paste the first number into Latitude "
            "and the second into Longitude.",
            body_font,
        ),
        ("", body_font),
        ("Adding a new route", heading_font),
        (
            "The “Walking Routes” tab already lists the routes currently on the site — "
            "feel free to edit them. To add a brand new route, add new rows at the bottom "
            "with a new Route ID, following the same pattern as the examples above.",
            body_font,
        ),
        ("", body_font),
        (
            "Once finished, send this file back so the routes can be added to the map.",
            body_font,
        ),
    ]
    for i, (text, font) in enumerate(lines, start=1):
        cell = info.cell(row=i, column=1, value=text)
        cell.font = font
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        info.row_dimensions[i].height = 34 if len(text) > 70 else 18

    # ---- Data sheet ----
    ws = wb.create_sheet("Walking Routes")
    ws.append(HEADERS)

    header_font = Font(name=FONT_NAME, size=10.5, bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="2F8F4E")
    for col in range(1, len(HEADERS) + 1):
        c = ws.cell(row=1, column=col)
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 28
    ws.freeze_panes = "A2"

    body_cell_font = Font(name=FONT_NAME, size=10.5)
    for r, row in enumerate(rows, start=2):
        for c, value in enumerate(row, start=1):
            cell = ws.cell(row=r, column=c, value=value)
            cell.font = body_cell_font
            if c in (3, 8, 9):  # Distance, Latitude, Longitude
                cell.number_format = "0.0000" if c in (8, 9) else "0.0"

    widths = [16, 28, 13, 12, 12, 30, 48, 12, 12]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[chr(64 + i)].width = w

    # Difficulty dropdown, applied well beyond the current data so new rows keep it
    last_row = len(rows) + 1
    extra_blank_rows = 15
    dv_last_row = last_row + extra_blank_rows
    dv = DataValidation(type="list", formula1='"Easy,Moderate,Hard"', allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv)
    dv.add(f"D2:D{dv_last_row}")

    # Leave a few styled, empty rows ready for a new route
    for r in range(last_row + 1, dv_last_row + 1):
        for c in range(1, len(HEADERS) + 1):
            ws.cell(row=r, column=c).font = body_cell_font

    wb.save(XLSX_PATH)


def main():
    rows = load_rows()
    build_csv(rows)
    build_xlsx(rows)
    print(f"Wrote {len(rows)} rows to:\n  {CSV_PATH}\n  {XLSX_PATH}")


if __name__ == "__main__":
    main()
