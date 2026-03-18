import pandas as pd


def parse_excel(path: str, sheet_name: str | None = None) -> dict[str, pd.DataFrame]:
    xls = pd.ExcelFile(path)
    sheets = [sheet_name] if sheet_name else xls.sheet_names
    result = {}
    for sheet in sheets:
        df = pd.read_excel(xls, sheet_name=sheet)
        df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]
        df = df.dropna(how="all").reset_index(drop=True)
        for col in df.columns:
            original = df[col].copy()
            converted = pd.to_numeric(df[col], errors="coerce")
            non_null_mask = original.notna()
            if non_null_mask.any() and converted[non_null_mask].notna().all():
                df[col] = converted
            else:
                df[col] = original
        table_name = sheet.strip().lower().replace(" ", "_")
        result[table_name] = df
    return result
