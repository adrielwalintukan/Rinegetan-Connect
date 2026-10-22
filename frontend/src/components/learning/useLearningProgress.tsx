"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createLearningState, readLearningState, writeLearningState, updateLearningState, type LearningAction } from "@/lib/courses/progress";

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function useLearningProgress() {
  const [state, setState] = useState(createLearningState);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const current = useRef(createLearningState());
  const ephemeral = useRef(false);

  useEffect(() => {
    const stored = readLearningState(browserStorage());
    current.current = stored.state;
    ephemeral.current = !stored.persistent;
    // Hydration synchronizes external storage after SSR, once per mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(stored.state);
    setPersistent(stored.persistent);
    setReady(true);
  }, []);

  const update = useCallback((courseId: string, lessonId: string, action: LearningAction) => {
    const storage = browserStorage();
    const stored = readLearningState(storage);
    // Failed writes leave storage behind our choices; retain the current session snapshot.
    const previous = !ephemeral.current && stored.persistent ? stored.state : current.current;
    const next = updateLearningState(previous, courseId, lessonId, action);
    const saved = writeLearningState(storage, next);
    current.current = next;
    ephemeral.current = !saved;
    setState(next);
    setPersistent(saved);
  }, []);

  return { state, ready, persistent, update };
}
