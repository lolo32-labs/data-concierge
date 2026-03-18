import pandas as pd


def parse_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, on_bad_lines="skip")
    df.columns = [col.strip().lower().replace(" ", "_") for col in df.columns]
    df = df.dropna(how="all").reset_index(drop=True)
    for col in df.columns:
        original = df[col].copy()
        converted = pd.to_numeric(df[col], errors="coerce")
        # Only replace column with numeric version if ALL non-null values converted successfully
        non_null_mask = original.notna()
        if non_null_mask.any() and converted[non_null_mask].notna().all():
            df[col] = converted
        else:
            df[col] = original
    return df
