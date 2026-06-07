#!/usr/bin/env python3
"""MCP server for PDF reading via opendataloader-pdf."""
import os
import sys
import tempfile
from mcp.server.fastmcp import FastMCP
import opendataloader_pdf

mcp = FastMCP("pdf-reader")


@mcp.tool()
def read_pdf(file_path: str, pages: str = None, format: str = "markdown") -> str:
    """
    Extract structured content from a PDF file.

    Uses opendataloader-pdf with XY-Cut reading order analysis — much more
    token-efficient than reading raw PDF bytes. Handles tables, headings, lists.

    Args:
        file_path: Absolute path to the PDF file (supports ~/ expansion)
        pages:     Optional page range, e.g. "1,3,5-7". Default: all pages
        format:    Output format: markdown (default), text, or html
    """
    file_path = os.path.expanduser(file_path)
    if not os.path.exists(file_path):
        return f"Error: file not found: {file_path}"

    ext_map = {"markdown": ".md", "text": ".txt", "html": ".html"}
    ext = ext_map.get(format, ".md")

    with tempfile.TemporaryDirectory() as tmp_dir:
        opendataloader_pdf.convert(
            input_path=file_path,
            output_dir=tmp_dir,
            format=format,
            image_output="off",
            quiet=True,
            pages=pages,
        )
        base = os.path.splitext(os.path.basename(file_path))[0]
        out_file = os.path.join(tmp_dir, base + ext)
        if os.path.exists(out_file):
            with open(out_file, encoding="utf-8") as f:
                return f.read()
        # Fallback: find any file with matching extension
        for name in os.listdir(tmp_dir):
            if name.endswith(ext):
                with open(os.path.join(tmp_dir, name), encoding="utf-8") as f:
                    return f.read()
        return "Error: opendataloader-pdf produced no output"


if __name__ == "__main__":
    mcp.run()
