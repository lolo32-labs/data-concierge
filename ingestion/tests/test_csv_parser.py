import os
import tempfile
import pytest
import pandas as pd
from parsers.csv_parser import parse_csv

def test_parse_simple_csv():
    csv_content = "Name,Email,Total\nAlice,alice@test.com,100.50\nBob,bob@test.com,200.00\n"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write(csv_content)
        path = f.name
    try:
        df = parse_csv(path)
        assert isinstance(df, pd.DataFrame)
        assert len(df) == 2
        assert list(df.columns) == ["name", "email", "total"]
        assert df["total"].dtype == float
    finally:
        os.unlink(path)

def test_parse_csv_normalizes_columns():
    csv_content = "First Name,Last Name,Order Total\nAlice,Smith,50\n"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write(csv_content)
        path = f.name
    try:
        df = parse_csv(path)
        assert list(df.columns) == ["first_name", "last_name", "order_total"]
    finally:
        os.unlink(path)

def test_parse_csv_drops_empty_rows():
    csv_content = "Name,Total\nAlice,100\n,,\nBob,200\n"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write(csv_content)
        path = f.name
    try:
        df = parse_csv(path)
        assert len(df) == 2
    finally:
        os.unlink(path)
