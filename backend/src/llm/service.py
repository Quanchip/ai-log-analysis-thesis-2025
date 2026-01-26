import os
import json
from typing import Dict, List, Optional
import httpx
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    """LLM service with session context for better analysis."""

    def __init__(self, db: Session = None):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.3-70b-versatile"
        self.db = db  # Database session for fetching context

    async def analyze_anomaly_with_context(
        self,
        log_entry: Dict,
        block_id: Optional[str] = None,
        event_id: Optional[str] = None,
        job_id: Optional[str] = None
    ) -> Dict:
        """
        Analyze anomaly with full session context.

        Args:
            log_entry: The anomaly log entry
            block_id: Session identifier
            event_id: Event template ID
            job_id: Job ID to fetch other logs from same session

        Returns:
            {
                "explanation": "...",
                "root_causes": [...],
                "severity": "HIGH|MEDIUM|LOW",
                "recommended_actions": [...],
                "session_size": 10  # How many logs in session
            }
        """

        # Fetch session context if available
        session_context = []
        if block_id and job_id and self.db:
            session_context = await self._fetch_session_context(
                job_id=job_id,
                block_id=block_id
            )

        # Build prompt with context
        prompt = self._build_prompt_with_context(
            log_entry=log_entry,
            block_id=block_id,
            event_id=event_id,
            session_context=session_context
        )

        # Call Groq API
        try:
            request_payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert in HDFS log analysis and anomaly detection. IMPORTANT: You must respond with valid JSON only, no markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 1500,
            }

            print(f"[LLM] Calling Groq API with model: {self.model}")

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_payload
                )

                if response.status_code != 200:
                    error_detail = response.text
                    print(f"[LLM] Groq API error {response.status_code}: {error_detail}")
                    return self._fallback_response()

                result = response.json()

                # Parse response
                llm_output = result["choices"][0]["message"]["content"]
                print(f"[LLM] Response received: {llm_output[:200]}...")

                # Try to parse as JSON
                try:
                    analysis = json.loads(llm_output)
                except json.JSONDecodeError:
                    print(f"[LLM] Response not valid JSON, trying to extract...")
                    # Try to extract JSON from markdown code blocks
                    import re
                    json_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', llm_output, re.DOTALL)
                    if json_match:
                        analysis = json.loads(json_match.group(1))
                    else:
                        print(f"[LLM] Failed to parse: {llm_output}")
                        return self._fallback_response()

                # Add session size to response
                analysis["session_size"] = len(session_context)

                return analysis

        except httpx.HTTPError as e:
            print(f"[LLM] HTTP Error: {e}")
            return self._fallback_response()
        except Exception as e:
            print(f"[LLM] Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            return self._fallback_response()

    async def _fetch_session_context(
        self,
        job_id: str,
        block_id: str
    ) -> List[Dict]:
        """
        Fetch all logs in the same session (same BlockId).

        NOTE: BlockId is extracted from the Content field using regex,
        not from a separate BlockId column. This matches how loglizer
        groups logs into sessions.

        Args:
            job_id: The processing job ID
            block_id: The session identifier (e.g., blk_-1608999687919862906)

        Returns:
            List of log entries in chronological order
        """
        from ..jobs.models import ProcessingJob
        from ..storage.minio_client import minio_client
        import pandas as pd
        import io
        import re
        from collections import OrderedDict

        try:
            # Get job and CSV file path
            job = self.db.query(ProcessingJob).filter(
                ProcessingJob.id == job_id
            ).first()

            if not job or not job.result_file_path:
                print(f"[LLM] No job or result_file_path found for job_id: {job_id}")
                return []

            print(f"[LLM] Fetching session context from: {job.result_file_path}")

            # Download CSV from MinIO
            csv_data = minio_client.get_object(
                bucket_name="processed-logs",
                object_name=job.result_file_path
            )

            # Read CSV into DataFrame
            csv_bytes = csv_data.read()
            df = pd.read_csv(io.BytesIO(csv_bytes))

            print(f"[LLM] Loaded CSV with {len(df)} rows, columns: {list(df.columns)}")

            # Build session mapping by extracting BlockId from Content
            # This matches exactly how loglizer groups logs into sessions
            data_dict = OrderedDict()

            for idx, row in df.iterrows():
                # Extract BlockIds from content using same regex as loglizer
                content = str(row.get('Content', ''))
                blkId_list = re.findall(r'(blk_-?\d+)', content)
                blkId_set = set(blkId_list)

                for blk_Id in blkId_set:
                    if blk_Id not in data_dict:
                        data_dict[blk_Id] = []
                    data_dict[blk_Id].append(idx)  # Store row indices

            print(f"[LLM] Found {len(data_dict)} unique sessions")

            # Check if requested block_id exists
            if block_id not in data_dict:
                print(f"[LLM] Session {block_id} not found in data")
                # Try partial match
                matching_blocks = [b for b in data_dict.keys() if block_id in b or b in block_id]
                if matching_blocks:
                    print(f"[LLM] Similar blocks found: {matching_blocks[:5]}")
                return []

            # Get all logs in this session
            log_indices = data_dict[block_id]
            session_logs = df.iloc[log_indices]

            # Sort by LineId if available
            if 'LineId' in session_logs.columns:
                session_logs = session_logs.sort_values('LineId')

            # Convert to list of dicts (limit to 30 for context - enough for good analysis)
            context = session_logs.head(30).to_dict('records')

            print(f"[LLM] Retrieved {len(context)} logs for session {block_id}")

            return context

        except Exception as e:
            print(f"[LLM] Error fetching session context: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _build_prompt_with_context(
        self,
        log_entry: Dict,
        block_id: Optional[str],
        event_id: Optional[str],
        session_context: List[Dict]
    ) -> str:
        """Build enhanced prompt with session context."""

        # Build basic session info
        session_info = f"Block ID: {block_id}" if block_id else "Unknown session"

        prompt = f"""You are analyzing an HDFS (Hadoop Distributed File System) log session that was flagged as ANOMALOUS by our ML model.

HDFS BACKGROUND:
- HDFS manages data blocks across a distributed cluster
- Each block (blk_*) represents a unit of data being stored/transferred
- Normal operations include: block allocation, replication, packet transfers, block reports
- Anomalies often indicate: replication failures, network issues, disk problems, or configuration errors

SESSION INFORMATION:
- {session_info}
"""

        # Add session context if available
        if session_context and len(session_context) > 0:
            prompt += f"""
FULL SESSION LOGS ({len(session_context)} log entries in chronological order):
These logs show the complete sequence of events for this block operation:

"""
            for idx, log in enumerate(session_context, 1):
                content = log.get('Content', 'N/A')
                level = log.get('Level', 'INFO')
                date = log.get('Date', '')
                time = log.get('Time', '')
                timestamp = f"{date} {time}".strip() or "N/A"

                # Show full content for better analysis
                prompt += f"{idx}. [{timestamp}] [{level}] {content}\n"

            prompt += """

ANALYSIS TASK:
Based on the ENTIRE session above, analyze why this session is anomalous.
Look at the sequence of events to understand what went wrong.
"""
        else:
            # No session context available - use the single log entry
            prompt += f"""
SINGLE LOG ENTRY (no session context available):
- Timestamp: {log_entry.get('Date', 'N/A')} {log_entry.get('Time', 'N/A')}
- Level: {log_entry.get('Level', 'N/A')}
- Content: {log_entry.get('Content', 'N/A')}
- Event ID: {event_id or 'N/A'}

NOTE: Session context could not be retrieved. Analyze based on this single log entry.
"""

        prompt += """
Provide your analysis in JSON format (no markdown, just raw JSON):
{
  "explanation": "3-4 sentences explaining why this session/log is anomalous. Describe what went wrong based on the log sequence.",
  "root_causes": ["- Primary cause description", "- Secondary cause description", "- Contributing factor description"],
  "severity": "HIGH or MEDIUM or LOW",
  "recommended_actions": ["- Specific action 1", "- Specific action 2", "- Specific action 3"]
}

IMPORTANT: Each item in root_causes and recommended_actions MUST start with "- " (dash followed by space).

SEVERITY GUIDELINES:
- HIGH: Data loss risk, block corruption, replication failures, or service unavailability
- MEDIUM: Performance issues, delayed operations, or recoverable errors
- LOW: Minor issues, warnings that don't affect data integrity

Be specific and technical in your analysis. Reference actual content from the logs when explaining causes.
"""

        return prompt

    def _fallback_response(self) -> Dict:
        """Fallback response if LLM fails."""
        return {
            "explanation": "Unable to analyze this log entry. The LLM service encountered an error.",
            "root_causes": ["Service temporarily unavailable"],
            "severity": "UNKNOWN",
            "recommended_actions": ["Please try again later"],
            "session_size": 0
        }


# Singleton with DB support
def get_llm_service(db: Session) -> LLMService:
    """Get LLM service instance with database access."""
    return LLMService(db=db)


