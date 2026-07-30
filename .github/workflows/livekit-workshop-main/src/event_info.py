"""Confirmed facts about Build with AI Sri Lanka 2026.

This is the single source of truth for what the agent is allowed to state. Everything
here comes from the official event site (https://bwai.gdgsrilanka.org/), the published
agenda, and the GDG Sri Lanka announcements. Anything not listed here is not public,
and the agent is instructed to say so rather than guess.

To update the schedule, edit `AGENDA` only. The instructions and the lookup tool read
from it, so nothing else needs to change.
"""

from __future__ import annotations

from dataclasses import dataclass

NAME = "Build with AI Sri Lanka 2026"
DATE = "Saturday, July 25th, 2026"
START_TIME = "9 AM"
VENUE = "Hatch Works, Colombo"
HOST = "GDG Sri Lanka"
PARTNERS = ("Hatch", "BuildrLabs")
WEBSITE = "bwai.gdgsrilanka.org"

# The universities where teams build before bringing projects to the main event.
UNIVERSITIES = ("IIT", "SLIIT", "KDU", "Rajarata University")

INDUSTRY_CATEGORIES = (
    "Health and Wellness",
    "Fintech",
    "Education",
    "Agriculture",
    "Retail and Commerce",
    "Sustainability",
    "Productivity",
    "Developer Tools",
    "Media and Creative",
    "Public Sector and Civic",
)


@dataclass(frozen=True)
class Session:
    start: str
    end: str
    title: str
    speaker: str | None = None
    role: str | None = None

    def spoken(self) -> str:
        """Render one row of the agenda as a sentence a voice agent can read out."""
        line = f"{self.start} to {self.end}, {self.title}"
        if self.speaker:
            line += f", presented by {self.speaker}"
            if self.role:
                line += f", {self.role}"
        return line + "."


@dataclass(frozen=True)
class Track:
    name: str
    summary: str


TRACKS: dict[str, Track] = {
    "developers": Track(
        name="AI for Developers",
        summary=(
            "A fully technical track for people who write code, focused on what holds up "
            "in production rather than slide decks."
        ),
    ),
    "industry": Track(
        name="AI for Industry",
        summary=(
            "Moving AI from hype to bottom line impact, covering return on investment and "
            "real enterprise integrations."
        ),
    ),
}

AGENDA: dict[str, tuple[Session, ...]] = {
    "developers": (
        Session("9 AM", "9:30 AM", "Registration"),
        Session(
            "9:30 AM",
            "10:30 AM",
            "Loop engineering for reliable AI agents",
            "Isuru Alagiyawanna",
            "Head of AI Engineering at Veracity Group",
        ),
        Session(
            "10:30 AM",
            "11:30 AM",
            "Building Optimized Voice Agents with Gemini Live and LiveKit",
            "Suresh Peiris",
            "Co-Founder of Articom and GDG Community Lead",
        ),
        Session(
            "11:30 AM",
            "12:30 PM",
            "Kubernetes Controllers Are Surprisingly Good Models for AI Agents",
            "Isala Piyarisi",
            "Associate Technical Lead at WSO2",
        ),
        Session("12:30 PM", "1:15 PM", "Break"),
        Session(
            "1:15 PM",
            "2:15 PM",
            "The Shrink Ray, Quantizing LLMs on TPU with JAX",
            "Keshan Sodimana",
            "Associate Architect for Machine Learning at the London Stock Exchange Group",
        ),
        Session(
            "2:15 PM",
            "3 PM",
            "Real-Time AI Agents for System Monitoring and Operations",
            "Roy Ian",
            "Principal Data Scientist and Head of Data Science at PickMe",
        ),
    ),
    "industry": (
        Session("9 AM", "9:30 AM", "Registration"),
        Session(
            "9:30 AM",
            "10:15 AM",
            "a talk with the topic still to be announced",
            "Rohan Jayaweera",
            "Chief Growth Officer at Octave",
        ),
        Session(
            "10:15 AM",
            "11 AM",
            "Become the AI Champion at Work",
            "Ammar Ahamed",
            "Head of Growth at Vector Agents and BuildrLabs, and founder of Cocoon Training",
        ),
        Session(
            "11 AM",
            "11:45 AM",
            "Can You Trust Your AI Agent?",
            "Kasun Delgolla",
            "CTO of Surge Global and Calcey Technologies",
        ),
        Session(
            "11:45 AM",
            "12:30 PM",
            "Agentic Commerce, When Bots Become Your Customers",
            "Dulith Herath",
            "Founder and Chairman of Kapruka",
        ),
        Session("12:30 PM", "1:15 PM", "Break"),
        Session(
            "1:15 PM",
            "2 PM",
            "Agentic AI in Telco",
            "Anil Pradeep Kumara",
            "Head of AI and Data at SLTMOBITEL",
        ),
        Session("2 PM", "3 PM", "a panel discussion"),
    ),
}

# How the buildathon works, in the site's own three phases.
FORMAT_PHASES = (
    "Build: teams build at IIT, SLIIT, KDU and Rajarata University, then bring their "
    "project to the main event.",
    "Submit: each team files a project with a demo, repository, stack, and the industry "
    "it targets, and can edit it up to the deadline.",
    "Vote: everyone explores the projects and casts one vote for the build that should "
    "take the top prize.",
)


def resolve_track(track: str) -> str | None:
    """Map a spoken track name onto a key in `TRACKS`, or None if it matches neither."""
    spoken = track.strip().lower()
    if "dev" in spoken or "technical" in spoken or "code" in spoken:
        return "developers"
    if "industr" in spoken or "business" in spoken or "enterprise" in spoken:
        return "industry"
    return None


def _render(key: str) -> str:
    rows = " ".join(session.spoken() for session in AGENDA[key])
    return f"{TRACKS[key].name} track: {rows}"


def agenda_for(track: str) -> str:
    """Return the published schedule, for the agent to answer from.

    An unrecognized or empty track returns both tracks rather than an error, so that
    questions like "when is so and so speaking" can be answered without the user having
    to know which room the talk is in.
    """
    key = resolve_track(track)
    if key is None:
        both = " ".join(_render(k) for k in AGENDA)
        return (
            f"Both tracks run in parallel on {DATE} at {VENUE}. {both} "
            "Answer only from these sessions. If the user asks about a time or a person "
            "not listed here, say it is not on the published agenda."
        )

    return (
        f"{_render(key)} Answer only from these sessions. If the user asks about a time "
        "or a person not listed here, say it is not on the published agenda."
    )
