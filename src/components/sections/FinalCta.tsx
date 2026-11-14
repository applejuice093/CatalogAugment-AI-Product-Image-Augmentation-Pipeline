import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useAuthUi } from "@/components/auth/AuthProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LightningGlowText } from "@/components/effects/LightningGlowText";

type UploadItem = {
  id: string;
  originalName: string;
  bytes: number;
};

export function FinalCta() {
  const { data } = authClient.useSession();
  const { openSignUp } = useAuthUi();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!data?.user) return;
    let ignore = false;
    void fetch("/api/uploads")
      .then((response) => response.json())
      .then((body: { items?: UploadItem[] }) => {
        if (!ignore) setItems(body.items ?? []);
      })
      .catch(() => {
        if (!ignore) setMessage("Could not load saved files.");
      });
    return () => {
      ignore = true;
    };
  }, [data?.user]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setMessage("");
    setUploading(true);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body });
      const payload = (await response.json()) as { error?: string; originalName?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Upload failed.");
        return;
      }
      form.reset();
      setMessage(`Saved ${payload.originalName ?? "image"} on disk.`);
      const list = await fetch("/api/uploads");
      const next = (await list.json()) as { items?: UploadItem[] };
      setItems(next.items ?? []);
    } catch {
      setMessage("Network error during upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section id="start" data-scene="start" className="relative z-10 bg-background px-5 py-32">
      <div className="mx-auto max-w-4xl text-center">
        <LightningGlowText
          as="h2"
          className="section-title"
          speed={0.9}
          size={1.2}
          particleAmount={1.1}
          hue={-55}
          brightness={1.25}
          opacity={0.85}
        >
          Build better visual-search experiences.
        </LightningGlowText>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Start with a single product image. Create a dataset designed for the real world.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={data?.user ? "#workspace" : "#login?redirect=workspace"}
            className={cn(
              buttonVariants(),
              "h-11 px-5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_rgba(214,227,106,0.25)]",
            )}
          >
            <span className="section-button__title relative z-10 inline-flex items-center gap-2">
              Enter Studio Workspace
            </span>
            <span className="section-button__circle" aria-hidden="true" />
          </a>
          {data?.user ? null : (
            <Button variant="outline" className="h-11 px-5 cursor-pointer" onClick={() => openSignUp("workspace")}>
              Sign Up
            </Button>
          )}
          <a href="#workflow" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
            <span className="section-button__title relative z-10 inline-flex items-center gap-2">Explore Platform</span>
            <span className="section-button__circle" aria-hidden="true" />
          </a>
        </div>
        {data?.user ? (
          <form className="mx-auto mt-12 max-w-md space-y-3 text-left" onSubmit={onUpload}>
            <Label htmlFor="product-file">Upload a product image</Label>
            <Input
              id="product-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              required
              className="h-11"
            />
            <Button type="submit" disabled={uploading} className="h-11 cursor-pointer">
              {uploading ? "Saving on disk…" : "Save to filesystem"}
            </Button>
            {message ? <p className="text-sm text-primary">{message}</p> : null}
            {items.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {items.map((item) => (
                  <li key={item.id}>
                    <a className="hover:text-foreground" href={`/api/uploads/${item.id}`}>
                      {item.originalName}
                    </a>
                    <span> · {Math.ceil(item.bytes / 1024)} KB</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing saved for this account yet. Saving a file does not run augmentation.</p>
            )}
          </form>
        ) : null}
      </div>
    </section>
  );
}
