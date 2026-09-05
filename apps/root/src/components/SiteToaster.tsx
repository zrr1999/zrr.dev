import { Toaster } from "sonner";
import "sonner/dist/styles.css";

export default function SiteToaster() {
  return (
    <Toaster
      position="bottom-center"
      theme="system"
      duration={2000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "mono flex w-full items-center gap-2 border border-(--card-border) bg-(--bg) px-4 py-3 text-xs leading-relaxed text-(--fg) shadow-sm",
        },
      }}
    />
  );
}
