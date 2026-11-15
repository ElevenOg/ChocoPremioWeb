"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, errorMessage, isAbortError, postJson, requestJson } from "@/lib/client/api";
import type { Campaign, Commerce, DashboardBootstrap, DashboardStats } from "@/lib/dashboard/types";
import { emptyDashboardStats } from "@/lib/dashboard/types";
import { clearDashboardBootstrap, peekDashboardBootstrap } from "@/lib/client/dashboardBootstrap";

const EMPTY_STATS = emptyDashboardStats();
const IDLE_TIMEOUT = 15 * 60 * 1000;

export function useDashboard(initialData?: DashboardBootstrap, initialError = "") {
  const router = useRouter();
  const [bootstrap] = useState(() => initialData ?? peekDashboardBootstrap());
  const [commerce, setCommerce] = useState<Commerce | null>(bootstrap?.commerce ?? null);
  const [campaigns, setCampaigns] = useState<Campaign[]>(bootstrap?.campaigns ?? []);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(bootstrap?.campaignId ?? null);
  const [stats, setStats] = useState({ campaignId: bootstrap?.campaignId ?? null, data: bootstrap?.stats ?? EMPTY_STATS });
  const [initialLoading, setInitialLoading] = useState(!bootstrap);
  const [error, setError] = useState(initialError);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(bootstrap?.updatedAt ?? null);
  const logoutRef = useRef(false);
  const initialStatsCampaign = useRef(bootstrap?.campaignId);

  const logout = useCallback(async (reason?: "idle") => {
    if (logoutRef.current) return;
    logoutRef.current = true;
    setLoggingOut(true);
    clearDashboardBootstrap();
    try {
      await postJson("/api/dashboard/logout", {});
      router.replace(reason === "idle" ? "/dashboard/login?motivo=inactividad" : "/dashboard/login");
      router.refresh();
    } catch (cause) {
      logoutRef.current = false;
      setLoggingOut(false);
      setError(errorMessage(cause));
    }
  }, [router]);

  useEffect(() => {
    clearDashboardBootstrap();
    if ((bootstrap || initialError) && attempt === 0) return;
    const controller = new AbortController();
    requestJson<{ commerce: Commerce; campaigns: Campaign[] }>("/api/dashboard/campaigns", { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setCommerce(data.commerce);
        setCampaigns(data.campaigns);
        setSelectedCampaign((previous) => data.campaigns.some((campaign) => campaign.id === previous) ? previous : data.campaigns.find((campaign) => campaign.active)?.id || data.campaigns[0]?.id || null);
        if (!data.campaigns.length) setInitialLoading(false);
      })
      .catch((cause) => {
        if (isAbortError(cause)) return;
        if (cause instanceof ApiError && cause.status === 401) router.replace("/dashboard/login");
        else setError(errorMessage(cause));
        setInitialLoading(false);
      });
    return () => controller.abort();
  }, [router, attempt, bootstrap, initialError]);

  useEffect(() => {
    if (!selectedCampaign) return;
    if (attempt === 0 && selectedCampaign === initialStatsCampaign.current) return;
    initialStatsCampaign.current = undefined;
    const controller = new AbortController();
    requestJson<DashboardStats>("/api/dashboard/sessions?campaignId=" + encodeURIComponent(selectedCampaign) + "&summary=1", { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setStats({ campaignId: selectedCampaign, data });
        setUpdatedAt(new Date().toISOString());
        setInitialLoading(false);
        setError("");
      })
      .catch((cause) => {
        if (isAbortError(cause)) return;
        if (cause instanceof ApiError && cause.status === 401) router.replace("/dashboard/login");
        else setError(errorMessage(cause));
        setInitialLoading(false);
      });
    return () => controller.abort();
  }, [selectedCampaign, router, attempt, bootstrap]);

  useEffect(() => {
    if (!commerce) return;
    let lastActivity = Date.now();
    const onActivity = () => { lastActivity = Date.now(); };
    const check = () => { if (Date.now() - lastActivity >= IDLE_TIMEOUT) void logout("idle"); };
    const events = ["pointerdown", "keydown", "scroll", "pointermove"];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    const timer = window.setInterval(check, 10000);
    const onVisibility = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [commerce, logout]);

  return {
    commerce, campaigns, selectedCampaign, setSelectedCampaign,
    ...stats.data, hydrated: Boolean(commerce), ready: !initialLoading,
    updating: Boolean(selectedCampaign && stats.campaignId !== selectedCampaign),
    error, loggingOut, logout, updatedAt,
    retry: () => { setError(""); setAttempt((value) => value + 1); },
  };
}
