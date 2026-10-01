"use client";

import { useEffect } from "react";
import { warmStrudelBoot } from "@/lib/strudel-boot";

/** Prebake Strudel on playable surfaces so visitors’ first Play is reliable. */
export function StrudelWarmBoot() {
  useEffect(() => {
    warmStrudelBoot();
  }, []);
  return null;
}
