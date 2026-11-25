import { useState, useEffect } from "react";
import { WorkspaceNavbar, type WorkspaceTab } from "@/components/layout/WorkspaceNavbar";
import { SettingsDialog } from "./SettingsDialog";
import { ProductLibraryView } from "./views/ProductLibraryView";
import { ImageStudioView } from "./views/ImageStudioView";
import { AugmentationGalleryView } from "./views/AugmentationGalleryView";
import { ProductIntelligenceView } from "./views/ProductIntelligenceView";
import { QualityControlView } from "./views/QualityControlView";
import { DatasetManagerView } from "./views/DatasetManagerView";
import { ModelEvaluationView } from "./views/ModelEvaluationView";
import { api } from "@/lib/api";

interface AppWorkspaceProps {
  onExitWorkspace: () => void;
  initialTab?: WorkspaceTab;
  user?: { name?: string | null; email?: string | null; id?: string } | null;
  onSignOut?: () => void;
}

export function AppWorkspace({
  onExitWorkspace,
  initialTab = "products",
  user,
  onSignOut,
}: AppWorkspaceProps) {
  const [currentTab, setCurrentTab] = useState<WorkspaceTab>(initialTab);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync currentTab when initialTab or hash changes
  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  const handleSelectTab = (tab: WorkspaceTab) => {
    setCurrentTab(tab);
    window.location.hash = `#${tab}`;
  };

  const fetchPendingReviews = async () => {
    try {
      const res = await api.getQualityQueue();
      setPendingReviewsCount(res.queue ? res.queue.length : 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void fetchPendingReviews();
    const interval = setInterval(fetchPendingReviews, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#07080c] text-foreground font-sans antialiased">
      {/* Top Navigation Bar - Exact same style and language as Landing Page Navbar */}
      <WorkspaceNavbar
        activeTab={currentTab}
        onSelectTab={handleSelectTab}
        pendingReviewsCount={pendingReviewsCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExitWorkspace={onExitWorkspace}
        user={user}
        onSignOut={onSignOut}
      />

      {/* Settings Modal Dialog - Everything related to setting in this setting icon */}
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        user={user}
        onSignOut={onSignOut}
      />

      {/* Main Full-Width SPA Viewport (No cramped sidebar) */}
      <main className="flex-1 w-full pt-16 pb-12 overflow-y-auto">
        {currentTab === "products" && (
          <ProductLibraryView
            onSelectProductForStudio={(id) => {
              setSelectedProductId(id);
              handleSelectTab("studio");
            }}
            onSelectProductForVlm={(id) => {
              setSelectedProductId(id);
              handleSelectTab("intelligence");
            }}
          />
        )}

        {currentTab === "studio" && (
          <ImageStudioView
            initialProductId={selectedProductId}
            onNavigateGallery={(id) => {
              setSelectedProductId(id);
              handleSelectTab("gallery");
            }}
          />
        )}

        {currentTab === "gallery" && (
          <AugmentationGalleryView initialProductId={selectedProductId} />
        )}

        {currentTab === "intelligence" && (
          <ProductIntelligenceView initialProductId={selectedProductId} />
        )}

        {currentTab === "quality" && <QualityControlView />}

        {currentTab === "datasets" && <DatasetManagerView />}

        {currentTab === "evaluation" && <ModelEvaluationView />}
      </main>
    </div>
  );
}
