## 3.3 Dataset Preparation

This section describes the comprehensive dataset preparation methodology employed in this research for developing and evaluating the AI-powered log anomaly detection framework. Dataset preparation is a critical component that directly impacts the performance of both traditional machine learning models and large language model integration. Our approach encompasses data collection, preprocessing, validation, and transformation processes designed to ensure data quality and experimental reproducibility.

### 3.3.1 Dataset Sources and Collection Strategy

#### Primary Dataset Collections

The research utilizes multiple complementary dataset collections to ensure comprehensive evaluation across diverse system environments:

**LogHub Dataset Collection**
The primary datasets are sourced from the LogHub repository, a widely-recognized collection of system log datasets maintained by the LogPAI research group. LogHub provides standardized log datasets from various system types, ensuring broad applicability and benchmark compatibility.

**Dataset Categories:**
- **Distributed Systems**: HDFS, Hadoop, Spark, Zookeeper, OpenStack
- **Supercomputers**: Blue Gene/L (BGL), High Performance Cluster (HPC), Thunderbird
- **Operating Systems**: Windows, Linux, macOS
- **Mobile Systems**: Android, HealthApp
- **Server Applications**: Apache, OpenSSH
- **Standalone Software**: Proxifier

#### Specialized Benchmark Datasets

**Loghub_2k Dataset Suite**
The Loghub_2k collection provides curated 2,000-line samples from each system type, specifically designed for log parser benchmarking and algorithm evaluation. These datasets include:
- Manually validated log message templates
- Ground truth event identifications
- Structured parsing results for baseline comparison

**Loghub_2k_corrected Dataset**
An enhanced version of the Loghub_2k dataset that addresses template identification inaccuracies in the original collection, providing more reliable ground truth for evaluation metrics.

#### Anomaly Detection Training Data

**HDFS Anomaly Dataset**
For supervised anomaly detection model training, we utilize the HDFS 100k structured dataset which includes:
- 100,000+ structured log entries
- Binary anomaly labels (Normal/Anomaly) at the block level
- Session-based grouping for sequence analysis
- Comprehensive feature vectors for traditional ML approaches

### 3.3.2 Dataset Characteristics and Statistical Analysis

#### Scale and Diversity Metrics

| **Dataset** | **Log Lines** | **Templates** | **System Type** | **Time Span** | **Complexity** |
|-------------|---------------|---------------|-----------------|---------------|----------------|
| **Apache** | 1,999 | 6 | Web Server | 263.9 days | Low |
| **Proxifier** | 1,999 | 8 | Standalone Software | N.A. | Low |
| **HDFS** | 2,000 | 14 | Distributed System | 38.7 hours | Medium |
| **OpenSSH** | 1,999 | 27 | Server Application | 28.4 days | Medium |
| **Spark** | 2,000 | 36 | Distributed System | N.A. | Medium |
| **OpenStack** | 1,999 | 43 | Cloud Platform | N.A. | High |
| **HPC** | 2,000 | 46 | Supercomputer | N.A. | High |
| **Windows** | 1,999 | 50 | Operating System | 226.7 days | High |
| **Zookeeper** | 1,999 | 50 | Distributed System | 26.7 days | High |
| **HealthApp** | 1,999 | 75 | Mobile Application | 10.5 days | High |
| **Hadoop** | 1,999 | 114 | Distributed System | N.A. | Very High |
| **Linux** | 1,999 | 118 | Operating System | 263.9 days | Very High |
| **BGL** | 1,999 | 120 | Supercomputer | 214.7 days | Very High |
| **Thunderbird** | 1,999 | 149 | Supercomputer | 244 days | Very High |
| **Android** | 1,999 | 166 | Mobile OS | N.A. | Very High |
| **Mac** | 1,999 | 341 | Operating System | 7.0 days | Extremely High |

#### Template Complexity Distribution

The datasets exhibit varying degrees of template complexity, measured by the template-to-log ratio:

- **Low Complexity (≤20 templates)**: Apache, Proxifier, HDFS, OpenSSH
- **Medium Complexity (21-50 templates)**: Spark, OpenStack, HPC, Windows, Zookeeper  
- **High Complexity (51-150 templates)**: HealthApp, Hadoop, Linux, BGL, Thunderbird, Android
- **Extremely High Complexity (>150 templates)**: Mac

This distribution enables comprehensive evaluation across different log structure complexities, from highly structured system logs to diverse user-facing application logs.

### 3.3.3 Data Preprocessing and Standardization

#### Multi-Format Log Parsing Pipeline

Our preprocessing pipeline accommodates diverse log formats through a standardized parsing approach:

**Format Detection and Standardization**
```python
LOG_FORMATS = {
    "hdfs": "<Date> <Time> <Pid> <Level> <Component>: <Content>",
    "apache": "[<Date>] [<Level>] <Content>", 
    "linux": "<Month> <Date> <Time> <Host> <Component>: <Content>",
    "generic": "<Timestamp> <Level> <Content>"
}
```

**Preprocessing Regex Patterns**
Standardized regular expression patterns for each log type ensure consistent variable extraction:

- **Block Identifiers**: `r'blk_(|-)[0-9]+'` for HDFS block references
- **IP Addresses**: `r'(?<=[^A-Za-z0-9])(\-?\+?\d+)(?=[^A-Za-z0-9])'` for network addresses  
- **Numeric Parameters**: `r'[0-9]+$'` for extracting variable numeric values
- **File Paths**: System-specific path pattern recognition

#### Content Normalization Process

**Character Encoding Standardization**
All log files are processed using UTF-8 encoding with error handling for corrupted characters:

```python
def normalize_encoding(log_content):
    """Standardize character encoding across all datasets"""
    return log_content.encode('utf-8', errors='ignore').decode('utf-8')
```

**Timestamp Standardization**
Diverse timestamp formats are normalized to ISO 8601 format for consistent temporal analysis:

- **HDFS Format**: `YYMMDD HHMMSS` → `YYYY-MM-DD HH:MM:SS`
- **Apache Format**: `[Day Month DD HH:MM:SS YYYY]` → `YYYY-MM-DD HH:MM:SS`
- **Linux Format**: `Month DD HH:MM:SS` → `YYYY-MM-DD HH:MM:SS` (with year inference)

### 3.3.4 Data Quality Assurance and Validation

#### Automated Quality Checks

**File Integrity Validation**
- **Line Count Verification**: Ensure expected line counts match dataset specifications
- **Character Encoding Validation**: Detect and handle non-UTF-8 characters
- **Format Consistency Checks**: Verify log entries conform to expected structural patterns

**Content Quality Assessment**
```python
def validate_log_quality(log_content):
    """Comprehensive log quality assessment"""
    metrics = {
        'total_lines': len(log_content.split('\n')),
        'empty_lines': log_content.count('\n\n'),
        'encoding_errors': detect_encoding_issues(log_content),
        'malformed_entries': count_malformed_entries(log_content),
        'timestamp_coverage': calculate_timestamp_coverage(log_content)
    }
    return metrics
```

#### Template Ground Truth Validation

**Manual Template Verification**
For evaluation datasets, we implement a multi-stage validation process:

1. **Automated Template Extraction**: Initial template discovery using Drain algorithm
2. **Ground Truth Comparison**: Validation against manually annotated templates
3. **Discrepancy Analysis**: Investigation of template matching accuracy
4. **Corrected Ground Truth Integration**: Utilization of Loghub_2k_corrected datasets where available

**Template Quality Metrics**
- **Parsing Accuracy**: Percentage of correctly parsed log entries
- **Template Coverage**: Ratio of logs successfully matched to templates
- **False Positive Rate**: Incorrect template assignments
- **Template Granularity**: Assessment of over-parsing or under-parsing issues

### 3.3.5 Data Transformation and Feature Engineering

#### Structured Log Generation

**Drain Algorithm Configuration**
The log parsing process employs optimized Drain algorithm parameters:

- **Similarity Threshold (st)**: 0.5 (balanced precision-recall trade-off)
- **Parse Tree Depth**: 4 (optimal for most log types)
- **Maximum Child Nodes**: 100 (preventing tree explosion)
- **Parameter Retention**: Enabled for debugging and analysis

**Output Standardization**
All datasets are transformed into consistent structured format:

```csv
LineId,Date,Time,Pid,Level,Component,Content,EventId,EventTemplate
1,081109,203518,143,INFO,dfs.DataNode$DataXceiver,"Receiving block blk_-123...",E5,"Receiving block <*> src: /<*> dest: /<*>"
```

#### Feature Vector Generation

**Traditional ML Features**
For supervised anomaly detection, we generate comprehensive feature vectors:

1. **Template Frequency Features**: Occurrence counts for each template type
2. **Temporal Features**: Time-based patterns and sequence information
3. **Parametric Features**: Statistical analysis of variable components
4. **Session-Based Features**: Block-level aggregation for HDFS datasets

**LLM-Compatible Representations**
For large language model integration:

1. **Contextual Summaries**: Template-based log abstractions
2. **Anomaly Context**: Surrounding log entries for anomalous events
3. **System State Representations**: High-level system behavior descriptions
4. **Natural Language Templates**: Human-readable template descriptions

### 3.3.6 Dataset Partitioning and Experimental Setup

#### Training/Validation/Testing Splits

**Stratified Partitioning Strategy**
To ensure representative sampling across different log complexity levels:

- **Training Set**: 60% of each dataset (stratified by template distribution)
- **Validation Set**: 20% for hyperparameter tuning and model selection
- **Testing Set**: 20% for final performance evaluation

**Temporal Considerations**
For datasets with temporal information, we implement time-aware splitting to prevent data leakage:

- **Chronological Split**: Earlier logs for training, later logs for testing
- **Session Preservation**: Maintaining complete session integrity across splits
- **Anomaly Distribution**: Ensuring balanced normal/anomaly representation

#### Cross-Dataset Validation Strategy

**Domain Transfer Evaluation**
To assess model generalizability, we implement cross-dataset evaluation:

1. **Within-Domain Transfer**: Training on one system type, testing on related systems
2. **Cross-Domain Transfer**: Evaluation across different system categories
3. **Mixed-Domain Training**: Multi-dataset training for robust model development

**Benchmark Consistency**
All experiments maintain consistency with established benchmarks:

- **Standard Metrics**: Precision, Recall, F1-Score, Accuracy for parsing evaluation
- **Anomaly Detection Metrics**: ROC-AUC, PR-AUC for classification tasks
- **Template Matching**: Edit distance and semantic similarity for template quality

### 3.3.7 Data Handling and Storage Architecture

#### Scalable Data Pipeline

**MinIO Object Storage Organization**
```
raw-logs/                    # Original uploaded datasets
├── benchmark/
│   ├── loghub_2k/
│   │   ├── HDFS/HDFS_2k.log
│   │   └── Apache/Apache_2k.log
│   └── loghub_2k_corrected/
└── user_uploads/            # User-provided datasets

processed-logs/              # Structured results
├── parsed/
│   ├── HDFS_2k_structured.csv
│   └── Apache_2k_structured.csv
├── features/
└── annotations/
```

**Database Schema for Metadata**
```sql
-- Dataset registry and metadata tracking
datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    source_type ENUM('benchmark', 'user_upload'),
    system_type VARCHAR,
    total_lines INTEGER,
    template_count INTEGER,
    complexity_level ENUM('low', 'medium', 'high', 'very_high', 'extreme'),
    quality_score DECIMAL(5,4),
    created_at TIMESTAMP
);

-- Processing job tracking for reproducibility
processing_metadata (
    id UUID PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id),
    processing_parameters JSONB,
    parsing_results JSONB,
    quality_metrics JSONB,
    execution_time_ms INTEGER
);
```

#### Reproducibility and Version Control

**Parameter Tracking**
All data processing steps are logged with complete parameter configurations:

```python
processing_config = {
    "drain_parameters": {
        "similarity_threshold": 0.5,
        "tree_depth": 4,
        "regex_patterns": ["r'blk_[0-9]+'", "r'[0-9]+$'"]
    },
    "preprocessing_steps": [
        "encoding_normalization",
        "timestamp_standardization", 
        "content_cleaning"
    ],
    "quality_thresholds": {
        "min_parsing_accuracy": 0.95,
        "max_malformed_rate": 0.01
    }
}
```

**Dataset Versioning**
- **Checksum Verification**: MD5 hashes for dataset integrity
- **Processing Lineage**: Complete audit trail of all transformations
- **Rollback Capability**: Ability to revert to previous processing states
- **Configuration Management**: Version control for all preprocessing parameters

### 3.3.8 Ethical Considerations and Data Privacy

#### Privacy Protection Measures

**Data Anonymization**
All datasets undergo anonymization to protect sensitive information:

- **IP Address Masking**: Real IP addresses replaced with anonymized identifiers
- **User Identifier Removal**: Personal identifiers stripped from mobile application logs
- **Path Sanitization**: Internal file paths generalized to prevent information leakage

**Compliance and Usage Rights**
- **License Compliance**: All datasets used under appropriate academic research licenses
- **Attribution Requirements**: Proper citation of original dataset contributors
- **Usage Limitations**: Adherence to research-only usage restrictions where applicable

#### Bias Mitigation Strategies

**Dataset Diversity**
To minimize bias in model development:

- **System Type Diversity**: Representation across multiple computing environments
- **Scale Variety**: Datasets ranging from small applications to large-scale distributed systems
- **Temporal Diversity**: Logs spanning different time periods and system states
- **Complexity Spectrum**: Balanced representation of simple and complex log patterns

**Annotation Quality Control**
- **Multi-Annotator Validation**: Ground truth verified by multiple domain experts
- **Inter-Annotator Agreement**: Statistical measures of annotation consistency
- **Bias Detection**: Systematic analysis of annotation patterns for systematic biases

This comprehensive dataset preparation methodology ensures robust experimental foundations while maintaining reproducibility, scalability, and ethical standards essential for rigorous scientific research in log anomaly detection.