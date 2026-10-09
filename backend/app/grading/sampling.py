"""Spot checks: a reproducible random share of graded answers sent to the teacher anyway."""

import random
from uuid import UUID


def spot_check(run_id: UUID, question_id: UUID, rate: float) -> bool:
    if rate <= 0:
        return False
    return random.Random(f"{run_id}:{question_id}").random() < rate
