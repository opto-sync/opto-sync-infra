#!/usr/bin/env python3
from dataclasses import dataclass
from collections import deque

NONE = -1

@dataclass(frozen=True)
class State:
    writer: int = NONE
    healthy0: bool = True
    healthy1: bool = True
    durable_checkpoint: int = 0
    active_checkpoint: int = 0
    epoch: int = 0


def healthy(s: State, region: int) -> bool:
    return s.healthy0 if region == 0 else s.healthy1


def next_states(s: State):
    out = []
    if s.writer == NONE:
        for r in (0, 1):
            if healthy(s, r):
                out.append(State(r, s.healthy0, s.healthy1, s.durable_checkpoint, s.durable_checkpoint, s.epoch + 1))
    else:
        if s.active_checkpoint < 2:
            out.append(State(s.writer, s.healthy0, s.healthy1, s.durable_checkpoint, s.active_checkpoint + 1, s.epoch))
        if s.durable_checkpoint < s.active_checkpoint:
            out.append(State(s.writer, s.healthy0, s.healthy1, s.active_checkpoint, s.active_checkpoint, s.epoch))
        if s.writer == 0:
            out.append(State(NONE, False, s.healthy1, s.durable_checkpoint, s.durable_checkpoint, s.epoch))
        else:
            out.append(State(NONE, s.healthy0, False, s.durable_checkpoint, s.durable_checkpoint, s.epoch))
        out.append(State(NONE, s.healthy0, s.healthy1, s.durable_checkpoint, s.durable_checkpoint, s.epoch))
    if not s.healthy0:
        out.append(State(s.writer, True, s.healthy1, s.durable_checkpoint, s.active_checkpoint, s.epoch))
    if not s.healthy1:
        out.append(State(s.writer, s.healthy0, True, s.durable_checkpoint, s.active_checkpoint, s.epoch))
    return out


def check(a: State, b: State | None = None):
    assert a.durable_checkpoint <= a.active_checkpoint, "active checkpoint fell behind durable state"
    if a.writer == NONE:
        assert a.active_checkpoint == a.durable_checkpoint, "writerless state retained unpersisted progress"
    else:
        assert healthy(a, a.writer), "writer assigned to unhealthy region"
    if b is not None:
        assert b.durable_checkpoint >= a.durable_checkpoint, "durable checkpoint regressed"
        assert b.epoch >= a.epoch, "writer epoch regressed"
        if a.writer == NONE and b.writer != NONE:
            assert b.active_checkpoint == a.durable_checkpoint, "promotion did not resume from persisted checkpoint"
            assert b.epoch == a.epoch + 1, "promotion did not advance writer epoch"


def main():
    start = State(); q = deque([start]); seen = {start}; edges = 0
    while q:
        s = q.popleft(); check(s)
        for n in next_states(s):
            edges += 1; check(n); check(s, n)
            if n not in seen:
                seen.add(n); q.append(n)
    assert any(s.epoch >= 2 for s in seen), "failover path was not explored"
    print(f"writer failover model: {len(seen)} states, {edges} transitions")

if __name__ == "__main__":
    main()
