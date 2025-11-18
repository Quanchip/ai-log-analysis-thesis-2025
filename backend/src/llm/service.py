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

        Args:
            job_id: The processing job ID
            block_id: The session identifier

        Returns:
            List of log entries in chronological order
        """
        from ..jobs.models import ProcessingJob
        from ..storage.minio_client import minio_client
        import pandas as pd
        import tempfile

        try:
            # Get job and CSV file path
            job = self.db.query(ProcessingJob).filter(
                ProcessingJob.id == job_id
            ).first()

            if not job or not job.result_file_path:
                return []

            # Download CSV from MinIO
            csv_data = minio_client.get_object(
                bucket_name="processed-logs",
                object_name=job.result_file_path
            )

            # Read CSV
            temp_csv = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix='.csv')
            try:
                for chunk in csv_data.stream(32*1024):
                    temp_csv.write(chunk)
                temp_csv.close()

                df = pd.read_csv(temp_csv.name)

                # Filter for this session
                if 'BlockId' in df.columns:
                    session_logs = df[df['BlockId'] == block_id]

                    # Sort by LineId if available
                    if 'LineId' in session_logs.columns:
                        session_logs = session_logs.sort_values('LineId')

                    # Convert to list of dicts (limit to 20 for context)
                    context = session_logs.head(20).to_dict('records')
                    return context
                else:
                    return []

            finally:
                import os
                if os.path.exists(temp_csv.name):
                    os.unlink(temp_csv.name)

        except Exception as e:
            print(f"Error fetching session context: {e}")
            return []

    def _build_prompt_with_context(
        self,
        log_entry: Dict,
        block_id: Optional[str],
        event_id: Optional[str],
        session_context: List[Dict]
    ) -> str:
        """Build enhanced prompt with session context."""

        prompt = f"""Analyze this HDFS anomaly log entry WITH its session context.

TARGET ANOMALY LOG:
- Timestamp: {log_entry.get('Date', 'N/A')} {log_entry.get('Time', 'N/A')}
- Level: {log_entry.get('Level', 'N/A')}
- Content: {log_entry.get('Content', 'N/A')}
- Event ID: {event_id or 'N/A'}

This specific log was FLAGGED AS ANOMALY by our ML model.
"""

        # Add session context if available
        if session_context and len(session_context) > 0:
            prompt += f"""
SESSION CONTEXT ({len(session_context)} logs in session {block_id}):
Below are OTHER logs in the same session/transaction. Use this to understand the full story:

"""
            for idx, log in enumerate(session_context, 1):
                content = log.get('Content', 'N/A')
                level = log.get('Level', 'INFO')
                # Truncate long content
                if len(content) > 150:
                    content = content[:150] + "..."

                prompt += f"{idx}. [{level}] {content}\n"

            prompt += "\n"

        prompt += """
Provide comprehensive analysis in JSON format:
{
  "explanation": "Explain why this specific log is anomaly, considering the session context if available (3-4 sentences)",
  "root_causes": ["Specific cause 1", "Specific cause 2", "Specific cause 3"],
  "severity": "HIGH or MEDIUM or LOW",
  "recommended_actions": ["Specific action 1", "Specific action 2", "Specific action 3"]
}

Analysis guidelines:
1. If session context is available, explain HOW this log fits into the sequence of events
2. Identify the ROOT CAUSE from the session timeline
3. Provide SPECIFIC actions based on what you see in the logs
4. Consider temporal patterns (what happened before/after)
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