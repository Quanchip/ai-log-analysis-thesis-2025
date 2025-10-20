"""
Example usage of DrainParserService

This file demonstrates how to use the parser service in different scenarios
"""

from parser_service import DrainParserService, parse_log_content, auto_parse_log_content


# Example 1: Using the convenience function for quick parsing
def example_quick_parse():
    """Quick parsing with minimal setup"""

    log_content = """
081109 203615 148 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010
081109 203615 149 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010
081109 203616 150 INFO dfs.DataNode$PacketResponder: Received block blk_-1608999687919862906 of size 67108864 from /10.250.19.102
    """

    # Parse with HDFS format
    result = parse_log_content(log_content, log_format_name="hdfs")

    if result['success']:
        print(f"✓ Parsed {result['statistics']['total_log_lines']} lines")
        print(f"✓ Found {result['statistics']['unique_templates']} unique templates")
        print(f"✓ Parsing took {result['statistics']['parsing_time_seconds']:.2f} seconds")

        print("\nTemplates discovered:")
        for template in result['templates']:
            print(f"  - [{template['EventId']}] {template['EventTemplate']} (x{template['Occurrences']})")
    else:
        print(f"✗ Parsing failed: {result['error']}")


# Example 2: Using DrainParserService class for more control
def example_class_based():
    """Using the class for more control over parsing"""

    # Initialize parser with custom parameters
    parser = DrainParserService(
        log_format_name="hdfs",
        st=0.5,  # Similarity threshold
        depth=4,  # Tree depth
        keep_para=True  # Keep parameter list
    )

    log_content = """
081109 203615 148 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010
081109 203616 149 INFO dfs.DataNode$PacketResponder: Received block blk_-1608999687919862906 of size 67108864 from /10.250.19.102
    """

    result = parser.parse_log_content(log_content)

    print("Structured logs:")
    for log in result['structured_logs']:
        print(f"  Line {log.get('LineId')}: EventID={log.get('EventId')}")


# Example 3: Auto-detect format
def example_auto_detect():
    """Let the parser auto-detect the log format"""

    log_content = """
081109 203615 148 INFO dfs.DataNode$DataXceiver: Receiving block blk_123
081109 203616 149 INFO dfs.DataNode$PacketResponder: Received block blk_456
    """

    result = auto_parse_log_content(log_content)

    print(f"Auto-detected format: {result['statistics']['log_format_used']}")
    print(f"Found {result['statistics']['unique_templates']} templates")


# Example 4: Using in Celery task (realistic scenario)
def example_celery_task_usage():
    """
    How to use the parser in your Celery task
    """

    # Simulating what happens in your Celery task
    # In real code, this would be downloaded from MinIO
    log_file_content = """
081109 203615 148 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906
081109 203616 149 INFO dfs.DataNode$PacketResponder: Received block blk_-1608999687919862906
081109 203617 150 INFO dfs.DataNode$DataXceiver: Receiving block blk_7128370537834320473
    """

    # Option 1: Auto-detect format
    result = auto_parse_log_content(log_file_content)

    # Option 2: Specify format if you know it
    # result = parse_log_content(log_file_content, log_format_name="hdfs")

    if result['success']:
        # Convert results to CSV or JSON for MinIO upload
        import pandas as pd
        import json

        # Templates as CSV
        df_templates = pd.DataFrame(result['templates'])
        templates_csv = df_templates.to_csv(index=False)

        # Structured logs as CSV
        df_structured = pd.DataFrame(result['structured_logs'])
        structured_csv = df_structured.to_csv(index=False)

        # Statistics as JSON
        statistics_json = json.dumps(result['statistics'], indent=2)

        print("Ready to upload to MinIO:")
        print(f"  - Templates CSV: {len(templates_csv)} bytes")
        print(f"  - Structured CSV: {len(structured_csv)} bytes")
        print(f"  - Statistics JSON: {len(statistics_json)} bytes")

        return templates_csv, structured_csv, statistics_json
    else:
        print(f"Parsing failed: {result['error']}")
        return None, None, None


# Example 7: Error handling
def example_error_handling():
    """Proper error handling"""

    invalid_log_content = ""  # Empty content

    result = parse_log_content(invalid_log_content, log_format_name="hdfs")

    if not result['success']:
        print(f"Parsing failed as expected: {result['error']}")
        # Handle error appropriately (log, retry, notify user, etc.)
    else:
        print("Parsing succeeded")


if __name__ == "__main__":
    print("=" * 60)
    print("Example 1: Quick Parse")
    print("=" * 60)
    example_quick_parse()

    print("\n" + "=" * 60)
    print("Example 2: Class-based Usage")
    print("=" * 60)
    example_class_based()

    print("\n" + "=" * 60)
    print("Example 3: Auto-detect Format")
    print("=" * 60)
    example_auto_detect()

    print("\n" + "=" * 60)
    print("Example 4: Celery Task Usage")
    print("=" * 60)
    example_celery_task_usage()

    print("\n" + "=" * 60)
    print("Example 7: Error Handling")
    print("=" * 60)
    example_error_handling()
