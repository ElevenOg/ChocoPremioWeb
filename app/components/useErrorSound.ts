"use client";

import { useEffect } from "react";
import { playSound } from "./AudioManager";

export default function useErrorSound(error: string) {
  useEffect(() => { if (error) playSound("error"); }, [error]);
}
