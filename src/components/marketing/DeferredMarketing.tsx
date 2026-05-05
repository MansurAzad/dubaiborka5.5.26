import { lazy, Suspense, useState, useEffect } from "react";
import { useHomepageSections } from "@/hooks/useHomepageSections";

const ExitIntentPopup = lazy(() => import("@/components/marketing/ExitIntentPopup"));
const FloatingTrustBadge = lazy(() => import("@/components/marketing/FloatingTrustBadge"));
const SocialProofNotification = lazy(() => import("@/components/marketing/SocialProofNotification"));
const RecentlyViewedPopup = lazy(() => import("@/components/marketing/RecentlyViewedPopup"));
const AbandonedCartRecovery = lazy(() => import("@/components/marketing/AbandonedCartRecovery"));
const SpinToWinWheel = lazy(() => import("@/components/marketing/SpinToWinWheel"));
const ZeroAdvancePopup = lazy(() => import("@/components/marketing/ZeroAdvancePopup"));

/**
 * Defers mounting of all marketing widgets until after the main page
 * has rendered and the browser is idle, preventing query storms and
 * jank during initial load.
 */
const DeferredMarketing = () => {
  const [ready, setReady] = useState(false);
  const { data: sections = [] } = useHomepageSections();

  useEffect(() => {
    const id = typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback(() => setReady(true), { timeout: 8000 })
      : setTimeout(() => setReady(true), 4000) as unknown as number;

    return () => {
      if (typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };
  }, []);

  if (!ready) return null;

  const activeKeys = new Set(sections.map(s => s.section_key));
  const isActive = (key: string) => activeKeys.has(key);
  const sectionDataMap = new Map(sections.map((section) => [section.section_key, section]));

  const showExitIntent = isActive("exit_intent_popup");
  const showSpinToWin = isActive("spin_to_win");
  const showZeroAdvance = isActive("zero_advance_popup");

  return (
    <Suspense fallback={null}>
      {showExitIntent && <ExitIntentPopup sectionData={sectionDataMap.get("exit_intent_popup")} />}
      <FloatingTrustBadge />
      <SocialProofNotification />
      <RecentlyViewedPopup />
      <AbandonedCartRecovery />
      {showSpinToWin && <SpinToWinWheel sectionData={sectionDataMap.get("spin_to_win")} />}
      {showZeroAdvance && <ZeroAdvancePopup sectionData={sectionDataMap.get("zero_advance_popup")} />}
    </Suspense>
  );
};

export default DeferredMarketing;
