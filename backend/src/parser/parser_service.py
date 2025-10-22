"""
Log Parser Service - Reusable wrapper for Drain log parser

This module provides a clean interface to use the Drain parser without requiring
file I/O. It accepts log content as strings and returns structured results.

Usage Example:
    from src.parser.parser_service import DrainParserService

    # Initialize parser
    parser = DrainParserService(
        log_format='<Date> <Time> <Level> <Content>',
        st=0.5,
        depth=4
    )

    # Parse log content
    result = parser.parse_log_content(log_content_string)

    # Access results
    print(result['templates'])  # List of discovered templates
    print(result['structured_logs'])  # Parsed logs with EventId
    print(result['statistics'])  # Parsing stats
"""

import sys
import os
import tempfile
import shutil
from typing import Dict, List, Optional, Any
import pandas as pd
from datetime import datetime

# Add the third_party logparser to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../third_party/logparser'))

from logparser.Drain import LogParser


class DrainParserService:
    """
    Wrapper service for Drain log parser that works with in-memory content
    """

    # Common log format templates
    LOG_FORMATS = {
        "hdfs": "<Date> <Time> <Pid> <Level> <Component>: <Content>"
    }

    # Common preprocessing regex patterns
    DEFAULT_REGEX_PATTERNS = {
        "hdfs": [
            r'blk_(|-)[0-9]+',  # block id
            r'(/|)([0-9]+\.){3}[0-9]+(:[0-9]+|)(:|)',  # IP
            r'(?<=[^A-Za-z0-9])(\-?\+?\d+)(?=[^A-Za-z0-9])|[0-9]+$',  # Numbers
        ]
    }

    def __init__(
        self,
        log_format: str = None,
        log_format_name: str = "hdfs",
        st: float = 0.5,
        depth: int = 4,
        max_child: int = 100,
        rex: List[str] = None,
        keep_para: bool = True
    ):
        """
        Initialize Drain Parser Service

        Args:
            log_format: Log format string (e.g., '<Date> <Time> <Level> <Content>')
                       If None, will use log_format_name to look up predefined format
            log_format_name: Name of predefined format (default: "generic")
            st: Similarity threshold (0.0-1.0, default: 0.5)
            depth: Depth of parse tree (default: 4)
            max_child: Maximum children per node (default: 100)
            rex: List of regex patterns for preprocessing (default: None)
            keep_para: Keep parameter list in output (default: True)
        """
        # Determine log format
        if log_format is None:
            self.log_format = self.LOG_FORMATS.get(log_format_name, self.LOG_FORMATS["hdfs"])
            self.log_format_name = log_format_name
        else:
            self.log_format = log_format
            self.log_format_name = "custom"

        # Set regex patterns
        if rex is None:
            self.rex = self.DEFAULT_REGEX_PATTERNS.get(self.log_format_name, self.DEFAULT_REGEX_PATTERNS["hdfs"])
        else:
            self.rex = rex

        # Parser parameters
        self.st = st
        self.depth = depth
        self.max_child = max_child
        self.keep_para = keep_para

    def parse_log_content(
        self,
        log_content: str,
        filename: str = "logfile.log"
    ) -> Dict[str, Any]:
        """
        Parse log content string using Drain algorithm

        Args:
            log_content: Raw log content as string
            filename: Optional filename for identification (default: "logfile.log")

        Returns:
            Dictionary containing:
            {
                'templates': List of dicts with EventId, EventTemplate, Occurrences
                'structured_logs': List of dicts with original log + EventId + EventTemplate
                'statistics': Dict with parsing metadata
                'success': Boolean indicating success
                'error': Error message if failed (None if success)
            }
        """
        temp_dir = None

        try:
            # Create temporary directory for Drain to work with
            temp_dir = tempfile.mkdtemp(prefix="drain_parse_")
            temp_input_dir = os.path.join(temp_dir, "input")
            temp_output_dir = os.path.join(temp_dir, "output")
            os.makedirs(temp_input_dir)
            os.makedirs(temp_output_dir)

            # Write log content to temporary file
            temp_log_file = os.path.join(temp_input_dir, filename)
            with open(temp_log_file, 'w', encoding='utf-8') as f:
                f.write(log_content)

            # Initialize Drain parser
            start_time = datetime.now()
            parser = LogParser(
                log_format=self.log_format,
                indir=temp_input_dir,
                outdir=temp_output_dir,
                depth=self.depth,
                st=self.st,
                maxChild=self.max_child,
                rex=self.rex,
                keep_para=self.keep_para
            )

            # Parse the log file
            parser.parse(filename)
            parsing_time = (datetime.now() - start_time).total_seconds()

            # Read results from temporary CSV files
            structured_file = os.path.join(temp_output_dir, f"{filename}_structured.csv")
            templates_file = os.path.join(temp_output_dir, f"{filename}_templates.csv")

            # Load structured logs
            df_structured = pd.read_csv(structured_file)
            structured_logs = df_structured.to_dict('records')

            # Load templates
            df_templates = pd.read_csv(templates_file)
            templates = df_templates.to_dict('records')

            # Calculate statistics
            total_lines = len(df_structured)
            unique_templates = len(df_templates)

            statistics = {
                "total_log_lines": total_lines,
                "unique_templates": unique_templates,
                "parsing_time_seconds": parsing_time,
                "log_format_used": self.log_format_name,
                "similarity_threshold": self.st,
                "tree_depth": self.depth,
                "timestamp": datetime.now().isoformat()
            }

            return {
                "templates": templates,
                "structured_logs": structured_logs,
                "statistics": statistics,
                "success": True,
                "error": None
            }

        except Exception as e:
            return {
                "templates": [],
                "structured_logs": [],
                "statistics": {},
                "success": False,
                "error": str(e)
            }

        finally:
            # Cleanup temporary directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                except Exception as cleanup_error:
                    print(f"Warning: Failed to cleanup temp directory: {cleanup_error}")

    def parse_log_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse log file directly from file path

        Args:
            file_path: Path to log file

        Returns:
            Same format as parse_log_content()
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            filename = os.path.basename(file_path)
            return self.parse_log_content(content, filename)

        except Exception as e:
            return {
                "templates": [],
                "structured_logs": [],
                "statistics": {},
                "success": False,
                "error": f"Failed to read file: {str(e)}"
            }

    @staticmethod
    def detect_log_format(log_content: str, sample_lines: int = 50) -> str:
        """
        Auto-detect log format from sample lines

        Args:
            log_content: Raw log content
            sample_lines: Number of lines to sample for detection

        Returns:
            Detected format name (key from LOG_FORMATS)
        """
        lines = log_content.strip().split('\n')[:sample_lines]

        # Check for common patterns
        for line in lines:
            # HDFS format check
            if 'INFO' in line or 'WARN' in line or 'ERROR' in line:
                if 'dfs.' in line or 'hdfs.' in line:
                    return "hdfs"

            # Apache access log check
            if line.startswith('"') or ' "GET ' in line or ' "POST ' in line:
                return "apache"

            # Syslog/Linux check
            if any(month in line[:20] for month in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']):
                return "linux"

            # Spark check
            if 'org.apache.spark' in line:
                return "spark"

        # Default fallback
        return "generic"

    @classmethod
    def create_parser_from_format_name(cls, format_name: str, **kwargs) -> 'DrainParserService':
        """
        Factory method to create parser from predefined format name

        Args:
            format_name: Name from LOG_FORMATS (e.g., "hdfs", "apache", "generic")
            **kwargs: Additional parameters to override defaults

        Returns:
            DrainParserService instance
        """
        return cls(log_format_name=format_name, **kwargs)

    @classmethod
    def get_available_formats(cls) -> List[str]:
        """
        Get list of available predefined log formats

        Returns:
            List of format names
        """
        return list(cls.LOG_FORMATS.keys())


# Convenience functions for quick usage

def parse_log_content(
    log_content: str,
    log_format: str = None,
    log_format_name: str = "hdfs",
    **kwargs
) -> Dict[str, Any]:
    """
    Quick function to parse log content with minimal setup

    Args:
        log_content: Raw log string
        log_format: Custom log format string (optional)
        log_format_name: Predefined format name (default: "generic")
        **kwargs: Additional parser parameters (st, depth, rex, etc.)

    Returns:
        Parse results dictionary

    Example:
        result = parse_log_content(my_log_string, log_format_name="hdfs")
        templates = result['templates']
    """
    parser = DrainParserService(
        log_format=log_format,
        log_format_name=log_format_name,
        **kwargs
    )
    return parser.parse_log_content(log_content)


def parse_log_file(file_path: str, log_format_name: str = "generic", **kwargs) -> Dict[str, Any]:
    """
    Quick function to parse log file

    Args:
        file_path: Path to log file
        log_format_name: Predefined format name (default: "generic")
        **kwargs: Additional parser parameters

    Returns:
        Parse results dictionary
    """
    parser = DrainParserService(log_format_name=log_format_name, **kwargs)
    return parser.parse_log_file(file_path)


def auto_parse_log_content(log_content: str, **kwargs) -> Dict[str, Any]:
    """
    Parse log content with automatic format detection

    Args:
        log_content: Raw log string
        **kwargs: Additional parser parameters

    Returns:
        Parse results dictionary
    """
    format_name = DrainParserService.detect_log_format(log_content)
    parser = DrainParserService(log_format_name=format_name, **kwargs)
    return parser.parse_log_content(log_content)