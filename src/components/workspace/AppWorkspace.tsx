import { useState, useEffect } from "react";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceSidebar, type WorkspaceTab } from "./WorkspaceSidebar";
import { WorkspaceDashboard } from "./views/WorkspaceDashboard";
import { ProductLibraryView } from "./views/ProductLibraryView";
import { ImageStudioView } from "./views/ImageStudioView";
import { AugmentationGalleryView } from "./views/AugmentationGalleryView";
import { ProductIntelligenceView } from "./views/ProductIntelligenceView";
import { QualityControlView } from "./views/QualityControlView";
import { DatasetManagerView } from "./views/DatasetManagerView";
import { ModelEvaluationView } from "./views/ModelEvaluationView";
import { WorkflowManagerView } from "./views/WorkflowManagerView";
import { SettingsView } from "./views/SettingsView";
import { api } from "@/lib/api";

interface AppWorkspaceProps {
  onExitWorkspace: () => void;
  initialTab?: WorkspaceTab;
  user?: { name?: string | null; email?: string | null; id?: string } | null;
  onSignOut?: () => void;
}

export function AppWorkspace({
  onExitWorkspace,
  initialTab = "dashboard",
  user,
  onSignOut,
}: AppWorkspaceProps) {
  const [currentTab, setCurrentTab] = useState<WorkspaceTab>(initialTab);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);

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
    <div className="flex h-screen w-full flex-col bg-[#07080c] text-foreground font-sans antialiased overflow-hidden">
      {/* Header bar */}
      <WorkspaceHeader
        currentView={currentTab}
        onNavigateHome={onExitWorkspace}
        onRefresh={fetchPendingReviews}
        user={user}
        onSignOut={onSignOut}
      />

      {/* Main split: Sidebar + Viewport */}
      <div className="flex flex-1 overflow-hidden">
        {/* Persistent Workspace Sidebar */}
        <WorkspaceSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingReviewsCount={pendingReviewsCount}
        />

        {/* Viewport container with scroll */}
        <main className="flex-1 overflow-y-auto bg-[#07080c] relative">
          {currentTab === "dashboard" && (
            <WorkspaceDashboard onNavigateTab={setCurrentTab} />
          )}

          {currentTab === "products" && (
            <ProductLibraryView
              onSelectProductForStudio={(id) => {
                setSelectedProductId(id);
                setCurrentTab("studio");
              }}
              onSelectProductForVlm={(id) => {
                setSelectedProductId(id);
                setCurrentTab("intelligence");
              }}
            />
          )}

          {currentTab === "studio" && (
            <ImageStudioView
              initialProductId={selectedProductId}
              onNavigateGallery={(id) => {
                setSelectedProductId(id);
                setCurrentTab("gallery");
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

          {currentTab === "workflows" && <WorkflowManagerView />}

          {currentTab === "settings" && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
