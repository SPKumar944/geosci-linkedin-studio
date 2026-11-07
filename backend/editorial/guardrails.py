import re
from typing import Dict, Any, List, Tuple

BANNED_TOKENS = [
    "delve", "tapestry", "unleash", "unlock", "game-changer",
    "revolutionizing", "in today's fast-paced world", "dive deep",
    "let's explore", "it's important to remember", "testament to",
    "beacon", "synergy", "paradigm shift", "in conclusion",
    "moreover", "furthermore"
]

FORBIDDEN_EMOJIS = ["🚀", "🔥", "🤯", "💡", "✨", "🎯", "🌟", "💪", "🎉", "👏"]

def audit_editorial_content(text: str, tone_preset: str = "Principal Data Scientist") -> Dict[str, Any]:
    """
    Audits the generated editorial copy against strict data science editorial rules:
    - Banned clichés / AI markers
    - Forbidden hype emojis
    - Sentence burstiness (ratio of short declarative to complex analytical sentences)
    - Quantitative metric citation density
    """
    lower_text = text.lower()
    detected_cliches = [token for token in BANNED_TOKENS if token in lower_text]

    detected_emojis = [e for e in FORBIDDEN_EMOJIS if e in text]

    # Total emoji count
    total_emojis = len(re.findall(r'[\U00010000-\U0010ffff]', text))
    if tone_preset == "Pure Scientific / Peer Review" and total_emojis > 0:
        emoji_violations = True
    elif total_emojis > 2 or len(detected_emojis) > 0:
        emoji_violations = True
    else:
        emoji_violations = False

    # Extract quantitative citations (numbers with units or decimals or percentages)
    metric_matches = re.findall(r'[-+]?\b\d+\.?\d*\s*(?:mm/yr|%|sq km|km²|m|dB|NDVI|z\s*=|I\s*=|p\s*<|p\s*=|IQR)\b', text, re.IGNORECASE)
    standalone_numbers = re.findall(r'[-+]?\b\d+\.\d+\b', text)
    total_metrics_cited = len(set(metric_matches + standalone_numbers))

    # Sentence burstiness calculation
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 0]
    word_counts = [len(s.split()) for s in sentences]
    short_declarative = sum(1 for w in word_counts if 6 <= w <= 14)
    complex_analytical = sum(1 for w in word_counts if 20 <= w <= 42)
    burstiness_score = round((short_declarative + complex_analytical) / max(len(sentences), 1) * 100, 1)

    is_compliant = (
        len(detected_cliches) == 0 and
        not emoji_violations and
        total_metrics_cited >= 6
    )

    return {
        "is_compliant": is_compliant,
        "metrics_cited_count": total_metrics_cited,
        "banned_tokens_detected": detected_cliches,
        "cliche_count": len(detected_cliches),
        "forbidden_emojis_detected": detected_emojis,
        "total_emojis": total_emojis,
        "burstiness_score_pct": burstiness_score,
        "sentence_count": len(sentences),
        "audit_summary": (
            f"{total_metrics_cited} empirical metrics cited | "
            f"{len(detected_cliches)} AI clichés detected | "
            f"Burstiness index: {burstiness_score}%"
        )
    }

def sanitize_and_enforce_guardrails(text: str) -> str:
    """
    Strips any banned words or hype phrases from text deterministically.
    """
    clean_text = text
    for phrase in BANNED_TOKENS:
        clean_text = re.sub(re.escape(phrase), "", clean_text, flags=re.IGNORECASE)

    for emoji in FORBIDDEN_EMOJIS:
        clean_text = clean_text.replace(emoji, "")

    # Clean double spaces
    clean_text = re.sub(r'  +', ' ', clean_text)
    return clean_text.strip()
