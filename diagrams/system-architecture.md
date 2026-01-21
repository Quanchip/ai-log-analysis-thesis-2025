# AI Log Analysis System - Architecture Diagram

## Overall System Architecture (6 Layers)

```mermaid
graph TB
    subgraph Layer1["1. PRESENTATION LAYER"]
        UI["React SPA (Port 3002)"]
        UI_Components["Login/Register<br/>File Upload<br/>Dashboard<br/>Admin Panel"]
        UI_Features["JWT Auth | Role-based Access"]
    end

    subgraph Layer2["2. API GATEWAY LAYER"]
        API["FastAPI Backend (Port 8000)"]
        Routers["Auth Router<br/>Logs Router<br/>Jobs Router<br/>LLM Router"]
        API_Features["Request Validation<br/>Response Formatting"]
    end

    subgraph Layer3["3. SERVICE LAYER - Core Business Logic"]
        AuthService["User Service<br/>• Authentication<br/>• JWT Tokens<br/>• User CRUD"]
        LogService["Log Service<br/>• File Upload<br/>• Validation<br/>• Metadata"]
        JobService["Job Service<br/>• Create Jobs<br/>• Status Tracking<br/>• Task Queue"]
        LLMService["LLM Service<br/>• Chat Logic<br/>• Context Loading<br/>• Suggestions"]
    end

    subgraph Layer4["4. DATA PROCESSING LAYER - Async Tasks"]
        CeleryWorker["Celery Workers"]
        Step1["STEP 1: Drain Parser<br/>Raw Logs → Structured CSV<br/>Extract Templates"]
        Step2["STEP 2: ML Detection<br/>Decision Tree Model<br/>Predict Anomalies"]
        Step3["STEP 3: LLM Analysis<br/>OpenAI GPT<br/>Explanations & Suggestions"]
    end

    subgraph Layer5["5. STORAGE LAYER"]
        MinIO["MinIO Object Storage<br/>(Port 9000)<br/>• raw-logs bucket<br/>• processed-logs bucket"]
        PostgreSQL["PostgreSQL Database<br/>(Port 5432)<br/>• users<br/>• log_files<br/>• processing_jobs<br/>• chat_sessions"]
        Redis["Redis In-Memory<br/>(Port 6379)<br/>• Task Queue<br/>• Cache"]
    end

    subgraph Layer6["6. TASK MANAGEMENT LAYER"]
        Producer["Task Producer<br/>(FastAPI)"]
        Broker["Redis Broker<br/>(Task Queue)"]
        Workers["Celery Workers<br/>(Parallel Execution)"]
        Monitor["Flower Monitor<br/>(Port 5555)"]
    end

    %% Connections between layers
    UI --> API
    API --> AuthService
    API --> LogService
    API --> JobService
    API --> LLMService

    LogService --> MinIO
    LogService --> PostgreSQL
    JobService --> Producer

    Producer --> Broker
    Broker --> CeleryWorker

    CeleryWorker --> Step1
    Step1 --> Step2
    Step2 --> Step3

    CeleryWorker --> MinIO
    CeleryWorker --> PostgreSQL
    CeleryWorker --> Redis

    Workers --> Monitor

    classDef layer1Style fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef layer2Style fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef layer3Style fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef layer4Style fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef layer5Style fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef layer6Style fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class Layer1 layer1Style
    class Layer2 layer2Style
    class Layer3 layer3Style
    class Layer4 layer4Style
    class Layer5 layer5Style
    class Layer6 layer6Style
```

## Simplified Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as FastAPI
    participant Service
    participant MinIO
    participant DB as PostgreSQL
    participant Queue as Redis Queue
    participant Worker as Celery Worker
    participant LLM as OpenAI

    User->>Frontend: 1. Upload log file
    Frontend->>API: 2. POST /api/logs/upload
    API->>Service: 3. Validate & process
    Service->>MinIO: 4. Store raw file
    Service->>DB: 5. Create LogFile & Job
    Service->>Queue: 6. Queue processing task
    Queue->>Worker: 7. Pick task

    Worker->>MinIO: 8. Download raw file
    Worker->>Worker: 9. Parse (Drain)
    Worker->>Worker: 10. ML Detection
    Worker->>LLM: 11. Analyze anomalies
    LLM-->>Worker: 12. Return insights
    Worker->>MinIO: 13. Upload results
    Worker->>DB: 14. Update job status

    Frontend->>API: 15. Poll job status
    API-->>Frontend: 16. Return results
    Frontend-->>User: 17. Display results
```

## Component Interaction

```mermaid
flowchart LR
    subgraph Frontend
        A[React UI]
    end

    subgraph Backend
        B[FastAPI Gateway]
        C[Service Layer]
    end

    subgraph Processing
        D[Celery Worker]
        E[Drain Parser]
        F[ML Model]
        G[LLM Service]
    end

    subgraph Storage
        H[(PostgreSQL)]
        I[MinIO]
        J[(Redis)]
    end

    A -->|HTTP/REST| B
    B --> C
    C --> H
    C --> I
    C -->|Queue Task| J
    J --> D
    D --> E
    E --> F
    F --> G
    D --> I
    D --> H

    style A fill:#61dafb
    style B fill:#009688
    style C fill:#4caf50
    style D fill:#ff9800
    style E fill:#ffc107
    style F fill:#ff5722
    style G fill:#9c27b0
    style H fill:#2196f3
    style I fill:#e91e63
    style J fill:#f44336
```

## Technology Stack Overview

```mermaid
mindmap
  root((AI Log Analysis<br/>System))
    Presentation
      React
      TypeScript
      Axios
      JWT Auth
    API Gateway
      FastAPI
      Pydantic
      OpenAPI
    Services
      Python
      SQLAlchemy
      Business Logic
    Processing
      Celery
      Drain Algorithm
      Scikit-learn
      OpenAI GPT
    Storage
      MinIO
        Object Storage
        Raw Logs
        Processed Results
      PostgreSQL
        User Data
        Metadata
        Job Status
      Redis
        Task Queue
        Caching
    Deployment
      Docker
      Docker Compose
      Flower Monitor
```

---

## How to Use These Diagrams

1. **For Markdown Preview**: Use VSCode with Mermaid extension
2. **For Thesis (Images)**:
   - Use [Mermaid Live Editor](https://mermaid.live)
   - Paste the code above
   - Export as PNG/SVG
3. **For LaTeX**: Use `mermaid` package or convert to images

**Created**: 2025-12-16
