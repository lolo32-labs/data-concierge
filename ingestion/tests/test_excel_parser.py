import os
import tempfile
import pandas as pd
from parsers.excel_parser import parse_excel

def test_parse_single_sheet():
    df = pd.DataFrame({"Product Name": ["Latte", "Espresso"], "Price": [5.50, 3.50]})
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        df.to_excel(f.name, index=False)
        path = f.name
    try:
        result = parse_excel(path)
        assert "sheet1" in result
        assert list(result["sheet1"].columns) == ["product_name", "price"]
        assert len(result["sheet1"]) == 2
    finally:
        os.unlink(path)

def test_parse_normalizes_sheet_names():
    df = pd.DataFrame({"A": [1]})
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        with pd.ExcelWriter(f.name) as writer:
            df.to_excel(writer, sheet_name="Sales Data", index=False)
        path = f.name
    try:
        result = parse_excel(path)
        assert "sales_data" in result
    finally:
        os.unlink(path)
