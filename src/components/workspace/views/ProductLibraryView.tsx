import { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Wand2,
  Sparkles,
  Trash2,
  FileImage,
  Upload,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, type Product } from "@/lib/api";

interface ProductLibraryViewProps {
  onSelectProductForStudio?: (productId: string) => void;
  onSelectProductForVlm?: (productId: string) => void;
}

export function ProductLibraryView({
  onSelectProductForStudio,
  onSelectProductForVlm,
}: ProductLibraryViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewTab, setPreviewTab] = useState<"original" | "mask" | "cutout">("original");

  // New Product Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("Footwear");
  const [formDescription, setFormDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts();
      setProducts(res.products || []);
    } catch (err: any) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setUploadError("Product name is required.");
      return;
    }
    setSubmitting(true);
    setUploadError("");

    try {
      const newProductRes = await api.createProduct({
        name: formName.trim(),
        sku: formSku.trim() || undefined,
        category: formCategory.trim() || undefined,
        description: formDescription.trim() || undefined,
      });

      const productId = newProductRes.product.id;

      if (selectedFile) {
        await api.uploadProductImage(productId, selectedFile);
      }

      setIsUploadOpen(false);
      setFormName("");
      setFormSku("");
      setFormCategory("Footwear");
      setFormDescription("");
      setSelectedFile(null);
      await loadProducts();
    } catch (err: any) {
      setUploadError(err.message || "Failed to create product or upload image.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this product and its variants?")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (selectedProduct?.id === id) setSelectedProduct(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete product.");
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Catalog Products</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your master inventory, isolate subject foregrounds, and view automated alpha masks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProducts}
            disabled={loading}
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsUploadOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-[#0c0e12] p-3 rounded-lg border border-border/60">
        <Search className="h-4 w-4 text-muted-foreground ml-1" />
        <input
          type="text"
          placeholder="Filter by product name, SKU, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden w-full"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-border/40 bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border/60 bg-[#0c0e12]/60">
          <Package className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No Products Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {searchQuery
              ? "No catalog items matched your search query."
              : "Upload your first master catalog item to start running synthetic image augmentations."}
          </p>
          <Button
            onClick={() => setIsUploadOpen(true)}
            size="sm"
            className="mt-4 bg-primary text-primary-foreground text-xs"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add First Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map((p) => {
            const hasImage = p.images && p.images.length > 0;
            const previewUrl = hasImage ? `/api/products/${p.id}/preview` : "/images/commercial.jpg";

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="group relative rounded-xl border border-border/70 bg-[#0c0e12] overflow-hidden hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Image Canvas */}
                <div className="relative aspect-square w-full bg-[#15191f] overflow-hidden flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt={p.name}
                    className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback placeholder
                      (e.target as HTMLImageElement).src = "/images/commercial.jpg";
                    }}
                  />
                  {p.sku && (
                    <div className="absolute top-2.5 left-2.5 rounded bg-[#07080c]/80 border border-border/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {p.sku}
                    </div>
                  )}
                  {p.category && (
                    <div className="absolute top-2.5 right-2.5 rounded bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {p.category}
                    </div>
                  )}
                </div>

                {/* Content Info */}
                <div className="p-4 flex flex-col gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {p.description || "Master product catalog asset"}
                    </p>
                  </div>

                  {/* Badges / Stats */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <FileImage className="h-3 w-3 text-muted-foreground" />
                      {p.images?.length || 0} Assets
                    </span>
                    <span className="flex items-center gap-1 font-mono text-primary">
                      <Wand2 className="h-3 w-3 text-primary" />
                      {p.jobs?.reduce((acc, j) => acc + (j.results?.length || 0), 0) || 0} Variants
                    </span>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProductForStudio?.(p.id);
                      }}
                      className="text-[10px] h-7 px-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <Wand2 className="mr-1 h-3 w-3" />
                      Studio
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProductForVlm?.(p.id);
                      }}
                      className="text-[10px] h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      VLM
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Product Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md bg-[#0e1115] border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Ingest Master Catalog Product</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide product details and upload a photo to generate instant foreground alpha masks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-4 mt-2">
            {uploadError && (
              <div className="p-2.5 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                {uploadError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="p-name" className="text-xs font-medium">
                Product Name *
              </Label>
              <Input
                id="p-name"
                placeholder="e.g. AeroStride Pro Carbon"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs bg-[#14171d] border-border/80"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-sku" className="text-xs font-medium">
                  SKU Identifier
                </Label>
                <Input
                  id="p-sku"
                  placeholder="e.g. SHOE-RUN-001"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="text-xs bg-[#14171d] border-border/80 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-cat" className="text-xs font-medium">
                  Category
                </Label>
                <Input
                  id="p-cat"
                  placeholder="e.g. Footwear"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="text-xs bg-[#14171d] border-border/80"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc" className="text-xs font-medium">
                Description
              </Label>
              <Input
                id="p-desc"
                placeholder="Lightweight carbon-plate performance running shoe"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs bg-[#14171d] border-border/80"
              />
            </div>

            {/* File Upload Dropzone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Master Product Image</Label>
              <div className="relative border-2 border-dashed border-border/70 rounded-lg p-4 text-center hover:border-primary/50 transition-colors bg-[#14171d]/50">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs text-foreground font-medium">
                  {selectedFile ? selectedFile.name : "Click or drag image here"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  PNG, JPG, or WEBP (Max 15MB)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsUploadOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary text-primary-foreground text-xs"
              >
                {submitting ? "Processing..." : "Create & Ingest"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="sm:max-w-2xl bg-[#0e1115] border-border text-foreground">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold">{selectedProduct.name}</DialogTitle>
                  <DialogDescription className="text-xs font-mono text-primary">
                    SKU: {selectedProduct.sku || "N/A"} · {selectedProduct.category || "General"}
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteProduct(selectedProduct.id, e)}
                  className="text-destructive hover:bg-destructive/10 text-xs h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Preview Tabs */}
              <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-xs">
                <button
                  onClick={() => setPreviewTab("original")}
                  className={`px-3 py-1 rounded cursor-pointer ${
                    previewTab === "original"
                      ? "bg-primary/20 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Master Image
                </button>
                <button
                  onClick={() => setPreviewTab("mask")}
                  className={`px-3 py-1 rounded cursor-pointer ${
                    previewTab === "mask"
                      ? "bg-primary/20 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Segmentation Mask
                </button>
                <button
                  onClick={() => setPreviewTab("cutout")}
                  className={`px-3 py-1 rounded cursor-pointer ${
                    previewTab === "cutout"
                      ? "bg-primary/20 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Transparent Cutout
                </button>
              </div>

              {/* Preview Canvas */}
              <div className="relative aspect-video w-full rounded-lg bg-[#14171d] flex items-center justify-center overflow-hidden border border-border/60">
                <img
                  src={
                    previewTab === "mask"
                      ? `/api/products/${selectedProduct.id}/mask`
                      : `/api/products/${selectedProduct.id}/preview`
                  }
                  alt={selectedProduct.name}
                  className="h-full w-full object-contain p-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/images/commercial.jpg";
                  }}
                />
              </div>

              {/* Details & Actions */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground max-w-sm">
                  {selectedProduct.description || "No description provided."}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      onSelectProductForStudio?.(selectedProduct.id);
                      setSelectedProduct(null);
                    }}
                    size="sm"
                    className="bg-primary text-primary-foreground text-xs"
                  >
                    <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                    Open in Studio
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSelectProductForVlm?.(selectedProduct.id);
                      setSelectedProduct(null);
                    }}
                    size="sm"
                    className="text-xs"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Run VLM
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
